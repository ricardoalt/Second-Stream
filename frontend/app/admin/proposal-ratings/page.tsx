"use client";

import { ChevronRight, ExternalLink, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	EmptyState,
	FilterBar,
	KpiCard,
	PageHeader,
	PageShell,
	StatRail,
	TablePagination,
} from "@/components/patterns";
import {
	FadeIn,
	HoverLift,
	Pressable,
} from "@/components/patterns/animations/motion-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { proposalRatingsAPI } from "@/lib/api/proposal-ratings";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { routes } from "@/lib/routes";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import type {
	AdminProposalRatingsDetailResponse,
	AdminProposalRatingsHasComments,
	AdminProposalRatingsListParams,
	AdminProposalRatingsListResponse,
	AdminProposalRatingsSort,
	ProposalRatingDistribution,
} from "@/lib/types/proposal-rating";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type DaysPreset = "7" | "30" | "all";

function daysPresetToRange(preset: DaysPreset): {
	ratedFrom: string | undefined;
	ratedTo: string | undefined;
} {
	if (preset === "all") return { ratedFrom: undefined, ratedTo: undefined };
	const from = new Date();
	from.setDate(from.getDate() - Number(preset));
	return { ratedFrom: from.toISOString(), ratedTo: undefined };
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function relativeTime(dateString: string): string {
	const diff = Date.now() - new Date(dateString).getTime();
	const days = Math.floor(diff / 86_400_000);
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days}d ago`;
	if (days < 30) return `${Math.floor(days / 7)}w ago`;
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

type ScoreSeverity = "critical" | "warning" | "good";

function scoreSeverity(avg: number): ScoreSeverity {
	if (avg < 3.0) return "critical";
	if (avg < 4.0) return "warning";
	return "good";
}

const SEVERITY_VARIANT: Record<
	ScoreSeverity,
	"destructive" | "warning" | "success"
> = {
	critical: "destructive",
	warning: "warning",
	good: "success",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProposalRatingsPage() {
	const { selectedOrgId } = useOrganizationStore();
	const [loading, setLoading] = useState(true);
	const [listData, setListData] =
		useState<AdminProposalRatingsListResponse | null>(null);
	const [expandedProposalId, setExpandedProposalId] = useState<string | null>(
		null,
	);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detail, setDetail] =
		useState<AdminProposalRatingsDetailResponse | null>(null);

	// Server-side filters
	const [minOverall, setMinOverall] = useState("");
	const [hasComments, setHasComments] =
		useState<AdminProposalRatingsHasComments>("any");
	const [sort, setSort] = useState<AdminProposalRatingsSort>("recentlyRated");
	const [daysPreset, setDaysPreset] = useState<DaysPreset>("all");
	const [offset, setOffset] = useState(0);
	const debouncedMinOverall = useDebounce(minOverall);

	// Client-side search — filters visible items without a server round-trip
	const [search, setSearch] = useState("");

	const requestIdRef = useRef(0);
	const detailRequestIdRef = useRef(0);
	const previousOrgIdRef = useRef<string | null>(selectedOrgId);
	const pageSize = 20;

	const loadList = useCallback(async () => {
		const requestId = ++requestIdRef.current;

		if (!selectedOrgId) {
			setListData(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const parsedMinOverall =
				debouncedMinOverall === "" ? null : Number(debouncedMinOverall);
			const { ratedFrom, ratedTo } = daysPresetToRange(daysPreset);

			const payload: AdminProposalRatingsListParams = {
				limit: pageSize,
				offset,
				hasComments,
				sort,
			};
			if (parsedMinOverall !== null && !Number.isNaN(parsedMinOverall)) {
				payload.minOverall = parsedMinOverall;
			}
			if (ratedFrom) payload.ratedFrom = ratedFrom;
			if (ratedTo) payload.ratedTo = ratedTo;

			const response = await proposalRatingsAPI.listAdmin(payload);
			if (requestId !== requestIdRef.current) return;
			setListData(response);
		} catch (_error) {
			if (requestId !== requestIdRef.current) return;
			toast.error("Failed to load proposal ratings");
		} finally {
			if (requestId === requestIdRef.current) setLoading(false);
		}
	}, [
		selectedOrgId,
		debouncedMinOverall,
		hasComments,
		sort,
		daysPreset,
		offset,
	]);

	const toggleDetail = useCallback(
		async (proposalId: string) => {
			if (expandedProposalId === proposalId) {
				setExpandedProposalId(null);
				setDetail(null);
				return;
			}

			const requestId = ++detailRequestIdRef.current;
			setExpandedProposalId(proposalId);
			setDetail(null);
			setDetailLoading(true);
			try {
				const response = await proposalRatingsAPI.getAdminDetail(proposalId);
				if (requestId !== detailRequestIdRef.current) return;
				setDetail(response);
			} catch (_error) {
				if (requestId !== detailRequestIdRef.current) return;
				toast.error("Failed to load rating breakdown");
			} finally {
				if (requestId === detailRequestIdRef.current) setDetailLoading(false);
			}
		},
		[expandedProposalId],
	);

	useEffect(() => {
		void loadList();
	}, [loadList]);

	useEffect(() => {
		if (previousOrgIdRef.current === selectedOrgId) return;
		previousOrgIdRef.current = selectedOrgId;
		detailRequestIdRef.current += 1;
		setExpandedProposalId(null);
		setDetail(null);
		setDetailLoading(false);
	}, [selectedOrgId]);

	const resetFilters = () => {
		setMinOverall("");
		setHasComments("any");
		setSort("recentlyRated");
		setDaysPreset("all");
		setOffset(0);
		setSearch("");
	};

	const isAnyFilterActive =
		minOverall !== "" ||
		hasComments !== "any" ||
		daysPreset !== "all" ||
		search !== "";

	// Client-side filtering on top of server-filtered page
	const filteredItems = (listData?.items ?? []).filter((item) =>
		search === ""
			? true
			: item.proposalId.toLowerCase().includes(search.toLowerCase()),
	);

	// KPI counts — page-scoped
	const allItems = listData?.items ?? [];
	const lowRatedCount = allItems.filter((i) => i.overallAvg < 3.5).length;
	const withCommentsCount = allItems.filter((i) => i.commentCount > 0).length;

	const total = listData?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	// 5 data cols + 1 action col = 6; plus expand chevron col = 7 total
	const tableColumnCount = 7;

	if (!selectedOrgId) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<p className="text-muted-foreground">
					Select an organization to view proposal ratings
				</p>
			</div>
		);
	}

	return (
		<PageShell>
			<FadeIn direction="up">
				<PageHeader
					title="Proposal Ratings"
					subtitle="Monitor AI proposal quality and reviewer sentiment."
					actions={
						<Pressable>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground hover:text-foreground"
								onClick={loadList}
								disabled={loading}
								aria-label="Refresh"
							>
								<RefreshCw
									className={cn("h-4 w-4", loading && "animate-spin")}
								/>
							</Button>
						</Pressable>
					}
				/>
			</FadeIn>

			{/* KPI stats rail */}
			<StatRail columns={3}>
				<HoverLift>
					<KpiCard title="Total" value={total} icon={Star} loading={loading} />
				</HoverLift>
				<HoverLift>
					<KpiCard
						title={`Low-rated${totalPages > 1 ? " *" : ""}`}
						value={lowRatedCount}
						variant={!loading && lowRatedCount > 0 ? "destructive" : "default"}
						loading={loading}
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title={`With comments${totalPages > 1 ? " *" : ""}`}
						value={withCommentsCount}
						loading={loading}
					/>
				</HoverLift>
			</StatRail>
			{totalPages > 1 && (
				<p className="-mt-4 text-xs text-muted-foreground">
					* metrics reflect current page only
				</p>
			)}

			<FilterBar
				search={{
					value: search,
					onChange: setSearch,
					placeholder: "Search proposal ID…",
				}}
				filters={[
					{
						key: "sort",
						value: sort,
						onChange: (v) => {
							setSort(v as AdminProposalRatingsSort);
							setOffset(0);
						},
						options: [
							{ value: "recentlyRated", label: "Recently rated" },
							{ value: "highest", label: "Highest score" },
							{ value: "lowest", label: "Lowest score" },
							{ value: "mostRated", label: "Most rated" },
						],
						width: "w-[160px]",
					},
					{
						key: "comments",
						placeholder: "Comments",
						value: hasComments,
						onChange: (v) => {
							setHasComments(v as AdminProposalRatingsHasComments);
							setOffset(0);
						},
						options: [
							{ value: "any", label: "Any comments" },
							{ value: "true", label: "Has comments" },
							{ value: "false", label: "No comments" },
						],
						width: "w-[150px]",
					},
					{
						key: "days",
						placeholder: "Date range",
						value: daysPreset,
						onChange: (v) => {
							setDaysPreset(v as DaysPreset);
							setOffset(0);
						},
						options: [
							{ value: "all", label: "All time" },
							{ value: "7", label: "Last 7 days" },
							{ value: "30", label: "Last 30 days" },
						],
						width: "w-[140px]",
					},
				]}
				activeFilterCount={
					(search !== "" ? 1 : 0) +
					(hasComments !== "any" ? 1 : 0) +
					(daysPreset !== "all" ? 1 : 0)
				}
				onClear={resetFilters}
			/>

			{/* Table card */}
			<div className="overflow-hidden rounded-xl border border-border/60 bg-card">
				{/* Min score filter */}
				<div className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5">
					<Label className="text-xs text-muted-foreground whitespace-nowrap">
						Min score (1–5)
					</Label>
					<Input
						type="number"
						min={1}
						max={5}
						step={0.1}
						className="h-7 w-20 text-sm"
						placeholder="e.g. 3"
						value={minOverall}
						onChange={(e) => {
							setMinOverall(e.target.value);
							setOffset(0);
						}}
					/>
				</div>

				{/* Table content */}
				{loading ? (
					<div className="space-y-3 p-6">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : !listData || filteredItems.length === 0 ? (
					<div className="p-6">
						<EmptyState
							icon={Star}
							title="No ratings found"
							description="Try adjusting filters or wait for users to submit ratings."
							action={
								isAnyFilterActive ? (
									<Button variant="outline" size="sm" onClick={resetFilters}>
										Reset filters
									</Button>
								) : undefined
							}
						/>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<TooltipProvider delayDuration={200}>
								<Table>
									<TableHeader>
										<TableRow className="border-border/60 hover:bg-transparent">
											<TableHead className="w-8" />
											<TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Proposal
											</TableHead>
											<TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Score
											</TableHead>
											<TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Ratings
											</TableHead>
											<TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Latest
											</TableHead>
											<TableHead className="w-32 text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Action
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredItems.map((item) => {
											const isExpanded = expandedProposalId === item.proposalId;
											const detailRowId = `detail-${item.proposalId}`;
											const severity = scoreSeverity(item.overallAvg);

											return (
												<Fragment key={item.proposalId}>
													<TableRow
														className={cn(
															"border-border/40 transition-colors",
															isExpanded
																? "border-b-0 bg-muted/30"
																: "hover:bg-muted/20",
														)}
														onClick={() => {
															void toggleDetail(item.proposalId);
														}}
													>
														<TableCell className="w-8 px-2 py-2.5">
															{/* Primary keyboard/a11y control for expand/collapse.
															    Row onClick is a convenience shortcut only. */}
															<button
																type="button"
																aria-expanded={isExpanded}
																aria-controls={detailRowId}
																aria-label={
																	isExpanded
																		? "Collapse rating details"
																		: "Expand rating details"
																}
																className="flex h-6 w-6 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
																onClick={(e) => {
																	e.stopPropagation();
																	void toggleDetail(item.proposalId);
																}}
															>
																<ChevronRight
																	aria-hidden="true"
																	className={cn(
																		"h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-150",
																		isExpanded && "rotate-90",
																	)}
																/>
															</button>
														</TableCell>
														<TableCell className="py-2.5">
															<Tooltip>
																<TooltipTrigger asChild>
																	<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
																		{item.proposalId.slice(0, 8)}
																	</span>
																</TooltipTrigger>
																<TooltipContent side="right">
																	{item.proposalId}
																</TooltipContent>
															</Tooltip>
														</TableCell>
														<TableCell className="py-2.5">
															<Badge
																variant={SEVERITY_VARIANT[severity]}
																className="min-w-[3.25rem] justify-center font-mono text-xs tabular-nums"
															>
																{item.overallAvg.toFixed(2)}
															</Badge>
														</TableCell>
														<TableCell className="py-2.5 tabular-nums text-sm">
															{item.ratingCount}
															{item.commentCount > 0 && (
																<span className="ml-1.5 text-xs text-muted-foreground/60">
																	· {item.commentCount}c
																</span>
															)}
														</TableCell>
														<TableCell className="py-2.5 text-sm text-muted-foreground">
															<Tooltip>
																<TooltipTrigger asChild>
																	<span>
																		{relativeTime(item.latestRatingAt)}
																	</span>
																</TooltipTrigger>
																<TooltipContent>
																	{formatDate(item.latestRatingAt)}
																</TooltipContent>
															</Tooltip>
														</TableCell>
														<TableCell
															className="py-2.5"
															onClick={(e) => e.stopPropagation()}
														>
															<Button
																variant="ghost"
																size="sm"
																className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
																asChild
															>
																<Link
																	href={routes.streams.detail(item.projectId)}
																>
																	View proposal
																	<ExternalLink className="h-3 w-3" />
																</Link>
															</Button>
														</TableCell>
													</TableRow>

													{isExpanded && (
														<TableRow
															id={detailRowId}
															className="bg-muted/20 hover:bg-muted/20"
														>
															<TableCell
																colSpan={tableColumnCount}
																className="p-0"
															>
																<div className="border-t border-dashed border-border/50 px-6 py-4">
																	<ExpandedDetail
																		loading={detailLoading}
																		detail={detail}
																	/>
																</div>
															</TableCell>
														</TableRow>
													)}
												</Fragment>
											);
										})}
									</TableBody>
								</Table>
							</TooltipProvider>
						</div>

						<TablePagination
							total={total}
							showing={filteredItems.length}
							page={Math.floor(offset / pageSize) + 1}
							pageCount={totalPages}
							onPrevious={() =>
								setOffset((prev) => Math.max(0, prev - pageSize))
							}
							onNext={() => setOffset((prev) => prev + pageSize)}
							itemLabel="ratings"
						/>
					</>
				)}
			</div>
		</PageShell>
	);
}

// ─── Expanded detail ─────────────────────────────────────────────────────────

function ExpandedDetail({
	loading,
	detail,
}: {
	loading: boolean;
	detail: AdminProposalRatingsDetailResponse | null;
}) {
	if (loading) {
		return (
			<div className="grid grid-cols-1 gap-3 py-1 lg:grid-cols-3">
				<Skeleton className="h-28 rounded-lg" />
				<Skeleton className="h-28 rounded-lg" />
				<Skeleton className="h-28 rounded-lg" />
			</div>
		);
	}

	if (!detail) return null;

	return (
		<div className="space-y-4 py-1">
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
				<DistributionChart
					label="Coverage"
					avg={detail.criteriaAvg.coverageNeedsAvg}
					distribution={detail.distributions.coverageNeedsScore}
				/>
				<DistributionChart
					label="Info quality"
					avg={detail.criteriaAvg.qualityInfoAvg}
					distribution={detail.distributions.qualityInfoScore}
				/>
				<DistributionChart
					label="Business data"
					avg={detail.criteriaAvg.businessDataAvg}
					distribution={detail.distributions.businessDataScore}
				/>
			</div>

			{detail.comments.length > 0 && (
				<div className="space-y-2">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Comments ({detail.comments.length})
					</p>
					<div className="space-y-1.5">
						{detail.comments.map((commentItem) => (
							<div
								key={`${commentItem.updatedAt}-${commentItem.comment}`}
								className="rounded-lg bg-muted/40 px-3 py-2.5"
							>
								<p className="text-sm leading-relaxed">{commentItem.comment}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{formatDate(commentItem.updatedAt)}
								</p>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Distribution chart ───────────────────────────────────────────────────────

function DistributionChart({
	label,
	avg,
	distribution,
}: {
	label: string;
	avg: number;
	distribution: ProposalRatingDistribution;
}) {
	const scores = ["5", "4", "3", "2", "1"] as const;
	const maxCount = Math.max(...scores.map((s) => distribution[s] ?? 0), 1);

	return (
		<div className="rounded-lg bg-muted/30 p-3">
			<div className="mb-3 flex items-center justify-between">
				<p className="text-xs font-medium text-muted-foreground">{label}</p>
				<span className="text-xs font-semibold tabular-nums">
					{avg.toFixed(1)}
				</span>
			</div>
			<div className="space-y-1.5">
				{scores.map((score) => {
					const count = distribution[score] ?? 0;
					const percent = (count / maxCount) * 100;
					const numericScore = Number(score);
					const barColor =
						numericScore >= 4
							? "bg-success/70"
							: numericScore === 3
								? "bg-warning/70"
								: "bg-destructive/60";

					return (
						<div
							key={score}
							className="flex items-center gap-2"
							role="img"
							aria-label={`Score ${score}: ${count} ${count === 1 ? "rating" : "ratings"}`}
						>
							<span
								aria-hidden="true"
								className="w-3 text-right text-xs tabular-nums text-muted-foreground"
							>
								{score}
							</span>
							<div
								aria-hidden="true"
								className="h-4 flex-1 rounded-sm bg-muted"
							>
								<div
									className={cn("h-4 rounded-sm transition-all", barColor)}
									style={{ width: `${percent}%` }}
								/>
							</div>
							<span
								aria-hidden="true"
								className="w-6 text-right text-xs tabular-nums text-muted-foreground"
							>
								{count}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
