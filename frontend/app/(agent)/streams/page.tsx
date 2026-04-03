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
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import {
	mapEditorStateToDraftCandidate,
	rejectSingleDraftWithConfirmation,
	resolveOpenDraftState,
	type StreamsTab,
	summarizeRejectAllDraftsResults,
} from "@/components/features/streams/runtime-helpers";
import { StreamsAllTable } from "@/components/features/streams/streams-all-table";
import {
	type DraftEditorState,
	StreamsDraftsTable,
} from "@/components/features/streams/streams-drafts-table";
import { StreamsFamilyHeader } from "@/components/features/streams/streams-family-header";
import { StreamsFollowUpBoard } from "@/components/features/streams/streams-follow-up-board";
import {
	useSharedStreamFilter,
	useStreamFilters,
} from "@/components/features/streams/use-stream-filters";
import { KpiCard } from "@/components/patterns";
import {
	FadeIn,
	HoverLift,
	Pressable,
	StaggerContainer,
	StaggerItem,
} from "@/components/patterns/animations/motion-components";
import {
	useStreamsActions,
	useStreamsAll,
	useStreamsDraftRowsById,
	useStreamsDrafts,
	useStreamsError,
	useStreamsInitialized,
	useStreamsLoading,
	useStreamsMissingInfo,
} from "@/lib/stores/streams-store";
import { computeWasteStreamsKpis } from "@/lib/utils/compute-waste-streams-kpis";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import { toDiscoveryNormalizedData } from "@/lib/discovery-confirmation-utils";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";

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
	const draftRowsById = useStreamsDraftRowsById();
	const loading = useStreamsLoading();
	const isInitialized = useStreamsInitialized();
	const error = useStreamsError();
	const { loadStreams } = useStreamsActions();
	const [activeTab, setActiveTab] = useState<StreamsTab>("all");
	const [confirmingDraftIds, setConfirmingDraftIds] = useState<Set<string>>(
		new Set(),
	);
	const [deletingDraftIds, setDeletingDraftIds] = useState<Set<string>>(
		new Set(),
	);
	const [deleteAllOpen, setDeleteAllOpen] = useState(false);
	const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");
	const [isDeletingAllDrafts, setIsDeletingAllDrafts] = useState(false);

	const [highlightedDraftId, setHighlightedDraftId] = useState<string | null>(
		null,
	);

	// ── Missing Information state ──
	const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(
		null,
	);

	// ── Computed data ──
	const operationalStreams = allStreams;
	const sharedFilters = useMemo(
		() => ({ search, clientFilter, statusFilter }),
		[search, clientFilter, statusFilter],
	);
	const includeStatusOption = useMemo(() => ({ includeStatus: true }), []);
	const excludeStatusOption = useMemo(() => ({ includeStatus: false }), []);

	const filteredStreams = useSharedStreamFilter(
		operationalStreams,
		sharedFilters,
		includeStatusOption,
	);
	const filteredDrafts = useSharedStreamFilter(
		draftStreams,
		sharedFilters,
		excludeStatusOption,
	);
	const filteredFollowUps = useSharedStreamFilter(
		missingInfoStreams,
		sharedFilters,
		excludeStatusOption,
	);

	// ── Derived KPIs ──
	const kpis = useMemo(() => computeWasteStreamsKpis(allStreams), [allStreams]);

	useEffect(() => {
		if (!isInitialized) {
			void loadStreams();
		}
	}, [isInitialized, loadStreams]);

	useEffect(() => {
		if (
			selectedFollowUpId &&
			!filteredFollowUps.some((row) => row.id === selectedFollowUpId)
		) {
			setSelectedFollowUpId(null);
		}
	}, [filteredFollowUps, selectedFollowUpId]);

	// ── Handlers ──
	async function handleConfirmDraft(id: string, editorState: DraftEditorState) {
		const draft = draftRowsById[id];
		if (!draft) {
			return;
		}

		// Inline confirmation — bypass modal and confirm directly via API
		setConfirmingDraftIds((prev) => new Set(prev).add(id));
		setHighlightedDraftId(null);

		try {
			const candidate = mapEditorStateToDraftCandidate(
				draft.itemId,
				draft.runId,
				editorState,
			);
			const payload: Parameters<typeof bulkImportAPI.decideDiscoveryDraft>[1] =
				{
					action: "confirm",
					normalizedData: toDiscoveryNormalizedData(candidate),
					reviewNotes: `confirmed_via_streams_page; source=Waste Streams Drafts`,
				};

			if (editorState.locationId) {
				payload.locationResolution = {
					mode: "existing",
					locationId: editorState.locationId,
				};
			}

			await bulkImportAPI.decideDiscoveryDraft(draft.itemId, payload);
			toast.success("Draft confirmed and converted to waste stream");
			// Auto-refresh the streams list
			void loadStreams();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to confirm draft",
			);
		} finally {
			setConfirmingDraftIds((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	}

	async function handleDeleteDraft(id: string) {
		await rejectSingleDraftWithConfirmation({
			draftId: id,
			draftRowsById,
			reviewNotes: "rejected_via_streams_page; source=Waste Streams Drafts",
			setDeletingDraftIds,
			clearHighlightedDraft: () => setHighlightedDraftId(null),
			refreshStreams: () => {
				void loadStreams();
			},
		});
	}

	async function handleDeleteAllDrafts() {
		if (isDeletingAllDrafts || draftStreams.length === 0) {
			return;
		}

		setIsDeletingAllDrafts(true);
		const currentDraftRows = draftStreams
			.map((row) => draftRowsById[row.id])
			.filter((row): row is NonNullable<typeof row> => Boolean(row));
		const draftIds = currentDraftRows.map((row) => row.itemId);
		setDeletingDraftIds(new Set(draftIds));

		try {
			const outcomes = await Promise.allSettled(
				currentDraftRows.map((row) =>
					bulkImportAPI.decideDiscoveryDraft(row.itemId, {
						action: "reject",
						reviewNotes:
							"rejected_via_streams_page_bulk; source=Waste Streams Drafts",
					}),
				),
			);
			const summary = summarizeRejectAllDraftsResults(outcomes);

			if (summary.failed === 0) {
				toast.success(`Deleted ${summary.rejected} draft(s)`);
			} else {
				toast.error(
					`Deleted ${summary.rejected} of ${summary.total} drafts. ${summary.failed} failed.`,
				);
			}
			void loadStreams();
		} finally {
			setIsDeletingAllDrafts(false);
			setDeleteAllConfirmation("");
			setDeleteAllOpen(false);
			setDeletingDraftIds(new Set());
		}
	}

	function handleOpenDraft(id: string) {
		const next = resolveOpenDraftState(id);
		setActiveTab(next.activeTab);
		setHighlightedDraftId(next.highlightedDraftId);
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

			{/* KPI rail — page-level, tab-invariant with 2026 Animations */}
			<section className="rounded-2xl bg-surface-container-low/60 p-5">
				<StaggerContainer
					staggerDelay={0.08}
					className="grid grid-cols-2 gap-4 lg:grid-cols-4"
				>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								label="Active Streams"
								value={formatKpi(kpis.activeStreams)}
								isPrimary
							/>
						</HoverLift>
					</StaggerItem>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								label="Critical Alerts"
								value={formatKpi(kpis.criticalAlerts)}
								badge="Action Needed"
								badgeType="destructive"
							/>
						</HoverLift>
					</StaggerItem>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								label="Monthly Volume"
								value={formatKpi(kpis.monthlyVolume)}
								{...(kpis.monthlyVolume !== null
									? { subValue: "Gallons" }
									: {})}
							/>
						</HoverLift>
					</StaggerItem>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								label="Open Offers"
								value={formatKpi(kpis.openOffers)}
								hasAction
							/>
						</HoverLift>
					</StaggerItem>
				</StaggerContainer>
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

			{/* ── Unified tabs with 2026 Animations ── */}
			<FadeIn direction="up" delay={0.15}>
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
								<Pressable>
									<Button variant="ghost" size="sm">
										<Filter data-icon="inline-start" aria-hidden />
									</Button>
								</Pressable>
								<Pressable>
									<Button variant="ghost" size="sm">
										<Download data-icon="inline-start" aria-hidden />
									</Button>
								</Pressable>
							</div>
						)}
					</div>

					{/* ── Tab: All Active ── */}
					<TabsContent value="all" className="mt-6">
						<div className="overflow-hidden rounded-xl border border-border/40 bg-surface-container-lowest/50 backdrop-blur-sm">
							{/* Search / Filters */}
							{activeTab === "all" && (
								<div className="grid gap-3 border-b border-border/40 bg-surface-container/30 p-4 lg:grid-cols-[1.4fr_repeat(2,minmax(0,1fr))]">
									<div className="relative">
										<Search
											aria-hidden
											className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
										/>
										<Input
											value={search}
											onChange={(event) => setSearch(event.target.value)}
											placeholder="Search stream, client, waste type"
											className="border-border/40 bg-surface-container-lowest pl-9 transition-colors focus:bg-surface"
										/>
									</div>

									<Select value={clientFilter} onValueChange={setClientFilter}>
										<SelectTrigger className="border-border/40 bg-surface-container-lowest">
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
										<SelectTrigger className="border-border/40 bg-surface-container-lowest">
											<SelectValue placeholder="Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="all">All statuses</SelectItem>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="draft">Draft</SelectItem>
												<SelectItem value="missing_info">
													Missing info
												</SelectItem>
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
							<div className="flex items-center justify-between border-t border-border/40 bg-surface-container/30 px-4 py-3">
								<p className="text-xs text-secondary">
									Showing{" "}
									<span className="font-medium text-foreground">
										{filteredStreams.length}
									</span>{" "}
									of{" "}
									<span className="font-medium text-foreground">
										{operationalStreams.length}
									</span>{" "}
									active streams
								</p>
								<div className="flex items-center gap-1">
									<button
										type="button"
										className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-surface-container hover:text-foreground disabled:opacity-50"
									>
										<ChevronLeft aria-hidden className="size-4" />
									</button>
									<span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
										1
									</span>
									<button
										type="button"
										className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-surface-container hover:text-foreground disabled:opacity-50"
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
							<Pressable>
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
							</Pressable>
						</div>
					</TabsContent>

					{/* ── Tab: Drafts ── */}
					<TabsContent value="drafts" className="mt-6">
						<div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
							<div className="flex items-start justify-between gap-4 p-4">
								<div>
									<h2 className="font-display text-xl font-semibold text-foreground">
										Pending Drafts
									</h2>
									<p className="mt-1 text-sm text-muted-foreground">
										Review and finalize these waste stream declarations before
										submission.
									</p>
								</div>

								<AlertDialog
									open={deleteAllOpen}
									onOpenChange={setDeleteAllOpen}
								>
									<Pressable>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => setDeleteAllOpen(true)}
											disabled={
												draftStreams.length === 0 || isDeletingAllDrafts
											}
										>
											{isDeletingAllDrafts ? (
												<Loader2 className="mr-1.5 size-4 animate-spin" />
											) : (
												<Trash2 className="mr-1.5 size-4" />
											)}
											Delete All Drafts
										</Button>
									</Pressable>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												Delete all pending drafts?
											</AlertDialogTitle>
											<AlertDialogDescription>
												This will reject <strong>{draftStreams.length}</strong>{" "}
												draft
												{draftStreams.length === 1 ? "" : "s"}. This action
												cannot be undone. Type <strong>DELETE</strong> to
												confirm.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<Input
											value={deleteAllConfirmation}
											onChange={(event) =>
												setDeleteAllConfirmation(event.target.value)
											}
											placeholder="Type DELETE"
											className="mt-2"
										/>
										<AlertDialogFooter>
											<AlertDialogCancel disabled={isDeletingAllDrafts}>
												Cancel
											</AlertDialogCancel>
											<AlertDialogAction
												onClick={(event) => {
													event.preventDefault();
													if (deleteAllConfirmation !== "DELETE") {
														toast.error("Type DELETE to confirm this action");
														return;
													}
													void handleDeleteAllDrafts();
												}}
												disabled={
													isDeletingAllDrafts ||
													deleteAllConfirmation !== "DELETE"
												}
											>
												{isDeletingAllDrafts
													? "Deleting..."
													: "Delete all drafts"}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>

							<StreamsDraftsTable
								rows={filteredDrafts}
								onConfirm={handleConfirmDraft}
								onDelete={handleDeleteDraft}
								highlightedId={highlightedDraftId}
								confirmingIds={confirmingDraftIds}
								deletingIds={deletingDraftIds}
								disableActions={isDeletingAllDrafts}
							/>

							{/* Pagination Footer */}
							<div className="flex items-center justify-between px-4 py-3">
								<p className="text-xs text-muted-foreground">
									Showing {filteredDrafts.length} of {draftStreams.length}{" "}
									pending drafts
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
			</FadeIn>
		</div>
	);
}
