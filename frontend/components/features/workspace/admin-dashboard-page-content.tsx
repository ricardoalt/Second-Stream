"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardSection, KpiGrid } from "@/components/ui/dashboard-section";
import { DataTable, SectionDivider } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressCard } from "@/components/ui/progress-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAvatarColorForName, TeamAvatar } from "@/components/ui/team-avatar";
import { dashboardAPI } from "@/lib/api/dashboard";
import type { OfferPipelineResponseDTO } from "@/lib/api/offers";
import { offersAPI } from "@/lib/api/offers";
import { routes } from "@/lib/routes";
import type {
	DashboardListResponse,
	PersistedStreamRow,
} from "@/lib/types/dashboard";
import {
	buildSupervisionQueue,
	groupStreamsByOwner,
} from "./admin-dashboard-data";

type AdminDashboardPageContentProps = {
	className?: string;
};

const DASHBOARD_PAGE_SIZE = 100;

const EMPTY_DASHBOARD: DashboardListResponse = {
	bucket: "total",
	counts: {
		total: 0,
		needsConfirmation: 0,
		missingInformation: 0,
		intelligenceReport: 0,
		proposal: 0,
	},
	items: [],
	secondaryDraftRows: [],
	total: 0,
	page: 1,
	size: DASHBOARD_PAGE_SIZE,
	pages: 1,
	draftPreview: null,
};

const EMPTY_PIPELINE: OfferPipelineResponseDTO = {
	counts: {
		total: 0,
		uploaded: 0,
		waitingToSend: 0,
		waitingResponse: 0,
		underNegotiation: 0,
	},
	items: [],
};

function queueReasonLabel(reason: string): string {
	if (reason === "pending_confirmation") return "Pending COA";
	if (reason === "missing_required_info") return "Missing SDS";
	if (reason === "stale_waiting_response") return "Offer Stalled";
	if (reason === "stale_under_negotiation") return "In Negotiation";
	return "On Track";
}

function streamStageLabel(stream: PersistedStreamRow): string {
	if (stream.proposalFollowUpState === "under_negotiation")
		return "In Negotiation";
	if (stream.proposalFollowUpState === "waiting_response") return "Review";
	if (stream.proposalFollowUpState === "waiting_to_send") return "Proposal";
	if (stream.proposalFollowUpState === "uploaded") return "Intake";
	if (stream.missingRequiredInfo) return "Missing info";
	if (stream.pendingConfirmation) return "Confirmation";
	return "In progress";
}

function streamProgressValue(stream: PersistedStreamRow): number {
	if (stream.proposalFollowUpState === "under_negotiation") return 45;
	if (stream.proposalFollowUpState === "waiting_response") return 65;
	if (stream.proposalFollowUpState === "waiting_to_send") return 40;
	if (stream.proposalFollowUpState === "uploaded") return 30;
	if (stream.missingRequiredInfo) return 25;
	if (stream.pendingConfirmation) return 20;
	return 55;
}

function groupRiskCount(streams: PersistedStreamRow[]): number {
	return streams.filter((stream) => stream.queuePriority !== "normal").length;
}

const QUEUE_PRIORITY_ORDER: Record<string, number> = {
	critical: 0,
	high: 1,
	normal: 2,
};

function groupPrimaryStream(
	streams: PersistedStreamRow[],
): PersistedStreamRow | null {
	if (streams.length === 0) return null;

	// Sort by priority (critical > high > normal), then by most recent activity
	const sorted = [...streams].sort((left, right) => {
		const priorityDiff =
			QUEUE_PRIORITY_ORDER[left.queuePriority] -
			QUEUE_PRIORITY_ORDER[right.queuePriority];
		if (priorityDiff !== 0) return priorityDiff;
		return Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt);
	});

	return sorted[0];
}

function formatPipelineValue(items: OfferPipelineResponseDTO["items"]): string {
	const total = items.reduce((sum, item) => sum + (item.valueUsd ?? 0), 0);
	if (total >= 1_000_000) {
		return `$${(total / 1_000_000).toFixed(1)}M`;
	}
	return `$${total.toLocaleString()}`;
}

function getDaysSince(dateString: string): number {
	const date = new Date(dateString);
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - date.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get badge variant based on queue priority
function getBadgeVariantForPriority(
	priority: PersistedStreamRow["queuePriority"],
): "critical" | "warning" | "success" {
	if (priority === "critical") return "critical";
	if (priority === "high") return "warning";
	return "success";
}

export function AdminDashboardPageContent({
	className,
}: AdminDashboardPageContentProps) {
	const [dashboard, setDashboard] =
		useState<DashboardListResponse>(EMPTY_DASHBOARD);
	const [pipeline, setPipeline] =
		useState<OfferPipelineResponseDTO>(EMPTY_PIPELINE);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const [dashboardResult, pipelineResult] = await Promise.allSettled([
					dashboardAPI.getDashboard({
						bucket: "total",
						size: DASHBOARD_PAGE_SIZE,
						signal: controller.signal,
					}),
					offersAPI.getPipeline(),
				]);

				if (dashboardResult.status === "fulfilled") {
					setDashboard(dashboardResult.value);
				} else if (!controller.signal.aborted) {
					setError("Unable to load admin dashboard data.");
				}

				if (pipelineResult.status === "fulfilled") {
					setPipeline(pipelineResult.value);
				}
			} catch {
				if (!controller.signal.aborted) {
					setError("Unable to load admin dashboard data.");
				}
			} finally {
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			}
		}
		void load();
		return () => controller.abort();
	}, []);

	const persistedRows = useMemo(
		() =>
			dashboard.items.filter(
				(item): item is PersistedStreamRow => item.kind === "persisted_stream",
			),
		[dashboard.items],
	);
	const teamGroups = useMemo(
		() => groupStreamsByOwner(dashboard.items),
		[dashboard.items],
	);
	const queueRows = useMemo(
		() =>
			buildSupervisionQueue(persistedRows, 5).filter(
				(row) => row.queuePriority !== "normal",
			),
		[persistedRows],
	);
	const pipelineValue = useMemo(
		() => formatPipelineValue(pipeline.items),
		[pipeline.items],
	);

	// Render expanded stream content
	const renderExpandedStreams = (
		group: ReturnType<typeof groupStreamsByOwner>[number],
	) => {
		return (
			<>
				<SectionDivider label="Active waste streams" />
				<div className="space-y-2">
					{group.streams.slice(0, 3).map((stream) => (
						<Link
							key={stream.projectId}
							href={routes.streams.detail(stream.projectId)}
							className="block"
						>
							<ProgressCard
								title={stream.streamName}
								subtitle={
									stream.companyLabel ||
									stream.locationLabel ||
									"Client unavailable"
								}
								date={new Date(stream.lastActivityAt).toLocaleDateString(
									"en-US",
									{
										month: "short",
										day: "numeric",
										year: "numeric",
									},
								)}
								daysOld={getDaysSince(stream.lastActivityAt)}
								progress={streamProgressValue(stream)}
								stage={streamStageLabel(stream)}
								statusVariant={
									stream.queuePriority === "critical"
										? "critical"
										: stream.queuePriority === "high"
											? "warning"
											: "info"
								}
								statusLabel={queueReasonLabel(stream.queuePriorityReason)}
							/>
						</Link>
					))}
				</div>
			</>
		);
	};

	return (
		<div className={`space-y-10 ${className || ""}`}>
			{/* Error State */}
			{error ? (
				<Card className="border-border/60 shadow-none">
					<CardContent className="pt-6 text-sm text-destructive">
						{error}
					</CardContent>
				</Card>
			) : null}

			{/* Stream Lifecycle Summary - Using Design System */}
			<DashboardSection
				title="Stream Lifecycle Summary"
				badge={{ text: "Live Flow Tracking", variant: "live" }}
				variant="highlighted"
			>
				<KpiGrid>
					<KpiCard
						type="streams"
						label="Total Streams"
						value={dashboard.counts.total}
						loading={loading}
					/>
					<KpiCard
						type="missing"
						label="Missing Information"
						value={dashboard.counts.missingInformation}
						loading={loading}
					/>
					<KpiCard
						type="offers"
						label="Offers"
						value={pipeline.counts.underNegotiation}
						loading={loading}
					/>
					<KpiCard
						type="revenue"
						label="Pipeline Value"
						value={pipelineValue}
						loading={loading}
					/>
				</KpiGrid>
			</DashboardSection>

			{/* Team Performance - Using Design System */}
			<DashboardSection
				title="Team Performance"
				action={
					<Button
						asChild
						variant="ghost"
						size="sm"
						className="h-auto px-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
					>
						<Link href={routes.streams.all}>
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				}
			>
				<DataTable
					data={teamGroups.slice(0, 6)}
					keyExtractor={(group) => group.ownerUserId}
					columns={[
						{
							key: "agent",
							header: "Agent Name",
							width: "2fr",
							cell: (group) => {
								const name = group.ownerLabel;
								const color = getAvatarColorForName(name);

								return (
									<div className="flex min-w-0 items-center gap-3">
										<TeamAvatar name={name} color={color} />
										<div className="min-w-0">
											<p className="truncate font-medium text-foreground">
												{name}
											</p>
										</div>
									</div>
								);
							},
						},
						{
							key: "streams",
							header: "Total Streams",
							width: "1fr",
							cell: (group) => (
								<span className="text-sm text-foreground">
									{group.streams.length} Streams
								</span>
							),
						},
						{
							key: "actions",
							header: "Critical Actions",
							width: "1.5fr",
							cell: (group) => {
								const primary = groupPrimaryStream(group.streams);
								const riskCount = groupRiskCount(group.streams);

								if (riskCount > 0 && primary) {
									const days = primary.lastActivityAt
										? getDaysSince(primary.lastActivityAt)
										: 0;
									const badgeVariant = getBadgeVariantForPriority(
										primary.queuePriority,
									);

									return (
										<StatusBadge
											variant={badgeVariant}
											days={days > 0 ? Math.min(days, 28) : undefined}
										>
											{queueReasonLabel(primary.queuePriorityReason)}
										</StatusBadge>
									);
								}

								return <StatusBadge variant="success">On Track</StatusBadge>;
							},
						},
						{
							key: "action",
							header: "Action",
							width: "1fr",
							cell: (group) => {
								const primary = groupPrimaryStream(group.streams);
								const riskCount = groupRiskCount(group.streams);

								if (riskCount > 0 && primary) {
									return (
										<Button
											asChild
											variant="ghost"
											size="sm"
											className="h-auto px-0 text-sm text-destructive hover:bg-transparent hover:text-destructive"
										>
											<Link href={routes.streams.detail(primary.projectId)}>
												View Priority Stream
											</Link>
										</Button>
									);
								}

								return (
									<Button
										asChild
										variant="ghost"
										size="sm"
										className="h-auto px-0 text-sm text-cyan-600 hover:bg-transparent hover:text-foreground"
									>
										<Link href={routes.streams.all}>View All</Link>
									</Button>
								);
							},
						},
					]}
					expandedContent={renderExpandedStreams}
					emptyMessage="No team stream ownership data available."
					pagination={{
						total: teamGroups.length,
						pageSize: 6,
						disabled: { previous: true, next: teamGroups.length <= 6 },
					}}
				/>
			</DashboardSection>

			{/* Critical Supervision Queue */}
			{queueRows.length > 0 && (
				<DashboardSection title="Critical Supervision Queue">
					<Card className="border border-border/60 bg-white shadow-sm">
						<CardContent className="space-y-1 p-0">
							{queueRows.map((row) => (
								<div
									key={row.projectId}
									className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span
												className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
													row.queuePriority === "critical"
														? "bg-destructive text-white"
														: "bg-orange-500 text-white"
												}`}
											>
												!
											</span>
											<p className="truncate font-medium text-foreground">
												{row.streamName}
											</p>
											<span className="hidden text-muted-foreground sm:inline">
												•
											</span>
											<p className="truncate text-sm text-muted-foreground">
												{row.ownerDisplayName || "Team member"}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-4 self-end sm:self-auto">
										<p
											className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
												row.queuePriority === "critical"
													? "text-destructive"
													: "text-orange-500"
											}`}
										>
											{queueReasonLabel(row.queuePriorityReason)}
										</p>
										<Button
											asChild
											variant="ghost"
											size="sm"
											className={`h-auto px-2 text-sm ${
												row.queuePriority === "critical"
													? "text-destructive hover:bg-destructive/10 hover:text-destructive"
													: "text-orange-500 hover:bg-orange-500/10 hover:text-orange-500"
											}`}
										>
											<Link href={routes.streams.detail(row.projectId)}>
												View Stream
											</Link>
										</Button>
									</div>
								</div>
							))}
							<div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
								<Button
									asChild
									size="sm"
									variant="outline"
									className="border-border text-foreground hover:bg-muted"
								>
									<Link href={routes.streams.all}>Open streams board</Link>
								</Button>
								<Button
									asChild
									size="sm"
									className="bg-teal-600 text-white hover:bg-teal-700"
								>
									<Link href={routes.settings}>
										Team Management
										<ArrowRight className="ml-1.5 h-4 w-4" />
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</DashboardSection>
			)}
		</div>
	);
}
