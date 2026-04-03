"use client";

import {
	ChevronRight,
	ExternalLink,
	RefreshCw,
	Search,
	SlidersHorizontal,
	Star,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	FadeIn,
	HoverLift,
	Pressable,
	StaggerContainer,
	StaggerItem,
} from "@/components/patterns/animations/motion-components";
import { PageHeader } from "@/components/system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

	const advancedFiltersActive =
		minOverall !== "" || hasComments !== "any" || daysPreset !== "all";

	const advancedFilterCount = [
		minOverall !== "",
		hasComments !== "any",
		daysPreset !== "all",
	].filter(Boolean).length;

	const isAnyFilterActive = advancedFiltersActive || search !== "";

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
	const currentCount = listData?.items.length ?? 0;
	const canPrevious = offset > 0;
	const canNext = offset + currentCount < total;
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
		<div className="space-y-6">
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

			{/* KPI cards — page-scoped with 2026 Animations */}
			<StaggerContainer staggerDelay={0.08} className="grid grid-cols-3 gap-3">
				<StaggerItem>
					<HoverLift>
						<div className="rounded-xl border border-border/60 bg-card px-5 py-4">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Total
							</p>
							<div className="mt-1.5 text-3xl font-semibold tabular-nums">
								{loading ? <Skeleton className="h-8 w-12" /> : total}
							</div>
						</div>
					</HoverLift>
				</StaggerItem>

				<StaggerItem>
					<HoverLift>
						<div
							className={cn(
								"rounded-xl border px-5 py-4 transition-colors duration-200",
								!loading && lowRatedCount > 0
									? "border-destructive/25 bg-destructive/5"
									: "border-border/60 bg-card",
							)}
						>
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Low-rated{totalPages > 1 ? " *" : ""}
							</p>
							<div
								className={cn(
									"mt-1.5 text-3xl font-semibold tabular-nums",
									!loading && lowRatedCount > 0
										? "text-destructive"
										: "text-foreground",
								)}
							>
								{loading ? <Skeleton className="h-8 w-10" /> : lowRatedCount}
							</div>
						</div>
					</HoverLift>
				</StaggerItem>

				<StaggerItem>
					<HoverLift>
						<div className="rounded-xl border border-border/60 bg-card px-5 py-4">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								With comments{totalPages > 1 ? " *" : ""}
							</p>
							<div className="mt-1.5 text-3xl font-semibold tabular-nums">
								{loading ? (
									<Skeleton className="h-8 w-10" />
								) : (
									withCommentsCount
								)}
							</div>
						</div>
					</HoverLift>
				</StaggerItem>
			</StaggerContainer>
			{totalPages > 1 && (
				<p className="-mt-4 text-xs text-muted-foreground">
					* metrics reflect current page only
				</p>
			)}

			{/* Table card */}
			<div className="overflow-hidden rounded-xl border border-border/60 bg-card">
				{/* Toolbar */}
				<div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
					{/* Client-side search */}
					<div className="relative max-w-xs flex-1">
						<Search
							aria-hidden="true"
							className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							className="h-8 border-border/60 bg-transparent pl-8 text-sm"
							placeholder="Search proposal ID…"
							aria-label="Search by proposal ID"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>

					<div className="ml-auto flex items-center gap-2">
						{/* Advanced filters popover */}
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className={cn(
										"h-8 gap-1.5 border-border/60 text-sm font-normal",
										advancedFiltersActive &&
											"border-primary/50 bg-primary/5 text-primary",
									)}
								>
									<SlidersHorizontal className="h-3.5 w-3.5" />
									Filters
									{advancedFilterCount > 0 && (
										<span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground tabular-nums">
											{advancedFilterCount}
										</span>
									)}
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" className="w-64 space-y-4 p-4">
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">
										Min score (1–5)
									</Label>
									<Input
										type="number"
										min={1}
										max={5}
										step={0.1}
										className="h-8 text-sm"
										placeholder="e.g. 3.0"
										value={minOverall}
										onChange={(e) => {
											setMinOverall(e.target.value);
											setOffset(0);
										}}
									/>
								</div>
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">
										Comments
									</Label>
									<Select
										value={hasComments}
										onValueChange={(value) => {
											if (
												value === "true" ||
												value === "false" ||
												value === "any"
											) {
												setHasComments(value);
												setOffset(0);
											}
										}}
									>
										<SelectTrigger className="h-8 text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="any">Any</SelectItem>
											<SelectItem value="true">Has comments</SelectItem>
											<SelectItem value="false">No comments</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label className="text-xs text-muted-foreground">
										Date range
									</Label>
									<Select
										value={daysPreset}
										onValueChange={(value) => {
											if (value === "7" || value === "30" || value === "all") {
												setDaysPreset(value);
												setOffset(0);
											}
										}}
									>
										<SelectTrigger className="h-8 text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All time</SelectItem>
											<SelectItem value="7">Last 7 days</SelectItem>
											<SelectItem value="30">Last 30 days</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{advancedFiltersActive && (
									<Button
										variant="ghost"
										size="sm"
										className="h-7 w-full text-xs"
										onClick={() => {
											setMinOverall("");
											setHasComments("any");
											setDaysPreset("all");
											setOffset(0);
										}}
									>
										Clear filters
									</Button>
								)}
							</PopoverContent>
						</Popover>

						{/* Sort — always visible */}
						<Select
							value={sort}
							onValueChange={(value) => {
								if (
									value === "highest" ||
									value === "lowest" ||
									value === "mostRated" ||
									value === "recentlyRated"
								) {
									setSort(value);
									setOffset(0);
								}
							}}
						>
							<SelectTrigger className="h-8 w-40 border-border/60 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="recentlyRated">Recently rated</SelectItem>
								<SelectItem value="highest">Highest score</SelectItem>
								<SelectItem value="lowest">Lowest score</SelectItem>
								<SelectItem value="mostRated">Most rated</SelectItem>
							</SelectContent>
						</Select>
					</div>
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
							{...(isAnyFilterActive && {
								action: {
									label: "Reset filters",
									onClick: resetFilters,
									variant: "outline" as const,
								},
							})}
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

						<div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5">
							<p className="text-xs tabular-nums text-muted-foreground">
								{search !== ""
									? `${filteredItems.length} of ${currentCount} shown`
									: `${offset + 1}–${Math.min(offset + currentCount, total)} of ${total}`}
							</p>
							<div className="flex items-center gap-1.5">
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-3 text-xs"
									aria-label="Previous page"
									onClick={() =>
										setOffset((prev) => Math.max(0, prev - pageSize))
									}
									disabled={!canPrevious}
								>
									← Prev
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-3 text-xs"
									aria-label="Next page"
									onClick={() => setOffset((prev) => prev + pageSize)}
									disabled={!canNext}
								>
									Next →
								</Button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
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
