"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	KpiCard,
	KpiGrid,
	PageSection,
} from "@/components/system/page-template";
import { StatusChip } from "@/components/system/status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, SectionDivider } from "@/components/ui/data-table";
import { ProgressCard } from "@/components/ui/progress-card";
import { getAvatarColorForName, TeamAvatar } from "@/components/ui/team-avatar";
import { dashboardAPI } from "@/lib/api/dashboard";
import type { OfferPipelineResponseDTO } from "@/lib/api/offers";
import { offersAPI } from "@/lib/api/offers";
import { organizationsAPI } from "@/lib/api/organizations";
import { routes } from "@/lib/routes";
import type {
	DashboardListResponse,
	PersistedStreamRow,
	QueuePriority,
} from "@/lib/types/dashboard";
import type { User } from "@/lib/types/user";
import {
	buildTeamOwnerGroups,
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
	if (reason === "pending_confirmation") return "Pending confirmation";
	if (reason === "missing_required_info") return "Missing information";
	if (reason === "stale_waiting_response") return "Stale follow-up";
	if (reason === "stale_under_negotiation") return "Under negotiation";
	return "On track";
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

const QUEUE_PRIORITY_ORDER: Record<QueuePriority, number> = {
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

	return sorted[0] ?? null;
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

// Get chip status based on queue priority
function getChipStatusForPriority(
	priority: PersistedStreamRow["queuePriority"],
): "error" | "warning" | "success" {
	if (priority === "critical") return "error";
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
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const [dashboardResult, pipelineResult, teamMembersResult] =
					await Promise.allSettled([
					dashboardAPI.getDashboard({
						bucket: "total",
						size: DASHBOARD_PAGE_SIZE,
						signal: controller.signal,
					}),
					offersAPI.getPipeline(),
					organizationsAPI.listMyOrgUsers(),
				]);

				if (dashboardResult.status === "fulfilled") {
					setDashboard(dashboardResult.value);
				} else if (!controller.signal.aborted) {
					setError("Unable to load admin dashboard data.");
				}

				if (pipelineResult.status === "fulfilled") {
					setPipeline(pipelineResult.value);
				}

				if (teamMembersResult.status === "fulfilled") {
					setTeamMembers(teamMembersResult.value);
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

	const teamGroups = useMemo(
		() => buildTeamOwnerGroups(dashboard.items, teamMembers),
		[dashboard.items, teamMembers],
	);
	const pipelineValue = useMemo(
		() => formatPipelineValue(pipeline.items),
		[pipeline.items],
	);

	// Render expanded stream content
	const renderExpandedStreams = (
		group: typeof teamGroups[number],
	) => {
		if (group.streams.length === 0) {
			return (
				<>
					<SectionDivider label="Active waste streams" />
					<p className="text-sm text-muted-foreground">
						No active waste streams assigned yet.
					</p>
				</>
			);
		}

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
										? "error"
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

			{/* Stream Lifecycle Summary */}
			<PageSection
				title="Stream Lifecycle Summary"
				actions={
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
						<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							Live Flow Tracking
						</span>
					</div>
				}
			>
				<KpiGrid>
					<KpiCard
						label="Total Streams"
						value={dashboard.counts.total}
						loading={loading}
						icon={
							<svg
								className="size-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
							>
								<path d="M2 12h20M2 12c0-5 4-9 9-9s9 4 9 9M2 12c0 5 4 9 9 9s9-4 9-9" />
								<path d="M12 2v20" />
							</svg>
						}
					/>
					<KpiCard
						label="Missing Information"
						value={dashboard.counts.missingInformation}
						loading={loading}
						icon={
							<svg
								className="size-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
						}
					/>
					<KpiCard
						label="In Negotiation"
						value={pipeline.counts.underNegotiation}
						loading={loading}
						icon={
							<svg
								className="size-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
							>
								<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
								<polyline points="14 2 14 8 20 8" />
								<line x1="16" y1="13" x2="8" y2="13" />
							</svg>
						}
					/>
					<KpiCard
						label="Pipeline Value"
						value={pipelineValue}
						loading={loading}
						icon={
							<svg
								className="size-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
								aria-hidden="true"
							>
								<line x1="12" y1="1" x2="12" y2="23" />
								<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
							</svg>
						}
					/>
				</KpiGrid>
			</PageSection>

			{/* Team Performance */}
			<PageSection
				title="Team Performance"
				actions={
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
									const chipStatus = getChipStatusForPriority(
										primary.queuePriority,
									);

									return (
										<StatusChip
											status={chipStatus}
											variant="subtle"
											size="sm"
											{...(days > 0 ? { days: Math.min(days, 28) } : {})}
										>
											{queueReasonLabel(primary.queuePriorityReason)}
										</StatusChip>
									);
								}

								return (
									<StatusChip status="success" variant="subtle" size="sm">
										On Track
									</StatusChip>
								);
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
										className="h-auto px-0 text-sm text-primary hover:bg-transparent hover:text-foreground"
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
			</PageSection>
		</div>
	);
}
