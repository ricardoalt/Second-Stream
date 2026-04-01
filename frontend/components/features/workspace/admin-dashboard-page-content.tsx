"use client";

import {
	AlertTriangle,
	ArrowRight,
	ChevronDown,
	Layers,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardAPI } from "@/lib/api/dashboard";
import type { OfferPipelineResponseDTO } from "@/lib/api/offers";
import { offersAPI } from "@/lib/api/offers";
import type {
	DashboardListResponse,
	PersistedStreamRow,
} from "@/lib/types/dashboard";
import {
	buildKpiCards,
	buildSupervisionQueue,
	groupStreamsByOwner,
} from "./admin-dashboard-data";

type AdminDashboardPageContentProps = {
	streamsPath?: string;
	teamPath?: string;
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
	if (reason === "missing_required_info") return "Missing required information";
	if (reason === "stale_waiting_response") return "Stale waiting response";
	if (reason === "stale_under_negotiation") return "Stale negotiation";
	return "Normal follow-up";
}

function queuePriorityLabel(
	priority: PersistedStreamRow["queuePriority"],
): string {
	if (priority === "critical") return "Critical";
	if (priority === "high") return "Needs attention";
	return "On track";
}

function queuePriorityBadgeVariant(
	priority: PersistedStreamRow["queuePriority"],
) {
	if (priority === "critical") return "destructive" as const;
	if (priority === "high") return "outline" as const;
	return "secondary" as const;
}

function streamStageLabel(stream: PersistedStreamRow): string {
	if (stream.proposalFollowUpState === "under_negotiation")
		return "Negotiation";
	if (stream.proposalFollowUpState === "waiting_response") return "Review";
	if (stream.proposalFollowUpState === "waiting_to_send") return "Proposal";
	if (stream.proposalFollowUpState === "uploaded") return "Intake";
	if (stream.missingRequiredInfo) return "Missing info";
	if (stream.pendingConfirmation) return "Confirmation";
	return "In progress";
}

function streamProgressValue(stream: PersistedStreamRow): number {
	if (stream.proposalFollowUpState === "under_negotiation") return 65;
	if (stream.proposalFollowUpState === "waiting_response") return 50;
	if (stream.proposalFollowUpState === "waiting_to_send") return 40;
	if (stream.proposalFollowUpState === "uploaded") return 30;
	if (stream.missingRequiredInfo) return 25;
	if (stream.pendingConfirmation) return 20;
	return 55;
}

function groupRiskCount(streams: PersistedStreamRow[]): number {
	return streams.filter((stream) => stream.queuePriority !== "normal").length;
}

function groupPrimaryStream(
	streams: PersistedStreamRow[],
): PersistedStreamRow | null {
	return streams[0] ?? null;
}

function nextActionLabel(stream: PersistedStreamRow | null): string {
	if (!stream) return "Review workload";
	if (stream.queuePriorityReason === "missing_required_info")
		return "Unblock stream";
	if (stream.queuePriorityReason === "pending_confirmation")
		return "Confirm discovery";
	if (stream.queuePriorityReason === "stale_waiting_response")
		return "Review stalled offer";
	if (stream.queuePriorityReason === "stale_under_negotiation")
		return "Advance negotiation";
	return "Monitor capacity";
}

function workloadBarClassName(streams: PersistedStreamRow[]): string {
	const riskCount = groupRiskCount(streams);
	if (riskCount >= 2 || streams.length >= 14) return "bg-destructive";
	if (riskCount >= 1 || streams.length >= 9) return "bg-warning";
	return "bg-emerald-600";
}

function workloadPercent(streams: PersistedStreamRow[]): number {
	return Math.min(100, Math.max(18, streams.length * 6));
}

function formatPipelineValue(items: OfferPipelineResponseDTO["items"]): string {
	const total = items.reduce((sum, item) => sum + (item.valueUsd ?? 0), 0);
	if (total >= 1_000_000) {
		return `$${(total / 1_000_000).toFixed(1)}M`;
	}
	return `$${total.toLocaleString()}`;
}

function kpiDeltaLabel(kpiId: string, value: number): string {
	if (kpiId === "missing_information") {
		return value > 0 ? `-${Math.min(value, 3)}` : "0";
	}
	if (kpiId === "active_negotiation") {
		return "+5";
	}
	return "+12";
}

export function AdminDashboardPageContent({
	streamsPath = "/streams",
	teamPath = "/settings/team",
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
	const kpis = useMemo(
		() => buildKpiCards(dashboard, pipeline),
		[dashboard, pipeline],
	);
	const teamGroups = useMemo(
		() => groupStreamsByOwner(dashboard.items),
		[dashboard.items],
	);
	const queueRows = useMemo(
		() => buildSupervisionQueue(persistedRows, 5),
		[persistedRows],
	);
	const pipelineValue = useMemo(
		() => formatPipelineValue(pipeline.items),
		[pipeline.items],
	);

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<h1 className="text-xl font-semibold tracking-tight text-foreground">
								Organization Overview
							</h1>
							<Badge
								variant="outline"
								className="text-[10px] uppercase tracking-[0.18em]"
							>
								Live
							</Badge>
						</div>
						<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
							<p>
								Supervising{" "}
								<span className="font-semibold text-foreground">
									{loading ? "—" : pipelineValue}
								</span>{" "}
								in active pipeline across{" "}
								<span className="font-semibold text-foreground">
									{teamGroups.length || 0} agents
								</span>
								.
							</p>
							<Button
								asChild
								variant="ghost"
								size="sm"
								className="h-auto px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
							>
								<Link href={teamPath}>
									Go to Team Management
									<ArrowRight className="ml-1.5 h-4 w-4" />
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>

			{error ? (
				<Card>
					<CardContent className="pt-6 text-sm text-destructive">
						{error}
					</CardContent>
				</Card>
			) : null}

			<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{kpis.map((kpi) => (
					<Card key={kpi.id} className="border-border/60 shadow-none">
						<CardContent className="space-y-3 p-5">
							<div className="flex items-start justify-between gap-3">
								<p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
									{kpi.label}
								</p>
								{kpi.id === "active_negotiation" ? (
									<Layers className="h-4 w-4 text-muted-foreground/70" />
								) : kpi.id === "missing_information" ? (
									<AlertTriangle className="h-4 w-4 text-muted-foreground/70" />
								) : (
									<Users className="h-4 w-4 text-muted-foreground/70" />
								)}
							</div>
							<div className="flex items-end gap-2">
								<p className="text-4xl font-semibold tracking-tight text-foreground">
									{loading ? "—" : kpi.value}
								</p>
								<Badge
									variant="secondary"
									className="mb-1 rounded-md bg-emerald-50 px-1.5 py-0 text-xs font-semibold text-emerald-700"
								>
									{kpiDeltaLabel(kpi.id, kpi.value)}
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">{kpi.note}</p>
						</CardContent>
					</Card>
				))}
			</section>

			<section className="space-y-3">
				<div className="flex items-center gap-2 text-[0.92rem] font-semibold uppercase tracking-[0.18em] text-foreground/70">
					<span className="text-warning">⚡</span>
					<span>Critical Supervision Queue</span>
				</div>
				<Card className="border-border/60 shadow-none">
					<CardContent className="space-y-2 p-0 text-sm">
						{queueRows.length === 0 ? (
							<p className="p-5 text-muted-foreground">
								No active streams in queue.
							</p>
						) : (
							queueRows.map((row) => (
								<div
									key={row.projectId}
									className="flex flex-col gap-3 border-b border-border/40 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span
												className={
													row.queuePriority === "critical"
														? "inline-flex h-4 w-4 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
														: "inline-flex h-4 w-4 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-[10px] text-warning"
												}
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
									<div className="flex items-center gap-6 self-end sm:self-auto">
										<p
											className={
												row.queuePriority === "critical"
													? "text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-destructive"
													: "text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-warning"
											}
										>
											{queueReasonLabel(row.queuePriorityReason)}
										</p>
										<Button
											asChild
											variant="ghost"
											size="sm"
											className={
												row.queuePriority === "critical"
													? "h-auto px-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
													: "h-auto px-2 text-warning hover:bg-warning/5 hover:text-warning"
											}
										>
											<Link href={streamsPath}>
												{row.queuePriority === "critical"
													? "Nudge Agent"
													: "View Stream"}
											</Link>
										</Button>
									</div>
								</div>
							))
						)}
						<div className="flex flex-wrap gap-2 border-t border-border/40 px-5 py-4">
							<Button
								asChild
								size="sm"
								variant="outline"
								className="shadow-none"
							>
								<Link href={streamsPath}>Open streams board</Link>
							</Button>
							<Button asChild size="sm">
								<Link href={teamPath}>
									Team Management
									<ArrowRight className="ml-1.5 h-4 w-4" />
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>

			<section className="space-y-3">
				<h2 className="text-[0.92rem] font-semibold uppercase tracking-[0.18em] text-foreground/70">
					Team Oversight
				</h2>
				<Card className="overflow-hidden border-border/60 shadow-none">
					<div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.4fr_40px] gap-4 border-b border-border/50 px-6 py-4 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
						<span>Agent</span>
						<span>Workload</span>
						<span>Status</span>
						<span>Next Action</span>
						<span />
					</div>
					{teamGroups.length === 0 ? (
						<div className="px-6 py-6 text-sm text-muted-foreground">
							No team stream ownership data available.
						</div>
					) : (
						teamGroups.slice(0, 5).map((group) => {
							const primary = groupPrimaryStream(group.streams);
							const riskCount = groupRiskCount(group.streams);
							const riskLabel =
								riskCount > 0 ? `${riskCount} at risk` : "Healthy";

							return (
								<details
									key={group.ownerUserId}
									className="group border-b border-border/40 last:border-b-0"
								>
									<summary className="grid cursor-pointer grid-cols-[2fr_1.2fr_1.2fr_1.4fr_40px] items-center gap-4 px-6 py-4 marker:content-none hover:bg-surface-container-low/30">
										<div className="flex items-center gap-3 min-w-0">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-sm font-medium text-primary">
												{group.ownerLabel
													.split(" ")
													.map((part) => part[0])
													.slice(0, 2)
													.join("")
													.toUpperCase()}
											</div>
											<div className="min-w-0">
												<p className="truncate font-medium text-foreground">
													{group.ownerLabel}
												</p>
												<p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground/70">
													{primary?.ownerDisplayName
														? "Assigned owner"
														: "Team member"}
												</p>
											</div>
										</div>
										<div className="space-y-1">
											<div className="flex items-center justify-between gap-2 text-sm">
												<span>{group.streams.length} streams</span>
												<span
													className={
														riskCount > 0
															? "text-xs font-medium text-destructive"
															: "text-xs text-muted-foreground"
													}
												>
													{riskLabel}
												</span>
											</div>
											<div className="h-1.5 rounded-full bg-surface-container-high">
												<div
													className={`h-1.5 rounded-full ${workloadBarClassName(group.streams)}`}
													style={{
														width: `${workloadPercent(group.streams)}%`,
													}}
												/>
											</div>
										</div>
										<div>
											<Badge
												variant={queuePriorityBadgeVariant(
													primary?.queuePriority ?? "normal",
												)}
											>
												{queuePriorityLabel(primary?.queuePriority ?? "normal")}
											</Badge>
										</div>
										<div
											className={
												primary?.queuePriority === "normal"
													? "text-sm text-muted-foreground"
													: "text-sm font-semibold text-foreground"
											}
										>
											{nextActionLabel(primary)}
										</div>
										<div className="flex justify-end text-muted-foreground transition-transform group-open:rotate-180">
											<ChevronDown className="h-4 w-4" />
										</div>
									</summary>
									<div className="bg-surface-container-low/20 px-6 py-3">
										<div className="mb-2 flex items-center gap-3 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
											<span>Active waste streams</span>
											<div className="h-px flex-1 bg-border/30" />
										</div>
										<div className="space-y-1">
											{group.streams.slice(0, 4).map((stream) => (
												<div
													key={stream.projectId}
													className="grid grid-cols-[1.7fr_1fr_1fr] items-center gap-4 border-b border-border/20 px-2 py-3 last:border-b-0 hover:bg-surface-container-low/40"
												>
													<div className="min-w-0">
														<p className="truncate font-medium text-foreground">
															{stream.streamName}
														</p>
														<p className="truncate text-sm text-muted-foreground">
															{stream.companyLabel ||
																stream.locationLabel ||
																"Client unavailable"}
														</p>
													</div>
													<div className="space-y-1">
														<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
															<span>{streamStageLabel(stream)}</span>
															<span>{streamProgressValue(stream)}%</span>
														</div>
														<div className="h-1.5 rounded-full bg-surface-container-high">
															<div
																className="h-1.5 rounded-full bg-primary"
																style={{
																	width: `${streamProgressValue(stream)}%`,
																}}
															/>
														</div>
													</div>
													<div className="flex justify-start lg:justify-end">
														<Badge
															variant={queuePriorityBadgeVariant(
																stream.queuePriority,
															)}
														>
															{queueReasonLabel(stream.queuePriorityReason)}
														</Badge>
													</div>
												</div>
											))}
										</div>
									</div>
								</details>
							);
						})
					)}
				</Card>
			</section>
		</div>
	);
}
