"use client";

import {
	Activity,
	Building2,
	ChevronLeft,
	Edit3,
	Factory,
	Flag,
	Loader2,
	Mail,
	MapPin,
	Phone,
	Target,
	Users,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClientCreateBanner } from "@/components/features/clients/client-create-banner";
import { EditClientModal } from "@/components/features/modals/edit-client-modal";
import {
	mapEditorStateToDraftCandidate,
	rejectSingleDraftWithConfirmation,
	resolveOpenDraftState,
	type StreamsTab,
} from "@/components/features/streams/runtime-helpers";
import { StreamsAllTable } from "@/components/features/streams/streams-all-table";
import {
	type DraftEditorState,
	StreamsDraftsTable,
} from "@/components/features/streams/streams-drafts-table";
import { StreamsFollowUpBoard } from "@/components/features/streams/streams-follow-up-board";
import type { StreamRow } from "@/components/features/streams/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import { companiesAPI } from "@/lib/api/companies";
import { deriveOperationalInsights } from "@/lib/clients/operational-insights";
import { toDiscoveryNormalizedData } from "@/lib/discovery-confirmation-utils";
import type { ClientProfile } from "@/lib/mappers/company-client";
import { toClientProfile } from "@/lib/mappers/company-client";
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

export default function ClientDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const searchParams = useSearchParams();
	const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
	const createState = searchParams.get("create");

	const [profile, setProfile] = useState<ClientProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [activeStreamsTab, setActiveStreamsTab] = useState<StreamsTab>("all");
	const [highlightedDraftId, setHighlightedDraftId] = useState<string | null>(
		null,
	);
	const [confirmingDraftIds, setConfirmingDraftIds] = useState<Set<string>>(
		new Set(),
	);
	const [deletingDraftIds, setDeletingDraftIds] = useState<Set<string>>(
		new Set(),
	);
	const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(
		null,
	);

	const allStreams = useStreamsAll();
	const draftStreams = useStreamsDrafts();
	const missingInfoStreams = useStreamsMissingInfo();
	const draftRowsById = useStreamsDraftRowsById();
	const streamsLoading = useStreamsLoading();
	const streamsInitialized = useStreamsInitialized();
	const streamsError = useStreamsError();
	const { loadStreams } = useStreamsActions();

	const fetchProfile = useCallback(async () => {
		if (!companyId) return;
		try {
			setLoading(true);
			setError(null);

			const companyDetail = await companiesAPI.get(companyId);

			setProfile(toClientProfile(companyDetail));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load client");
		} finally {
			setLoading(false);
		}
	}, [companyId]);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	useEffect(() => {
		if (!streamsInitialized) {
			void loadStreams();
		}
	}, [loadStreams, streamsInitialized]);

	const primaryContact = profile?.primaryContact ?? null;
	const normalizedProfileName = profile?.name.trim().toLowerCase() ?? "";

	const matchesCurrentCompany = useCallback(
		(row: StreamRow) => {
			if (!companyId) {
				return false;
			}

			if (row.clientId) {
				return row.clientId === companyId;
			}

			return row.client.trim().toLowerCase() === normalizedProfileName;
		},
		[companyId, normalizedProfileName],
	);

	const companyAllStreams = useMemo(
		() => allStreams.filter(matchesCurrentCompany),
		[allStreams, matchesCurrentCompany],
	);
	const companyDraftStreams = useMemo(
		() => draftStreams.filter(matchesCurrentCompany),
		[draftStreams, matchesCurrentCompany],
	);
	const companyMissingInfoStreams = useMemo(
		() => missingInfoStreams.filter(matchesCurrentCompany),
		[missingInfoStreams, matchesCurrentCompany],
	);

	useEffect(() => {
		if (
			selectedFollowUpId &&
			!companyMissingInfoStreams.some((row) => row.id === selectedFollowUpId)
		) {
			setSelectedFollowUpId(null);
		}
	}, [companyMissingInfoStreams, selectedFollowUpId]);

	function handleOpenDraft(id: string) {
		const next = resolveOpenDraftState(id);
		setActiveStreamsTab(next.activeTab);
		setHighlightedDraftId(next.highlightedDraftId);
	}

	async function handleConfirmDraft(id: string, editorState: DraftEditorState) {
		const draft = draftRowsById[id];
		if (!draft) {
			return;
		}

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
					reviewNotes:
						"confirmed_via_client_detail; source=Client Detail Waste Streams",
				};

			if (editorState.locationId) {
				payload.locationResolution = {
					mode: "existing",
					locationId: editorState.locationId,
				};
			}

			await bulkImportAPI.decideDiscoveryDraft(draft.itemId, payload);
			toast.success("Draft confirmed and converted to waste stream");
			void loadStreams();
		} catch (confirmError) {
			toast.error(
				confirmError instanceof Error
					? confirmError.message
					: "Failed to confirm draft",
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
			reviewNotes:
				"rejected_via_client_detail; source=Client Detail Waste Streams",
			setDeletingDraftIds,
			clearHighlightedDraft: () => setHighlightedDraftId(null),
			refreshStreams: () => {
				void loadStreams();
			},
		});
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center gap-3 px-6 py-24">
				<Loader2 className="size-5 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Loading client…</p>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="flex flex-col items-center gap-3 px-6 py-24">
				<p className="text-sm text-destructive">
					{error ?? "Client not found"}
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push("/clients")}
				>
					Back to portfolio
				</Button>
			</div>
		);
	}

	const insights = deriveOperationalInsights({
		profile,
		companyAllStreams,
		companyDraftStreams,
		companyMissingInfoStreams,
	});

	const {
		totalTrackedStreams,
		activeStreamsCount,
		readyForOfferCount,
		missingInfoStreamsCount,
		draftStreamsCount,
		facilitiesWithProjects,
		facilityCoverage,
		dataCompleteness,
		accountStatus,
		realAlerts,
		nextSteps,
		accountNarrative,
		reviewAction,
	} = insights;

	return (
		<div className="flex flex-col gap-6">
			<ClientCreateBanner createState={createState} />

			<EditClientModal
				profile={profile}
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				onSaved={fetchProfile}
			/>

			{/* ── Header ── */}
			<section className="flex flex-col gap-4">
				{/* Breadcrumb */}
				<Button
					variant="ghost"
					size="sm"
					className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
					onClick={() => router.push("/clients")}
				>
					<ChevronLeft className="mr-1 h-4 w-4" />
					Clients
				</Button>

				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex flex-col gap-3">
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							{profile.name}
						</h1>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="muted" className="gap-1">
								<Factory className="h-3 w-3" />
								Industry: {profile.industry}
							</Badge>
							<Badge variant="muted">
								Company ID: {profile.id.slice(0, 8)}
							</Badge>
							<Badge variant={accountStatus.variant} className="rounded-full">
								{accountStatus.label}
							</Badge>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setEditModalOpen(true)}
						>
							<Edit3 className="mr-1.5 h-4 w-4" />
							Edit
						</Button>
						<Button variant="outline" size="sm">
							<MapPin className="mr-1.5 h-4 w-4" />
							Locations
						</Button>
						<Button size="sm">
							<Users className="mr-1.5 h-4 w-4" />
							Contacts
						</Button>
					</div>
				</div>
			</section>

			{/* ── KPI Stats Cards (4 columns) ── */}
			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="relative overflow-hidden">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Total Tracked Streams
							</p>
							<div className="rounded-lg bg-amber-100 p-1.5">
								<Activity className="h-4 w-4 text-amber-600" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-baseline gap-2">
							<p className="text-3xl font-bold tracking-tight">
								{totalTrackedStreams}
							</p>
							<Badge variant="muted" className="rounded-full text-xs">
								{draftStreamsCount} draft
								{draftStreamsCount === 1 ? "" : "s"}
							</Badge>
						</div>
					</CardContent>
				</Card>

				<MetricCard
					icon={Activity}
					label="Active Streams"
					value={activeStreamsCount}
					subtitle={`Across ${profile.locations.length} facilities`}
					variant="primary"
				/>

				<Card className="relative overflow-hidden">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Needs Follow-up
							</p>
							<div className="rounded-lg bg-emerald-100 p-1.5">
								<Flag className="h-4 w-4 text-emerald-600" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-baseline gap-2">
							<p className="text-3xl font-bold tracking-tight">
								{missingInfoStreamsCount}
							</p>
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{missingInfoStreamsCount === 0
								? "No stream follow-ups pending"
								: "Streams missing required details"}
						</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Ready for Offer
							</p>
							<div className="rounded-lg bg-cyan-100 p-1.5">
								<Target className="h-4 w-4 text-cyan-600" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<p className="text-3xl font-bold tracking-tight">
								{readyForOfferCount}
							</p>
							<Badge variant="muted" className="rounded-full text-xs">
								{facilityCoverage}% facility coverage
							</Badge>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* ── Three Column Insights Grid ── */}
			<section className="grid gap-4 lg:grid-cols-3">
				{/* Account Insights */}
				<Card className="flex flex-col">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="rounded-lg bg-primary/10 p-1.5">
								<Building2 className="h-4 w-4 text-primary" />
							</div>
							<CardTitle className="text-base font-semibold">
								Account Insights
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex-1 space-y-4">
						<p className="text-sm text-muted-foreground leading-relaxed">
							{accountNarrative}
						</p>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">Data Completeness</span>
								<span className="font-medium text-emerald-600">
									{dataCompleteness}%
								</span>
							</div>
							<Progress value={dataCompleteness} className="h-2" />
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<div>
									<span className="font-medium">Facility Coverage</span>
									<p className="text-xs text-muted-foreground">
										Facilities with linked projects
									</p>
								</div>
								<span className="text-sm font-medium text-primary">
									{facilitiesWithProjects}/{profile.locations.length}
								</span>
							</div>
							<Progress value={facilityCoverage} className="h-2" />
						</div>
					</CardContent>
				</Card>

				{/* Critical Alerts */}
				<Card className="flex flex-col border-l-4 border-l-amber-500">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="rounded-lg bg-amber-100 p-1.5">
								<Flag className="h-4 w-4 text-amber-600" />
							</div>
							<CardTitle className="text-base font-semibold">
								Critical Alerts
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex-1 space-y-3">
						{realAlerts.length === 0 ? (
							<div className="rounded-lg border p-3">
								<p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
									No critical blockers
								</p>
								<p className="text-xs leading-relaxed text-muted-foreground">
									Current account data shows no immediate action blockers.
								</p>
							</div>
						) : (
							realAlerts.map((alert) => (
								<div key={alert.id} className="space-y-1 rounded-lg border p-3">
									<p
										className={`text-xs font-semibold uppercase tracking-wide ${
											alert.tone === "critical"
												? "text-destructive"
												: "text-amber-600"
										}`}
									>
										{alert.title}
									</p>
									<p className="text-xs leading-relaxed text-muted-foreground">
										{alert.description}
									</p>
								</div>
							))
						)}
					</CardContent>
				</Card>

				{/* Strategic Next Steps */}
				<Card className="flex flex-col bg-teal-700 text-white border-teal-600">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="rounded-lg bg-teal-600 p-1.5">
								<Flag className="h-4 w-4 text-white" />
							</div>
							<CardTitle className="text-base font-semibold text-white">
								Strategic Next Steps
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex-1 flex flex-col">
						<ol className="space-y-3 flex-1">
							{(nextSteps.length > 0
								? nextSteps
								: [
										"Keep stream records current and continue regular account follow-up.",
									]
							).map((step, index) => (
								<li key={step} className="flex gap-3">
									<span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-medium">
										{index + 1}
									</span>
									<p className="text-sm leading-relaxed text-teal-50">{step}</p>
								</li>
							))}
						</ol>
						<Button
							variant="secondary"
							className="mt-4 w-full bg-white text-teal-700 hover:bg-teal-50"
							onClick={() => setActiveStreamsTab(reviewAction.tab)}
						>
							<Flag className="mr-1.5 h-4 w-4" />
							{reviewAction.label}
						</Button>
					</CardContent>
				</Card>
			</section>

			{/* ── Contact + Locations ── */}
			<section className="grid gap-4 lg:grid-cols-2">
				{/* Contact information */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base font-semibold">
							Primary Contact
						</CardTitle>
						<CardDescription>
							Main point of contact for this account
						</CardDescription>
					</CardHeader>
					<CardContent>
						{primaryContact ? (
							<div className="flex items-start gap-4">
								<Avatar className="h-10 w-10">
									<AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
										{primaryContact.name
											.split(" ")
											.map((part) => part[0])
											.join("")
											.slice(0, 2)
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="space-y-1">
									<p className="font-medium">{primaryContact.name}</p>
									{primaryContact.title && (
										<p className="text-sm text-muted-foreground">
											{primaryContact.title}
										</p>
									)}
									<div className="pt-2 space-y-1">
										{primaryContact.phone && (
											<p className="flex items-center gap-2 text-sm text-muted-foreground">
												<Phone className="h-3.5 w-3.5" />
												{primaryContact.phone}
											</p>
										)}
										{primaryContact.email && (
											<p className="flex items-center gap-2 text-sm text-muted-foreground">
												<Mail className="h-3.5 w-3.5" />
												{primaryContact.email}
											</p>
										)}
									</div>
								</div>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								No primary contact assigned. Edit the profile to assign one.
							</p>
						)}
					</CardContent>
				</Card>

				{/* Locations */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base font-semibold">Locations</CardTitle>
						<CardDescription>
							Registered facilities for this company
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{profile.locations.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No locations registered yet.
							</p>
						) : (
							profile.locations.slice(0, 3).map((location) => (
								<div
									key={location.id}
									className="flex items-start justify-between gap-3 rounded-lg border p-3"
								>
									<div className="min-w-0">
										<p className="font-medium text-sm">{location.name}</p>
										{location.address && (
											<p className="text-xs text-muted-foreground">
												{location.address}
											</p>
										)}
										<p className="text-xs text-muted-foreground">
											{location.city}, {location.state}
										</p>
									</div>
									<Badge
										variant="outline"
										className="rounded-full text-xs flex-shrink-0"
									>
										{location.projectCount} project
										{location.projectCount !== 1 ? "s" : ""}
									</Badge>
								</div>
							))
						)}
						{profile.locations.length > 3 && (
							<Button variant="ghost" size="sm" className="w-full">
								View all {profile.locations.length} locations
							</Button>
						)}
					</CardContent>
				</Card>
			</section>

			{/* ── Streams Table with Tabs ── */}
			<Card>
				<CardHeader className="pb-0">
					<div>
						<CardTitle className="text-base font-semibold">
							Waste Streams
						</CardTitle>
						<CardDescription>
							Live stream data for this account, synced with Waste Streams
							buckets.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="pt-6">
					{streamsLoading && !streamsInitialized ? (
						<div className="mb-4 flex items-center gap-2 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-muted-foreground">
							<Loader2 aria-hidden className="size-4 animate-spin" />
							Loading streams…
						</div>
					) : null}

					{streamsError ? (
						<div className="mb-4 rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive">
							{streamsError}
						</div>
					) : null}

					<Tabs
						value={activeStreamsTab}
						onValueChange={(value) => setActiveStreamsTab(value as StreamsTab)}
						className="w-full"
					>
						<TabsList className="mb-4 w-fit">
							<TabsTrigger value="all">
								All Streams ({companyAllStreams.length})
							</TabsTrigger>
							<TabsTrigger value="drafts">
								Drafts ({companyDraftStreams.length})
							</TabsTrigger>
							<TabsTrigger value="missing-info">
								Missing Information ({companyMissingInfoStreams.length})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="all" className="mt-0">
							{companyAllStreams.length === 0 ? (
								<div className="rounded-lg border border-dashed p-8 text-center">
									<p className="text-sm text-muted-foreground">
										No waste streams associated with this client yet.
									</p>
								</div>
							) : (
								<div className="overflow-hidden rounded-lg border border-border/40 bg-surface-container-lowest/50">
									<StreamsAllTable
										rows={companyAllStreams}
										onOpenDraft={handleOpenDraft}
									/>
								</div>
							)}
						</TabsContent>

						<TabsContent value="drafts" className="mt-0">
							{companyDraftStreams.length === 0 ? (
								<div className="rounded-lg border border-dashed p-8 text-center">
									<p className="text-sm text-muted-foreground">
										No drafts found for this client.
									</p>
								</div>
							) : (
								<div className="overflow-hidden rounded-lg border border-border/40 bg-surface-container-lowest/50">
									<StreamsDraftsTable
										rows={companyDraftStreams}
										onConfirm={handleConfirmDraft}
										onDelete={handleDeleteDraft}
										highlightedId={highlightedDraftId}
										confirmingIds={confirmingDraftIds}
										deletingIds={deletingDraftIds}
									/>
								</div>
							)}
						</TabsContent>

						<TabsContent value="missing-info" className="mt-0">
							{companyMissingInfoStreams.length === 0 ? (
								<div className="rounded-lg border border-dashed p-8 text-center">
									<p className="text-sm text-muted-foreground">
										No streams with missing information.
									</p>
								</div>
							) : (
								<StreamsFollowUpBoard
									items={companyMissingInfoStreams}
									selectedId={selectedFollowUpId}
									onSelect={setSelectedFollowUpId}
								/>
							)}
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}
