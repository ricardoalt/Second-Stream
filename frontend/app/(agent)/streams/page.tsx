"use client";

import {
	AlertCircle,
	ArrowUpRight,
	Download,
	Filter,
	Loader2,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import {
	rejectSingleDraftWithConfirmation,
	resolveOpenDraftState,
	type StreamsTab,
	summarizeRejectAllDraftsResults,
} from "@/components/features/streams/runtime-helpers";
import { StreamsAllTable } from "@/components/features/streams/streams-all-table";
import { StreamsDraftConfirmation } from "@/components/features/streams/streams-draft-confirmation";
import {
	type DraftEditorState,
	StreamsDraftsTable,
} from "@/components/features/streams/streams-drafts-table";
import { StreamsFollowUpBoard } from "@/components/features/streams/streams-follow-up-board";
import {
	useSharedStreamFilter,
	useStreamFilters,
} from "@/components/features/streams/use-stream-filters";
import {
	EmptyState,
	FadeIn,
	FilterBar,
	HoverLift,
	KpiCard,
	PageHeader,
	PageShell,
	Pressable,
	StatRail,
	TablePagination,
} from "@/components/patterns";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const STATUS_OPTIONS = [
	{ value: "all", label: "All statuses" },
	{ value: "active", label: "Active" },
	{ value: "draft", label: "Draft" },
	{ value: "missing_info", label: "Missing info" },
	{ value: "blocked", label: "Blocked" },
	{ value: "ready_for_offer", label: "Ready for offer" },
];

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
	const [deletingDraftIds, setDeletingDraftIds] = useState<Set<string>>(
		new Set(),
	);
	const [deleteAllOpen, setDeleteAllOpen] = useState(false);
	const [deleteAllConfirmation, setDeleteAllConfirmation] = useState("");
	const [isDeletingAllDrafts, setIsDeletingAllDrafts] = useState(false);
	const [highlightedDraftId, setHighlightedDraftId] = useState<string | null>(
		null,
	);
	const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(
		null,
	);
	const [draftReviewState, setDraftReviewState] = useState<{
		id: string;
		editorState: DraftEditorState;
	} | null>(null);

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

	const kpis = useMemo(() => computeWasteStreamsKpis(allStreams), [allStreams]);

	const clientOptions = useMemo(
		() => [
			{ value: "all", label: "All clients" },
			...[...new Set(operationalStreams.map((s) => s.client))].map(
				(client) => ({ value: client, label: client }),
			),
		],
		[operationalStreams],
	);

	const activeFilterCount =
		(search.trim() ? 1 : 0) +
		(clientFilter !== "all" ? 1 : 0) +
		(statusFilter !== "all" ? 1 : 0);

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

	function handleReviewDraft(id: string, editorState: DraftEditorState) {
		setHighlightedDraftId(null);
		setDraftReviewState({ id, editorState });
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
		if (isDeletingAllDrafts || draftStreams.length === 0) return;

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

	const selectedDraftItemRow = draftReviewState
		? (draftRowsById[draftReviewState.id] ?? null)
		: null;

	function formatKpi(value: number | null): string | null {
		if (value === null) return null;
		return String(value);
	}

	return (
		<PageShell gap="lg">
			<StreamsDraftConfirmation
				draftItemRow={selectedDraftItemRow}
				editorState={draftReviewState?.editorState ?? null}
				onClose={() => setDraftReviewState(null)}
				onConfirmed={() => {
					toast.success("Draft confirmed and converted to waste stream");
					void loadStreams();
				}}
			/>

			<PageHeader
				title="Waste Stream Management"
				subtitle="Track, validate, and propose disposal routes for active industrial byproduct flows."
				badge="Waste Streams"
				variant="hero"
			/>

			<StatRail columns={4}>
				<HoverLift>
					<KpiCard
						title="Active Streams"
						value={formatKpi(kpis.activeStreams)}
						variant="accent"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Critical Alerts"
						value={formatKpi(kpis.criticalAlerts)}
						variant="destructive"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Monthly Volume"
						value={formatKpi(kpis.monthlyVolume)}
						{...(kpis.monthlyVolume !== null ? { subtitle: "Gallons" } : {})}
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard title="Open Offers" value={formatKpi(kpis.openOffers)} />
				</HoverLift>
			</StatRail>

			{/* Shared filters — apply across all tabs */}
			<FilterBar
				search={{
					value: search,
					onChange: setSearch,
					placeholder: "Search stream, client, waste type…",
				}}
				filters={[
					{
						key: "client",
						placeholder: "All clients",
						value: clientFilter,
						onChange: setClientFilter,
						options: clientOptions,
						width: "w-[180px]",
					},
					{
						key: "status",
						placeholder: "All statuses",
						value: statusFilter,
						onChange: setStatusFilter,
						options: STATUS_OPTIONS,
						width: "w-[160px]",
					},
				]}
				activeFilterCount={activeFilterCount}
				onClear={() => {
					setSearch("");
					setClientFilter("all");
					setStatusFilter("all");
				}}
			/>

			{loading && !isInitialized ? (
				<div className="overflow-hidden rounded-xl border border-border/60 bg-surface-container-lowest p-4">
					<div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 aria-hidden className="size-4 animate-spin" />
						Loading streams…
					</div>
					<div className="flex flex-col gap-2">
						<Skeleton className="h-10 w-full" />
						{Array.from({ length: 4 }).map((_, index) => (
							<Skeleton
								key={`streams-loading-row-${index + 1}`}
								className="h-14 w-full"
							/>
						))}
					</div>
				</div>
			) : null}

			{error ? (
				<Card className="border-0 bg-destructive/5 shadow-xs">
					<CardContent className="flex items-center gap-3 py-3">
						<AlertCircle
							aria-hidden
							className="size-4 shrink-0 text-destructive"
						/>
						<p className="text-sm text-destructive">{error}</p>
					</CardContent>
				</Card>
			) : null}

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
					<TabsContent
						value="all"
						className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-surface-container-lowest"
					>
						{filteredStreams.length > 0 ? (
							<StreamsAllTable
								rows={filteredStreams}
								onOpenDraft={handleOpenDraft}
							/>
						) : (
							<div className="p-6">
								<EmptyState
									icon={Filter}
									title="No streams found"
									description="Try adjusting your filters or search term."
									action={
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setSearch("");
												setClientFilter("all");
												setStatusFilter("all");
											}}
										>
											Clear filters
										</Button>
									}
									className="border-0 bg-transparent py-6"
								/>
							</div>
						)}

						<TablePagination
							total={operationalStreams.length}
							showing={filteredStreams.length}
							page={1}
							pageCount={1}
							onPrevious={() => {}}
							onNext={() => {}}
							itemLabel="active streams"
						/>

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
					<TabsContent
						value="drafts"
						className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-surface-container-lowest"
					>
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

							<AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
								<Pressable>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => setDeleteAllOpen(true)}
										disabled={draftStreams.length === 0 || isDeletingAllDrafts}
									>
										{isDeletingAllDrafts ? (
											<Loader2
												data-icon="inline-start"
												aria-hidden
												className="animate-spin"
											/>
										) : (
											<Trash2 data-icon="inline-start" aria-hidden />
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
											{draftStreams.length === 1 ? "" : "s"}. This action cannot
											be undone. Type <strong>DELETE</strong> to confirm.
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

						{filteredDrafts.length > 0 ? (
							<StreamsDraftsTable
								rows={filteredDrafts}
								onReview={handleReviewDraft}
								onDelete={handleDeleteDraft}
								highlightedId={highlightedDraftId}
								deletingIds={deletingDraftIds}
								disableActions={isDeletingAllDrafts}
							/>
						) : (
							<div className="p-6">
								<EmptyState
									icon={Trash2}
									title="No drafts pending review"
									description="Incoming drafts will appear here for validation."
									className="border-0 bg-transparent py-6"
								/>
							</div>
						)}

						<TablePagination
							total={draftStreams.length}
							showing={filteredDrafts.length}
							page={1}
							pageCount={1}
							onPrevious={() => {}}
							onNext={() => {}}
							itemLabel="pending drafts"
						/>
					</TabsContent>

					{/* ── Tab: Missing Information ── */}
					<TabsContent
						value="missing-info"
						className="mt-6 rounded-xl border border-border/60 bg-surface-container-lowest p-4"
					>
						<StreamsFollowUpBoard
							items={filteredFollowUps}
							selectedId={selectedFollowUpId}
							onSelect={setSelectedFollowUpId}
						/>
					</TabsContent>
				</Tabs>
			</FadeIn>
		</PageShell>
	);
}
