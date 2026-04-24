"use client";

import { BarChart3, FileUp, Filter, Plus, Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
	formatCurrency,
	stageOrder,
} from "@/components/features/offers/mock-data";
import type {
	OfferPipelineRecord,
	OfferStage,
} from "@/components/features/offers/types";
import { CompanyCombobox } from "@/components/features/shared/company-combobox";
import { LocationCombobox } from "@/components/features/shared/location-combobox";
import {
	EmptyState,
	FilterBar,
	KpiCard,
	PageHeader,
	PageShell,
	StatRail,
} from "@/components/patterns";
import {
	FadeIn,
	HoverLift,
} from "@/components/patterns/animations/motion-components";
import {
	Button,
	Card,
	CardContent,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
} from "@/components/ui";
import {
	type ManualOfferInitialStatus,
	type OfferPipelineResponseDTO,
	offersAPI,
} from "@/lib/api/offers";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useLocationStore } from "@/lib/stores/location-store";
import {
	invalidateClientDataCache,
	isClientDataCacheStale,
	peekClientDataCache,
	revalidateClientDataCache,
} from "@/lib/utils/client-data-cache";
import { getErrorMessage } from "@/lib/utils/logger";
import {
	createManualOfferAndRefreshPipeline,
	type ManualOfferFormErrors,
	type ManualOfferFormValues,
	mapPipelineResponseToOffers,
	OFFERS_PIPELINE_CACHE_KEY,
	validateManualOfferForm,
} from "./offers-page-utils";

const ACTIVE_STAGE_SET = new Set<OfferStage>([
	"requires_data",
	"proposal_ready",
	"offer_sent",
	"in_negotiation",
]);

const MANUAL_OFFER_INITIAL_STATUS_OPTIONS: Array<{
	value: ManualOfferInitialStatus;
	label: string;
}> = [
	{ value: "uploaded", label: "Offer started" },
	{ value: "waiting_to_send", label: "Ready to send" },
	{ value: "waiting_response", label: "Awaiting response" },
	{ value: "under_negotiation", label: "In negotiation" },
];

const DEFAULT_MANUAL_OFFER_FORM: ManualOfferFormValues = {
	companyId: "",
	locationId: "",
	title: "",
	initialStatus: "uploaded",
	file: null,
};

const OffersPipelineTable = dynamic(
	() =>
		import(
			"@/components/features/offers/components/offers-pipeline-table"
		).then((module) => module.OffersPipelineTable),
	{
		loading: () => (
			<div className="p-4">
				<Skeleton className="mb-3 h-10 w-full" />
				{Array.from({ length: 4 }).map((_, index) => (
					<Skeleton
						key={`offers-table-fallback-row-${index + 1}`}
						className="mb-2 h-12 w-full last:mb-0"
					/>
				))}
			</div>
		),
	},
);

const OffersStagePipeline = dynamic(
	() =>
		import(
			"@/components/features/offers/components/offers-stage-pipeline"
		).then((module) => module.OffersStagePipeline),
	{
		loading: () => (
			<section className="grid gap-3 lg:grid-cols-5">
				{Array.from({ length: 5 }).map((_, index) => (
					<Skeleton
						key={`offers-stage-fallback-${index + 1}`}
						className="h-44 w-full rounded-xl"
					/>
				))}
			</section>
		),
	},
);

function readCachedOffers(): OfferPipelineRecord[] {
	const cached = peekClientDataCache<OfferPipelineResponseDTO>(
		OFFERS_PIPELINE_CACHE_KEY,
	);
	if (!cached) return [];

	return mapPipelineResponseToOffers(cached.data);
}

export default function OffersPage() {
	const companies = useCompanyStore((state) => state.companies);
	const locations = useLocationStore((state) => state.locations);
	const [loading, setLoading] = useState(() => readCachedOffers().length === 0);
	const [error, setError] = useState<string | null>(null);
	const [offers, setOffers] = useState<OfferPipelineRecord[]>(() =>
		readCachedOffers(),
	);
	const [query, setQuery] = useState("");
	const [selectedStage, setSelectedStage] = useState<OfferStage | "all">("all");
	const [selectedClient, setSelectedClient] = useState<string>("all");
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [manualFormValues, setManualFormValues] =
		useState<ManualOfferFormValues>(DEFAULT_MANUAL_OFFER_FORM);
	const [manualFormErrors, setManualFormErrors] =
		useState<ManualOfferFormErrors>({});
	const [createFormError, setCreateFormError] = useState<string | null>(null);
	const [isCreatingOffer, setIsCreatingOffer] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const cachedOffers = readCachedOffers();
		const hasCachedOffers = cachedOffers.length > 0;
		if (hasCachedOffers) {
			setOffers(cachedOffers);
			setLoading(false);
			setError(null);
		}

		const shouldRefresh =
			!hasCachedOffers || isClientDataCacheStale(OFFERS_PIPELINE_CACHE_KEY);

		if (!shouldRefresh) {
			return () => {
				cancelled = true;
			};
		}

		if (!hasCachedOffers) {
			setLoading(true);
			setError(null);
		}

		void offersAPI
			.getPipeline()
			.then((response) => {
				if (cancelled) return;
				setOffers(mapPipelineResponseToOffers(response));
			})
			.catch((requestError) => {
				if (cancelled) return;
				if (!hasCachedOffers) {
					setError(
						getErrorMessage(
							requestError,
							"Could not load active Offers pipeline.",
						),
					);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const resetManualCreateState = () => {
		setManualFormValues(DEFAULT_MANUAL_OFFER_FORM);
		setManualFormErrors({});
		setCreateFormError(null);
	};

	const openManualCreateModal = () => {
		resetManualCreateState();
		setCreateModalOpen(true);
	};

	const closeManualCreateModal = () => {
		setCreateModalOpen(false);
	};

	const handleCreateManualOffer = async () => {
		const validationErrors = validateManualOfferForm(manualFormValues);
		setManualFormErrors(validationErrors);
		setCreateFormError(null);

		if (Object.keys(validationErrors).length > 0) {
			return;
		}

		if (!manualFormValues.file) {
			return;
		}

		setIsCreatingOffer(true);
		try {
			const refreshedOffers = await createManualOfferAndRefreshPipeline({
				values: manualFormValues,
				companies,
				locations,
				createManualOffer: offersAPI.createManualOffer,
				invalidateCache: invalidateClientDataCache,
				revalidatePipeline: () =>
					revalidateClientDataCache({
						key: OFFERS_PIPELINE_CACHE_KEY,
						ttlMs: 60_000,
						fetcher: () => offersAPI.getPipeline(),
					}),
			});
			setOffers(refreshedOffers);
			setCreateModalOpen(false);
			resetManualCreateState();
		} catch (createError) {
			setCreateFormError(
				getErrorMessage(createError, "Could not create manual Offer."),
			);
		} finally {
			setIsCreatingOffer(false);
		}
	};

	const clients = useMemo(
		() =>
			Array.from(new Set(offers.map((offer) => offer.clientName))).sort(
				(a, b) => a.localeCompare(b),
			),
		[offers],
	);

	const filteredOffers = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return offers.filter((offer) => {
			const matchesQuery =
				normalizedQuery.length === 0 ||
				offer.streamName.toLowerCase().includes(normalizedQuery) ||
				offer.clientName.toLowerCase().includes(normalizedQuery) ||
				offer.reference.toLowerCase().includes(normalizedQuery);

			const matchesStage =
				selectedStage === "all" || offer.stage === selectedStage;
			const matchesClient =
				selectedClient === "all" || offer.clientName === selectedClient;

			return (
				ACTIVE_STAGE_SET.has(offer.stage) &&
				matchesQuery &&
				matchesStage &&
				matchesClient
			);
		});
	}, [offers, query, selectedStage, selectedClient]);

	const selectedCompanyId = manualFormValues.companyId;

	const pipelineByStage = useMemo(
		() =>
			stageOrder
				.filter((stage) => ACTIVE_STAGE_SET.has(stage))
				.map((stage) => ({
					stage,
					offers: filteredOffers.filter((offer) => offer.stage === stage),
				})),
		[filteredOffers],
	);

	const { totalValue, inNegotiationCount, offerSentCount } = useMemo(() => {
		let total = 0;
		let inNegotiation = 0;
		let offerSent = 0;

		for (const offer of filteredOffers) {
			total += offer.valueUsd;
			if (offer.stage === "in_negotiation") inNegotiation += 1;
			if (offer.stage === "offer_sent") offerSent += 1;
		}

		return {
			totalValue: total,
			inNegotiationCount: inNegotiation,
			offerSentCount: offerSent,
		};
	}, [filteredOffers]);

	if (loading) {
		return (
			<PageShell>
				<Skeleton className="h-28 w-full rounded-2xl" />
				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton
							key={`offers-kpi-skeleton-${index + 1}`}
							className="h-28 w-full rounded-xl"
						/>
					))}
				</section>
				<section className="grid gap-3 lg:grid-cols-5">
					{Array.from({ length: 5 }).map((_, index) => (
						<Skeleton
							key={`offers-stage-skeleton-${index + 1}`}
							className="h-44 w-full rounded-xl"
						/>
					))}
				</section>
				<section className="rounded-xl border border-border/50 bg-surface-container-lowest p-4">
					<Skeleton className="mb-3 h-10 w-full" />
					{Array.from({ length: 5 }).map((_, index) => (
						<Skeleton
							key={`offers-table-skeleton-${index + 1}`}
							className="mb-2 h-12 w-full last:mb-0"
						/>
					))}
				</section>
			</PageShell>
		);
	}

	return (
		<PageShell gap="xl">
			<PageHeader
				title="Offers Pipeline"
				subtitle="Manage active commercial follow-up with real backend pipeline states."
				icon={BarChart3}
				badge="Offers"
				actions={
					<Button onClick={openManualCreateModal} className="gap-2">
						<Plus className="size-4" aria-hidden />
						Create Offer
					</Button>
				}
				breadcrumbs={[{ label: "Home", href: "/" }, { label: "Offers" }]}
				variant="hero"
			/>

			<Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Create manual Offer</DialogTitle>
						<DialogDescription>
							Track an externally-created Offer in this pipeline.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-1">
						<div className="grid gap-2">
							<Label htmlFor="manual-offer-client">Client</Label>
							<CompanyCombobox
								value={manualFormValues.companyId}
								onValueChange={(value) =>
									setManualFormValues((previous) => ({
										...previous,
										companyId: value,
										locationId:
											previous.companyId === value ? previous.locationId : "",
									}))
								}
								placeholder="Select client"
								portalled={false}
							/>
							{manualFormErrors.companyId ? (
								<p className="text-xs text-destructive">
									{manualFormErrors.companyId}
								</p>
							) : null}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="manual-offer-location">Location</Label>
							<LocationCombobox
								companyId={selectedCompanyId}
								value={manualFormValues.locationId}
								onValueChange={(value) =>
									setManualFormValues((previous) => ({
										...previous,
										locationId: value,
									}))
								}
								placeholder="Select location"
								portalled={false}
							/>
							{manualFormErrors.locationId ? (
								<p className="text-xs text-destructive">
									{manualFormErrors.locationId}
								</p>
							) : null}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="manual-offer-title">Offer title</Label>
							<Input
								id="manual-offer-title"
								value={manualFormValues.title}
								onChange={(event) =>
									setManualFormValues((previous) => ({
										...previous,
										title: event.target.value,
									}))
								}
								placeholder="Q2 Bale Contract"
								aria-invalid={manualFormErrors.title ? true : undefined}
							/>
							{manualFormErrors.title ? (
								<p className="text-xs text-destructive">
									{manualFormErrors.title}
								</p>
							) : null}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="manual-offer-status">Initial status</Label>
							<Select
								value={manualFormValues.initialStatus}
								onValueChange={(value) =>
									setManualFormValues((previous) => ({
										...previous,
										initialStatus: value as ManualOfferInitialStatus,
									}))
								}
							>
								<SelectTrigger id="manual-offer-status">
									<SelectValue placeholder="Select initial status" />
								</SelectTrigger>
								<SelectContent>
									{MANUAL_OFFER_INITIAL_STATUS_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="manual-offer-file">Offer document</Label>
							<Input
								id="manual-offer-file"
								type="file"
								accept=".pdf,.doc,.docx"
								onChange={(event) => {
									const selected = event.target.files?.[0] ?? null;
									setManualFormValues((previous) => ({
										...previous,
										file: selected,
									}));
								}}
								aria-invalid={manualFormErrors.file ? true : undefined}
							/>
							{manualFormValues.file ? (
								<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
									<FileUp className="size-3.5" aria-hidden />
									{manualFormValues.file.name}
								</p>
							) : null}
							{manualFormErrors.file ? (
								<p className="text-xs text-destructive">
									{manualFormErrors.file}
								</p>
							) : null}
						</div>

						{createFormError ? (
							<p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
								{createFormError}
							</p>
						) : null}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={closeManualCreateModal}
							disabled={isCreatingOffer}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateManualOffer}
							disabled={isCreatingOffer}
						>
							{isCreatingOffer ? "Creating…" : "Create Offer"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{error ? (
				<Card className="border-0 bg-destructive/5 shadow-xs">
					<CardContent className="py-4 text-sm text-destructive">
						{error}
					</CardContent>
				</Card>
			) : null}

			<StatRail columns={4}>
				<HoverLift>
					<KpiCard
						title="Total active offers"
						value={String(filteredOffers.length)}
						subtitle="Open commercial follow-up states"
						icon={BarChart3}
						variant="default"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Pipeline value"
						value={formatCurrency(totalValue)}
						subtitle="Selected latest commercial estimate"
						icon={Wallet}
						variant="accent"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="In negotiation"
						value={String(inNegotiationCount)}
						subtitle="Needs follow-up coordination"
						icon={Filter}
						variant="warning"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Offer sent"
						value={String(offerSentCount)}
						subtitle="Pending client response"
						icon={Filter}
						variant="success"
					/>
				</HoverLift>
			</StatRail>

			<FadeIn direction="up" delay={0.15}>
				<OffersStagePipeline stages={pipelineByStage} />
			</FadeIn>

			<FadeIn direction="up" delay={0.25}>
				<section className="overflow-hidden rounded-xl border border-border/50 bg-surface-container-lowest">
					<div className="border-b border-border/50 p-6 pb-5">
						<div className="mb-4 flex flex-col gap-1">
							<h2 className="font-display text-xl font-semibold text-foreground">
								Active offers
							</h2>
							<p className="text-sm text-muted-foreground">
								Search and filter by client and active stage.
							</p>
						</div>
						<FilterBar
							search={{
								value: query,
								onChange: setQuery,
								placeholder: "Search offers or streams",
							}}
							filters={[
								{
									key: "client",
									value: selectedClient,
									onChange: setSelectedClient,
									options: [
										{ value: "all", label: "All clients" },
										...clients.map((client) => ({
											value: client,
											label: client,
										})),
									],
									width: "w-[220px]",
								},
								{
									key: "stage",
									value: selectedStage,
									onChange: (value) =>
										setSelectedStage(value as OfferStage | "all"),
									options: [
										{ value: "all", label: "All stages" },
										{ value: "requires_data", label: "Offer started" },
										{ value: "proposal_ready", label: "Ready to send" },
										{ value: "offer_sent", label: "Offer sent" },
										{ value: "in_negotiation", label: "In negotiation" },
									],
									width: "w-[220px]",
								},
							]}
						/>
					</div>
					<div className="p-0">
						{filteredOffers.length > 0 ? (
							<OffersPipelineTable offers={filteredOffers} />
						) : (
							<div className="p-6">
								<EmptyState
									icon={BarChart3}
									title="No offers match your filters"
									description="Try another search term or reset stage/client filters."
									className="border-0 bg-transparent py-6"
								/>
							</div>
						)}
					</div>
				</section>
			</FadeIn>
		</PageShell>
	);
}
