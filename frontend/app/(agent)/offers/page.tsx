"use client";

import {
	BarChart3,
	FilePlus2,
	Filter,
	Search,
	Target,
	Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { OffersPipelineTable } from "@/components/features/offers/components/offers-pipeline-table";
import { OffersStagePipeline } from "@/components/features/offers/components/offers-stage-pipeline";
import { OffersSummaryStatCard } from "@/components/features/offers/components/offers-summary-stat-card";
import {
	formatCurrency,
	offers,
	stageOrder,
} from "@/components/features/offers/mock-data";
import type { OfferStage } from "@/components/features/offers/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const activeStages: OfferStage[] = ["draft", "submitted", "under_review"];

export default function OffersPage() {
	const [query, setQuery] = useState("");
	const [selectedStage, setSelectedStage] = useState<OfferStage | "all">("all");

	const activeOffers = useMemo(
		() => offers.filter((offer) => activeStages.includes(offer.stage)),
		[],
	);

	const clients = useMemo(
		() =>
			Array.from(new Set(activeOffers.map((offer) => offer.clientName))).sort(
				(a, b) => a.localeCompare(b),
			),
		[activeOffers],
	);

	const [selectedClient, setSelectedClient] = useState<string>("all");

	const filteredOffers = useMemo(
		() =>
			activeOffers.filter((offer) => {
				const matchesQuery =
					offer.streamName.toLowerCase().includes(query.toLowerCase()) ||
					offer.clientName.toLowerCase().includes(query.toLowerCase()) ||
					offer.reference.toLowerCase().includes(query.toLowerCase());

				const matchesStage =
					selectedStage === "all" || offer.stage === selectedStage;
				const matchesClient =
					selectedClient === "all" || offer.clientName === selectedClient;

				return matchesQuery && matchesStage && matchesClient;
			}),
		[activeOffers, query, selectedStage, selectedClient],
	);

	const pipelineByStage = useMemo(
		() =>
			stageOrder.map((stage) => ({
				stage,
				offers: activeOffers.filter((offer) => offer.stage === stage),
			})),
		[activeOffers],
	);

	const totalValue = filteredOffers.reduce(
		(sum, offer) => sum + offer.valueUsd,
		0,
	);
	const wonThisQuarter = offers.filter((offer) => offer.stage === "accepted");
	const conversionRate =
		offers.filter((offer) =>
			["accepted", "rejected", "expired"].includes(offer.stage),
		).length === 0
			? 0
			: Math.round(
					(wonThisQuarter.length /
						offers.filter((offer) =>
							["accepted", "rejected", "expired"].includes(offer.stage),
						).length) *
						100,
				);

	return (
		<div className="flex flex-col gap-8">
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="flex flex-col gap-1">
						<p className="text-xs uppercase tracking-[0.08em] text-secondary">
							Offers
						</p>
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							Offers pipeline
						</h1>
						<p className="text-sm text-muted-foreground">
							Review active offers across draft, submitted, and review stages.
						</p>
					</div>
					<Button>
						<FilePlus2 data-icon="inline-start" aria-hidden />
						Create Offer
					</Button>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<OffersSummaryStatCard
					label="Total active offers"
					value={String(filteredOffers.length)}
					subtitle="Draft + submitted + under review"
					icon={BarChart3}
				/>
				<OffersSummaryStatCard
					label="Pipeline value"
					value={formatCurrency(totalValue)}
					subtitle="Current weighted offer total"
					icon={Wallet}
				/>
				<OffersSummaryStatCard
					label="Under review"
					value={String(
						activeOffers.filter((offer) => offer.stage === "under_review")
							.length,
					)}
					subtitle="Needs follow-up coordination"
					icon={Filter}
				/>
				<OffersSummaryStatCard
					label="Conversion rate"
					value={`${conversionRate}%`}
					subtitle="Accepted vs closed outcomes"
					icon={Target}
				/>
			</section>

			<OffersStagePipeline stages={pipelineByStage} />

			<Card className="bg-surface-container-lowest shadow-sm">
				<CardHeader className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<CardTitle className="font-display text-xl font-semibold text-foreground">
							Active offers
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Search and filter by client and stage.
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
								placeholder="Search offers, streams, or references"
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
							<SelectTrigger className="w-full md:w-[180px]">
								<SelectValue placeholder="Filter stage" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All stages</SelectItem>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="submitted">Submitted</SelectItem>
									<SelectItem value="under_review">Under review</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<OffersPipelineTable offers={filteredOffers} />
				</CardContent>
			</Card>
		</div>
	);
}
