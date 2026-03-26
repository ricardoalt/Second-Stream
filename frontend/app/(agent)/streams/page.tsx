"use client";

import {
	AlertTriangle,
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Download,
	Filter,
	PlusCircle,
	Search,
	Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import {
	allStreams,
	getDraftStreams,
	getMissingInfoStreams,
} from "@/components/features/streams/mock-data";
import { StreamsAllTable } from "@/components/features/streams/streams-all-table";
import { StreamsDraftsTable } from "@/components/features/streams/streams-drafts-table";
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
import { cn } from "@/lib/utils";

type StreamsTab = "all" | "drafts" | "missing-info";

export default function AgentStreamsPage() {
	const discoveryWizard = useDiscoveryWizard();
	const {
		search,
		clientFilter,
		phaseFilter,
		statusFilter,
		setSearch,
		setClientFilter,
		setPhaseFilter,
		setStatusFilter,
	} = useStreamFilters();
	const [activeTab, setActiveTab] = useState<StreamsTab>("all");

	// ── Draft state ──
	const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
	const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

	// ── Missing Info state ──
	const [addressedIds, setAddressedIds] = useState<Set<string>>(new Set());

	// ── Computed data ──
	const allDrafts = getDraftStreams();
	const allMissingInfo = getMissingInfoStreams();

	const filteredStreams = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		return allStreams.filter((row) => {
			const matchSearch =
				normalizedSearch.length === 0 ||
				row.name.toLowerCase().includes(normalizedSearch) ||
				row.client.toLowerCase().includes(normalizedSearch) ||
				row.wasteType.toLowerCase().includes(normalizedSearch);

			const matchClient = clientFilter === "all" || row.client === clientFilter;
			const matchPhase =
				phaseFilter === "all" || String(row.phase) === phaseFilter;
			const matchStatus = statusFilter === "all" || row.status === statusFilter;

			return matchSearch && matchClient && matchPhase && matchStatus;
		});
	}, [clientFilter, phaseFilter, search, statusFilter]);

	const filteredDrafts = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		return allDrafts
			.filter((row) => !confirmedIds.has(row.id) && !deletedIds.has(row.id))
			.filter((row) => {
				const matchSearch =
					normalizedSearch.length === 0 ||
					row.name.toLowerCase().includes(normalizedSearch) ||
					row.client.toLowerCase().includes(normalizedSearch) ||
					row.wasteType.toLowerCase().includes(normalizedSearch);

				const matchClient =
					clientFilter === "all" || row.client === clientFilter;
				const matchPhase =
					phaseFilter === "all" || String(row.phase) === phaseFilter;

				return matchSearch && matchClient && matchPhase;
			});
	}, [clientFilter, phaseFilter, search, confirmedIds, deletedIds, allDrafts]);

	const filteredFollowUps = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		return allMissingInfo
			.filter((row) => !addressedIds.has(row.id))
			.filter((row) => {
				const matchSearch =
					normalizedSearch.length === 0 ||
					row.name.toLowerCase().includes(normalizedSearch) ||
					row.client.toLowerCase().includes(normalizedSearch) ||
					row.wasteType.toLowerCase().includes(normalizedSearch);

				const matchClient =
					clientFilter === "all" || row.client === clientFilter;
				const matchPhase =
					phaseFilter === "all" || String(row.phase) === phaseFilter;

				return matchSearch && matchClient && matchPhase;
			});
	}, [clientFilter, phaseFilter, search, addressedIds, allMissingInfo]);

	// ── Derived KPIs ──
	const criticalAlerts = allStreams.filter(
		(s) => s.status === "missing_info" || s.status === "blocked",
	).length;
	const openOffers = allStreams.filter(
		(s) => s.status === "ready_for_offer",
	).length;

	// ── Handlers ──
	function handleConfirmDraft(id: string) {
		setConfirmedIds((prev) => new Set([...prev, id]));
	}

	function handleDeleteDraft(id: string) {
		setDeletedIds((prev) => new Set([...prev, id]));
	}

	function handleMarkAddressed(id: string) {
		setAddressedIds((prev) => new Set([...prev, id]));
	}

	return (
		<div className="flex flex-col gap-6">
			<StreamsFamilyHeader
				breadcrumb="Waste Streams"
				title="Waste Stream Management"
				subtitle="Track, validate, and propose disposal routes for active industrial byproduct flows."
				actions={
					<>
						<Button variant="secondary" onClick={discoveryWizard.open}>
							<PlusCircle data-icon="inline-start" aria-hidden />
							New stream
						</Button>
						<Button onClick={discoveryWizard.open}>
							<Sparkles data-icon="inline-start" aria-hidden />
							New Discovery
						</Button>
					</>
				}
			/>

			{/* ── KPI Row ── */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<KpiCard
					label="Active Streams"
					value={String(allStreams.length)}
					badge="+4%"
					badgeType="success"
				/>
				<KpiCard
					label="Critical Alerts"
					value={String(criticalAlerts)}
					badge="Action Needed"
					badgeType="destructive"
				/>
				<KpiCard label="Monthly Volume" value="42.5k" subValue="Gallons" />
				<KpiCard label="Open Offers" value={String(openOffers)} hasAction />
			</div>

			{/* ── Unified tabs ── */}
			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as StreamsTab)}
			>
				<div className="flex items-center justify-between gap-4">
					<TabsList className="bg-surface-container-lowest">
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
				<TabsContent value="all" className="mt-4">
					<div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
						{/* Search / Filters */}
						{activeTab === "all" && (
							<div className="grid gap-3 border-b border-outline-variant/20 p-4 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
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
												...new Set(allStreams.map((stream) => stream.client)),
											].map((client) => (
												<SelectItem key={client} value={client}>
													{client}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>

								<Select value={phaseFilter} onValueChange={setPhaseFilter}>
									<SelectTrigger>
										<SelectValue placeholder="Phase" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="all">All phases</SelectItem>
											<SelectItem value="1">Phase 1</SelectItem>
											<SelectItem value="2">Phase 2</SelectItem>
											<SelectItem value="3">Phase 3</SelectItem>
											<SelectItem value="4">Phase 4</SelectItem>
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
							<StreamsAllTable rows={filteredStreams} />
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
											setPhaseFilter("all");
											setStatusFilter("all");
										},
									}}
								/>
							</div>
						)}

						{/* Pagination Footer */}
						<div className="flex items-center justify-between border-t border-outline-variant/20 px-4 py-3">
							<p className="text-xs text-muted-foreground">
								Showing {filteredStreams.length} of {allStreams.length} active
								streams
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
					<div className="mt-4 flex items-start gap-4 rounded-xl bg-primary/8 p-4">
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
								Discovery Wizard to generate proposals.
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
				<TabsContent value="drafts" className="mt-4">
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
							onDelete={handleDeleteDraft}
						/>

						{/* Pagination Footer */}
						<div className="flex items-center justify-between border-t border-outline-variant/20 px-4 py-3">
							<p className="text-xs text-muted-foreground">
								Showing {filteredDrafts.length} of {allDrafts.length} pending
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
				<TabsContent value="missing-info" className="mt-4">
					<StreamsFollowUpBoard
						items={filteredFollowUps}
						onMarkAddressed={handleMarkAddressed}
					/>
				</TabsContent>
			</Tabs>
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
}: {
	label: string;
	value: string;
	badge?: string;
	badgeType?: "success" | "destructive";
	subValue?: string;
	hasAction?: boolean;
}) {
	return (
		<div className="rounded-xl bg-surface-container-lowest p-4 shadow-xs">
			<p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
				{label}
			</p>
			<div className="mt-1 flex items-baseline gap-2">
				<span className="font-display text-2xl font-bold text-foreground">
					{value}
				</span>
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
