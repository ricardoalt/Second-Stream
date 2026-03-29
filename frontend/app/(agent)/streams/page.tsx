"use client";

import {
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Download,
	Filter,
	Loader2,
	Search,
	Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import {
	resolveOpenDraftState,
	type StreamsTab,
} from "@/components/features/streams/runtime-helpers";
import { StreamsAllTable } from "@/components/features/streams/streams-all-table";
import { StreamsDraftConfirmation } from "@/components/features/streams/streams-draft-confirmation";
import {
	type DraftEditorState,
	StreamsDraftsTable,
} from "@/components/features/streams/streams-drafts-table";
import { StreamsFamilyHeader } from "@/components/features/streams/streams-family-header";
import { StreamsFollowUpBoard } from "@/components/features/streams/streams-follow-up-board";
import { useStreamFilters } from "@/components/features/streams/use-stream-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useStreamsActions,
	useStreamsAll,
	useStreamsCounts,
	useStreamsDraftRowsById,
	useStreamsDrafts,
	useStreamsError,
	useStreamsInitialized,
	useStreamsLoading,
	useStreamsMissingInfo,
} from "@/lib/stores/streams-store";
import type { DraftItemRow } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";
import { computeWasteStreamsKpis } from "@/lib/utils/compute-waste-streams-kpis";

export default function AgentStreamsPage() {
	const discoveryWizard = useDiscoveryWizard();
	const {
		search,
		clientFilter,
		statusFilter,
		setSearch,
		setClientFilter,
		setStatusFilter,
	} = useStreamFilters();
	const allStreams = useStreamsAll();
	const draftStreams = useStreamsDrafts();
	const missingInfoStreams = useStreamsMissingInfo();
	const counts = useStreamsCounts();
	const draftRowsById = useStreamsDraftRowsById();
	const loading = useStreamsLoading();
	const isInitialized = useStreamsInitialized();
	const error = useStreamsError();
	const { loadStreams } = useStreamsActions();
	const [activeTab, setActiveTab] = useState<StreamsTab>("all");
	const [confirmTarget, setConfirmTarget] = useState<{
		draftItemRow: DraftItemRow;
		editorState: DraftEditorState;
	} | null>(null);

	const [highlightedDraftId, setHighlightedDraftId] = useState<string | null>(
		null,
	);

	// ── All Streams state ──
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// ── Missing Information state ──
	const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(
		null,
	);

	// ── Computed data ──
	const operationalStreams = allStreams;

	const filteredStreams = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		return operationalStreams.filter((row) => {
			const matchSearch =
				normalizedSearch.length === 0 ||
				row.name.toLowerCase().includes(normalizedSearch) ||
				row.client.toLowerCase().includes(normalizedSearch) ||
				row.wasteType.toLowerCase().includes(normalizedSearch);

			const matchClient = clientFilter === "all" || row.client === clientFilter;
			const matchStatus = statusFilter === "all" || row.status === statusFilter;

			return matchSearch && matchClient && matchStatus;
		});
	}, [clientFilter, operationalStreams, search, statusFilter]);

	const filteredDrafts = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		return draftStreams.filter((row) => {
			const matchSearch =
				normalizedSearch.length === 0 ||
				row.name.toLowerCase().includes(normalizedSearch) ||
				row.client.toLowerCase().includes(normalizedSearch) ||
				row.wasteType.toLowerCase().includes(normalizedSearch);

			const matchClient = clientFilter === "all" || row.client === clientFilter;

			return matchSearch && matchClient;
		});
	}, [clientFilter, draftStreams, search]);

	const filteredFollowUps = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		return missingInfoStreams.filter((row) => {
			const matchSearch =
				normalizedSearch.length === 0 ||
				row.name.toLowerCase().includes(normalizedSearch) ||
				row.client.toLowerCase().includes(normalizedSearch) ||
				row.wasteType.toLowerCase().includes(normalizedSearch);

			const matchClient = clientFilter === "all" || row.client === clientFilter;

			return matchSearch && matchClient;
		});
	}, [clientFilter, missingInfoStreams, search]);

	// ── Derived KPIs ──
	const kpis = useMemo(() => computeWasteStreamsKpis(counts), [counts]);

	useEffect(() => {
		if (!isInitialized) {
			void loadStreams();
		}
	}, [isInitialized, loadStreams]);

	useEffect(() => {
		setSelectedIds((prev) => {
			const validIds = new Set(operationalStreams.map((stream) => stream.id));
			return new Set([...prev].filter((id) => validIds.has(id)));
		});
	}, [operationalStreams]);

	useEffect(() => {
		if (
			selectedFollowUpId &&
			!filteredFollowUps.some((row) => row.id === selectedFollowUpId)
		) {
			setSelectedFollowUpId(null);
		}
	}, [filteredFollowUps, selectedFollowUpId]);

	// ── Handlers ──
	function handleConfirmDraft(id: string, editorState: DraftEditorState) {
		const draft = draftRowsById[id];
		if (!draft) {
			return;
		}

		setConfirmTarget({ draftItemRow: draft, editorState });
		setHighlightedDraftId(null);
	}

	function handleOpenDraft(id: string) {
		const next = resolveOpenDraftState(id);
		setActiveTab(next.activeTab);
		setHighlightedDraftId(next.highlightedDraftId);
	}

	function handleToggleSelection(id: string, isSelected: boolean) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (isSelected) {
				next.add(id);
			} else {
				next.delete(id);
			}
			return next;
		});
	}

	function handleToggleAllVisible(isSelected: boolean) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			for (const row of filteredStreams) {
				if (isSelected) {
					next.add(row.id);
				} else {
					next.delete(row.id);
				}
			}
			return next;
		});
	}

	function formatKpi(value: number | null): string | null {
		if (value === null) {
			return null;
		}

		return String(value);
	}

	return (
		<div className="flex flex-col gap-8">
			<StreamsFamilyHeader
				breadcrumb="Waste Streams"
				title="Waste Stream Management"
				subtitle="Track, validate, and propose disposal routes for active industrial byproduct flows."
				actions={null}
			/>

			{/* KPI rail — page-level, tab-invariant */}
			{/* KPI unified tonal band */}
			<section className="rounded-2xl bg-surface-container-low/60 p-5">
				<div className="animate-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
					<KpiCard
						label="Active Streams"
						value={formatKpi(kpis.activeStreams)}
						isPrimary
					/>
					<KpiCard
						label="Critical Alerts"
						value={formatKpi(kpis.criticalAlerts)}
						badge="Action Needed"
						badgeType="destructive"
					/>
					<KpiCard
						label="Monthly Volume"
						value={formatKpi(kpis.monthlyVolume)}
						{...(kpis.monthlyVolume !== null ? { subValue: "Gallons" } : {})}
					/>
					<KpiCard
						label="Open Offers"
						value={formatKpi(kpis.openOffers)}
						hasAction
					/>
				</div>
			</section>

			{loading && !isInitialized ? (
				<div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-muted-foreground">
					<Loader2 aria-hidden className="size-4 animate-spin" />
					Loading streams…
				</div>
			) : null}

			{error ? (
				<div className="rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			) : null}

			{/* ── Unified tabs ── */}
			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as StreamsTab)}
			>
				<div className="flex items-center justify-between gap-4">
					<TabsList className="bg-transparent">
						<TabsTrigger value="all" className="gap-2">
							All Streams
						</TabsTrigger>
						<TabsTrigger value="drafts" className="gap-2">
							Drafts
						</TabsTrigger>
						<TabsTrigger value="missing-info" className="gap-2">
							Missing Information
						</TabsTrigger>
					</TabsList>

					{activeTab === "all" && (
						<div className="hidden items-center gap-2 lg:flex">
							<Button variant="ghost" size="sm">
								<Filter data-icon="inline-start" aria-hidden />
							</Button>
							<Button variant="ghost" size="sm">
								<Download data-icon="inline-start" aria-hidden />
							</Button>
						</div>
					)}
				</div>

				{/* ── Tab: All Active ── */}
				<TabsContent value="all" className="mt-6">
					<div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
						{/* Search / Filters */}
						{activeTab === "all" && (
							<div className="grid gap-3 p-4 lg:grid-cols-[1.4fr_repeat(2,minmax(0,1fr))]">
								<div className="relative">
									<Search
										aria-hidden
										className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
									/>
									<Input
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Search stream, client, waste type"
										className="pl-9"
									/>
								</div>

								<Select value={clientFilter} onValueChange={setClientFilter}>
									<SelectTrigger>
										<SelectValue placeholder="Client" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="all">All clients</SelectItem>
											{[
												...new Set(
													operationalStreams.map((stream) => stream.client),
												),
											].map((client) => (
												<SelectItem key={client} value={client}>
													{client}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>

								<Select value={statusFilter} onValueChange={setStatusFilter}>
									<SelectTrigger>
										<SelectValue placeholder="Status" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="all">All statuses</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="draft">Draft</SelectItem>
											<SelectItem value="missing_info">Missing info</SelectItem>
											<SelectItem value="blocked">Blocked</SelectItem>
											<SelectItem value="ready_for_offer">
												Ready for offer
											</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						)}

						{filteredStreams.length > 0 ? (
							<StreamsAllTable
								rows={filteredStreams}
								selectedIds={selectedIds}
								onToggleSelection={handleToggleSelection}
								onToggleAllVisible={handleToggleAllVisible}
								onOpenDraft={handleOpenDraft}
							/>
						) : (
							<div className="p-6">
								<EmptyState
									icon={Search}
									title="No streams found"
									description="Try adjusting your filters or search term."
									action={{
										label: "Clear filters",
										onClick: () => {
											setSearch("");
											setClientFilter("all");
											setStatusFilter("all");
										},
										variant: "outline",
									}}
									severity="info"
									compact
								/>
							</div>
						)}

						{/* Pagination Footer */}
						<div className="flex items-center justify-between px-4 py-3">
							<p className="text-xs text-muted-foreground">
								Showing {filteredStreams.length} of {operationalStreams.length}{" "}
								active streams
							</p>
							<div className="flex items-center gap-1">
								<button
									type="button"
									className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
								>
									<ChevronLeft aria-hidden className="size-4" />
								</button>
								<span className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
									1
								</span>
								<button
									type="button"
									className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
								>
									<ChevronRight aria-hidden className="size-4" />
								</button>
							</div>
						</div>
					</div>

					{/* ── Insight Card ── */}
					<div className="mt-4 flex items-start gap-4 rounded-xl border border-primary/10 bg-gradient-to-br from-primary/8 to-primary/3 p-5 shadow-sm backdrop-blur-sm">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
							<Sparkles aria-hidden className="size-4 text-primary" />
						</div>
						<div className="flex flex-col gap-1">
							<p className="text-sm font-semibold text-foreground">
								System Insight: Discovery Wizard
							</p>
							<p className="text-xs leading-relaxed text-muted-foreground">
								Based on your current volume of Spent Isopropyl Alcohol,
								we&apos;ve identified 3 potential solvent recovery facilities
								with active buy-orders within a 200-mile radius. Run the
								Discovery Wizard to generate offers.
							</p>
						</div>
						<Button
							variant="secondary"
							size="sm"
							className="shrink-0"
							onClick={discoveryWizard.open}
						>
							Run Discovery
							<ArrowUpRight
								data-icon="inline-end"
								aria-hidden
								className="size-3"
							/>
						</Button>
					</div>
				</TabsContent>

				{/* ── Tab: Drafts ── */}
				<TabsContent value="drafts" className="mt-6">
					<div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
						<div className="p-4">
							<h2 className="font-display text-xl font-semibold text-foreground">
								Pending Drafts
							</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Review and finalize these waste stream declarations before
								submission.
							</p>
						</div>

						<StreamsDraftsTable
							rows={filteredDrafts}
							onConfirm={handleConfirmDraft}
							highlightedId={highlightedDraftId}
						/>

						{/* Pagination Footer */}
						<div className="flex items-center justify-between px-4 py-3">
							<p className="text-xs text-muted-foreground">
								Showing {filteredDrafts.length} of {draftStreams.length} pending
								drafts
							</p>
							<div className="flex items-center gap-1">
								<button
									type="button"
									className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
								>
									<ChevronLeft aria-hidden className="size-4" />
								</button>
								<span className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
									1
								</span>
								<button
									type="button"
									className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
								>
									<ChevronRight aria-hidden className="size-4" />
								</button>
							</div>
						</div>
					</div>
				</TabsContent>

				{/* ── Tab: Missing Information ── */}
				<TabsContent value="missing-info" className="mt-6">
					<StreamsFollowUpBoard
						items={filteredFollowUps}
						selectedId={selectedFollowUpId}
						onSelect={setSelectedFollowUpId}
					/>
				</TabsContent>
			</Tabs>

			<StreamsDraftConfirmation
				draftItemRow={confirmTarget?.draftItemRow ?? null}
				editorState={confirmTarget?.editorState ?? null}
				onClose={() => {
					setConfirmTarget(null);
					void loadStreams();
				}}
			/>
		</div>
	);
}

/* ── KPI Card Component ── */
function KpiCard({
	label,
	value,
	badge,
	badgeType,
	subValue,
	hasAction,
	isPrimary,
}: {
	label: string;
	value: string | null;
	badge?: string;
	badgeType?: "success" | "destructive";
	subValue?: string;
	hasAction?: boolean;
	isPrimary?: boolean;
}) {
	return (
		<div className="rounded-xl bg-surface-container-lowest p-4 shadow-xs card-lift">
			<p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
				{label}
			</p>
			<div className="mt-1 flex items-baseline gap-2">
				{value === null ? (
					<span
						title="Data not yet available"
						className="font-display text-2xl font-bold text-muted-foreground"
					>
						—
					</span>
				) : (
					<span
						className={cn(
							"font-display text-2xl font-bold",
							isPrimary
								? "bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent"
								: "text-foreground",
						)}
					>
						{value}
					</span>
				)}
				{badge ? (
					<Badge
						variant="secondary"
						className={cn(
							"rounded-full border-0 text-[0.6rem]",
							badgeType === "success" && "bg-success/15 text-success",
							badgeType === "destructive" &&
								"bg-destructive/15 text-destructive",
						)}
					>
						{badge}
					</Badge>
				) : null}
				{subValue ? (
					<span className="text-xs text-muted-foreground">{subValue}</span>
				) : null}
				{hasAction ? (
					<ArrowUpRight aria-hidden className="ml-auto size-4 text-primary" />
				) : null}
			</div>
		</div>
	);
}
