"use client";

import { BarChart3, Filter, Wallet } from "lucide-react";
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
import { mapProjectFollowUpToOfferStage } from "@/components/features/offers/utils";
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
import { Card, CardContent, Skeleton } from "@/components/ui";
import { type OfferPipelineResponseDTO, offersAPI } from "@/lib/api/offers";
import {
	isClientDataCacheStale,
	peekClientDataCache,
} from "@/lib/utils/client-data-cache";
import { getErrorMessage } from "@/lib/utils/logger";

// ═══════════════════════════════════════════════════════════
// NEW: Design System Patterns
// ════════════════════════════════════════════════════════════

const ACTIVE_STAGE_SET = new Set<OfferStage>([
	"requires_data",
	"proposal_ready",
	"offer_sent",
	"in_negotiation",
]);

const OFFERS_PIPELINE_CACHE_KEY = "offers:pipeline";

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

function mapPipelineResponseToOffers(
	response: OfferPipelineResponseDTO,
): OfferPipelineRecord[] {
	return response.items.map((item) => ({
		projectId: item.projectId,
		reference: item.latestProposalVersion ?? "No version",
		clientName: item.companyLabel ?? "Unknown client",
		streamName: item.streamName,
		stage: mapProjectFollowUpToOfferStage(item.proposalFollowUpState),
		valueUsd: item.valueUsd ?? 0,
		updatedAt: formatDate(item.lastActivityAt),
	}));
}

function readCachedOffers(): OfferPipelineRecord[] {
	const cached = peekClientDataCache<OfferPipelineResponseDTO>(
		OFFERS_PIPELINE_CACHE_KEY,
	);
	if (!cached) return [];

	return mapPipelineResponseToOffers(cached.data);
}

function formatDate(value: string) {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return "N/A";
	}
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(parsed);
}

export default function OffersPage() {
	const [loading, setLoading] = useState(() => readCachedOffers().length === 0);
	const [error, setError] = useState<string | null>(null);
	const [offers, setOffers] = useState<OfferPipelineRecord[]>(() =>
		readCachedOffers(),
	);
	const [query, setQuery] = useState("");
	const [selectedStage, setSelectedStage] = useState<OfferStage | "all">("all");
	const [selectedClient, setSelectedClient] = useState<string>("all");

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
				breadcrumbs={[{ label: "Home", href: "/" }, { label: "Offers" }]}
				variant="hero"
			/>

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
