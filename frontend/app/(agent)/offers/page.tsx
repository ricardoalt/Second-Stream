"use client";

import { BarChart3, Filter, Search, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OffersPipelineTable } from "@/components/features/offers/components/offers-pipeline-table";
import { OffersStagePipeline } from "@/components/features/offers/components/offers-stage-pipeline";
import {
	formatCurrency,
	stageOrder,
} from "@/components/features/offers/mock-data";
import type {
	OfferPipelineRecord,
	OfferStage,
} from "@/components/features/offers/types";
import { mapProjectFollowUpToOfferStage } from "@/components/features/offers/utils";
import { EmptyState, KpiCard, PageHeader } from "@/components/patterns";
import {
	FadeIn,
	HoverLift,
	StaggerContainer,
	StaggerItem,
} from "@/components/patterns/animations/motion-components";
import {
	Card,
	CardContent,
	Input,
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
} from "@/components/ui";
import { offersAPI } from "@/lib/api/offers";
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
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [offers, setOffers] = useState<OfferPipelineRecord[]>([]);
	const [query, setQuery] = useState("");
	const [selectedStage, setSelectedStage] = useState<OfferStage | "all">("all");
	const [selectedClient, setSelectedClient] = useState<string>("all");

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		void offersAPI
			.getPipeline()
			.then((response) => {
				if (cancelled) return;
				setOffers(
					response.items.map((item) => ({
						projectId: item.projectId,
						reference: item.latestProposalVersion ?? "No version",
						clientName: item.companyLabel ?? "Unknown client",
						streamName: item.streamName,
						stage: mapProjectFollowUpToOfferStage(item.proposalFollowUpState),
						valueUsd: item.valueUsd ?? 0,
						updatedAt: formatDate(item.lastActivityAt),
					})),
				);
			})
			.catch((requestError) => {
				if (cancelled) return;
				setError(
					getErrorMessage(
						requestError,
						"Could not load active Offers pipeline.",
					),
				);
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

	const filteredOffers = useMemo(
		() =>
			offers.filter((offer) => {
				const matchesQuery =
					offer.streamName.toLowerCase().includes(query.toLowerCase()) ||
					offer.clientName.toLowerCase().includes(query.toLowerCase()) ||
					offer.reference.toLowerCase().includes(query.toLowerCase());

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
			}),
		[offers, query, selectedStage, selectedClient],
	);

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

	const totalValue = filteredOffers.reduce(
		(sum, offer) => sum + offer.valueUsd,
		0,
	);

	if (loading) {
		return (
			<div className="flex flex-col gap-6">
				<section className="overflow-hidden rounded-2xl border border-border/50 bg-surface-container-lowest p-6">
					<Skeleton className="h-6 w-56" />
					<Skeleton className="mt-3 h-4 w-96" />
				</section>
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
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-10">
			<section className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-xs">
				<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-container" />
				<PageHeader
					title="Offers Pipeline"
					subtitle="Manage active commercial follow-up with real backend pipeline states."
					icon={BarChart3}
					badge="Offers"
					breadcrumbs={[{ label: "Home", href: "/" }, { label: "Offers" }]}
				/>
			</section>

			{error ? (
				<Card className="border-0 bg-destructive/5 shadow-xs">
					<CardContent className="py-4 text-sm text-destructive">
						{error}
					</CardContent>
				</Card>
			) : null}

			{/* KPI Cards with 2026 Animations */}
			<section className="rounded-2xl bg-surface-container-low/60 p-5">
				<StaggerContainer
					staggerDelay={0.08}
					className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
				>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								title="Total active offers"
								value={String(filteredOffers.length)}
								subtitle="Open commercial follow-up states"
								icon={BarChart3}
								variant="default"
							/>
						</HoverLift>
					</StaggerItem>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								title="Pipeline value"
								value={formatCurrency(totalValue)}
								subtitle="Selected latest commercial estimate"
								icon={Wallet}
								variant="accent"
							/>
						</HoverLift>
					</StaggerItem>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								title="In negotiation"
								value={String(
									filteredOffers.filter(
										(offer) => offer.stage === "in_negotiation",
									).length,
								)}
								subtitle="Needs follow-up coordination"
								icon={Filter}
								variant="warning"
							/>
						</HoverLift>
					</StaggerItem>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								title="Offer sent"
								value={String(
									filteredOffers.filter((offer) => offer.stage === "offer_sent")
										.length,
								)}
								subtitle="Pending client response"
								icon={Filter}
								variant="success"
							/>
						</HoverLift>
					</StaggerItem>
				</StaggerContainer>
			</section>

			<FadeIn direction="up" delay={0.15}>
				<OffersStagePipeline stages={pipelineByStage} />
			</FadeIn>

			<FadeIn direction="up" delay={0.25}>
				<section className="overflow-hidden rounded-xl border border-border/50 bg-surface-container-lowest">
					<div className="flex flex-col gap-4 border-b border-border/50 p-6 pb-5">
						<div className="flex flex-col gap-1">
							<h2 className="font-display text-xl font-semibold text-foreground">
								Active offers
							</h2>
							<p className="text-sm text-muted-foreground">
								Search and filter by client and active stage.
							</p>
						</div>
						<div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
							<div className="relative">
								<Search
									aria-hidden
									className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Search offers or streams"
									className="pl-9"
								/>
							</div>
							<Select value={selectedClient} onValueChange={setSelectedClient}>
								<SelectTrigger className="w-full md:w-[220px]">
									<SelectValue placeholder="Filter client" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="all">All clients</SelectItem>
										{clients.map((client) => (
											<SelectItem key={client} value={client}>
												{client}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
							<Select
								value={selectedStage}
								onValueChange={(value) =>
									setSelectedStage(value as OfferStage | "all")
								}
							>
								<SelectTrigger className="w-full md:w-[220px]">
									<SelectValue placeholder="Filter stage" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="all">All stages</SelectItem>
										<SelectItem value="requires_data">Requires data</SelectItem>
										<SelectItem value="proposal_ready">
											Ready to send
										</SelectItem>
										<SelectItem value="offer_sent">Offer sent</SelectItem>
										<SelectItem value="in_negotiation">
											In negotiation
										</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="p-0">
						{filteredOffers.length > 0 ? (
							<OffersPipelineTable offers={filteredOffers} />
						) : (
							<div className="p-6">
								<EmptyState
									icon={Search}
									title="No offers match your filters"
									description="Try another search term or reset stage/client filters."
									className="border-0 bg-transparent py-6"
								/>
							</div>
						)}
					</div>
				</section>
			</FadeIn>
		</div>
	);
}
