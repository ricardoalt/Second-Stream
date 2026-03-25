"use client";

import {
	Archive,
	CalendarRange,
	CheckCircle2,
	Search,
	TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import { OffersArchiveTable } from "@/components/features/offers/components/offers-archive-table";
import { OffersSummaryStatCard } from "@/components/features/offers/components/offers-summary-stat-card";
import { formatCurrency, offers } from "@/components/features/offers/mock-data";
import type { OfferStage } from "@/components/features/offers/types";
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

const archiveStatuses: OfferStage[] = ["accepted", "rejected", "expired"];

const monthLookup: Record<string, number> = {
	Jan: 0,
	Feb: 1,
	Mar: 2,
	Apr: 3,
	May: 4,
	Jun: 5,
	Jul: 6,
	Aug: 7,
	Sep: 8,
	Oct: 9,
	Nov: 10,
	Dec: 11,
};

function parseOfferDate(input: string) {
	const [monthToken, dayToken, yearToken] = input.replace(",", "").split(" ");
	const monthIndex = monthLookup[monthToken as keyof typeof monthLookup] ?? 0;
	const day = Number(dayToken);
	const year = Number(yearToken);

	return new Date(year, monthIndex, day);
}

export default function OffersArchivePage() {
	const [query, setQuery] = useState("");
	const [selectedClient, setSelectedClient] = useState("all");
	const [selectedStatus, setSelectedStatus] = useState<OfferStage | "all">(
		"all",
	);
	const [selectedDateRange, setSelectedDateRange] = useState<
		"all" | "30" | "90" | "365"
	>("all");

	const archiveOffers = useMemo(
		() => offers.filter((offer) => archiveStatuses.includes(offer.stage)),
		[],
	);

	const clients = useMemo(
		() =>
			Array.from(new Set(archiveOffers.map((offer) => offer.clientName))).sort(
				(a, b) => a.localeCompare(b),
			),
		[archiveOffers],
	);

	const filteredOffers = useMemo(
		() =>
			archiveOffers.filter((offer) => {
				const matchesQuery =
					offer.streamName.toLowerCase().includes(query.toLowerCase()) ||
					offer.clientName.toLowerCase().includes(query.toLowerCase()) ||
					offer.reference.toLowerCase().includes(query.toLowerCase());

				const matchesClient =
					selectedClient === "all" || offer.clientName === selectedClient;

				const matchesStatus =
					selectedStatus === "all" || offer.stage === selectedStatus;

				if (selectedDateRange === "all") {
					return matchesQuery && matchesClient && matchesStatus;
				}

				const offerDate = parseOfferDate(offer.updatedAt);
				const now = new Date();
				const daysAgo = Number(selectedDateRange);
				const threshold = new Date(now);
				threshold.setDate(now.getDate() - daysAgo);

				return (
					matchesQuery &&
					matchesClient &&
					matchesStatus &&
					offerDate >= threshold
				);
			}),
		[archiveOffers, query, selectedClient, selectedStatus, selectedDateRange],
	);

	const totalArchivedValue = filteredOffers.reduce(
		(sum, offer) => sum + offer.valueUsd,
		0,
	);

	const acceptedOffers = filteredOffers.filter(
		(offer) => offer.stage === "accepted",
	);
	const acceptanceRate =
		filteredOffers.length === 0
			? 0
			: Math.round((acceptedOffers.length / filteredOffers.length) * 100);

	const declinedValue = filteredOffers
		.filter((offer) => offer.stage === "rejected")
		.reduce((sum, offer) => sum + offer.valueUsd, 0);

	return (
		<div className="flex flex-col gap-8">
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-1">
					<p className="text-xs uppercase tracking-[0.08em] text-secondary">
						Offers
					</p>
					<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
						Historical offer archive
					</h1>
					<p className="text-sm text-muted-foreground">
						Review accepted, rejected, and expired offers with operational
						context.
					</p>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<OffersSummaryStatCard
					label="Archive count"
					value={String(filteredOffers.length)}
					subtitle="Closed opportunities"
					icon={Archive}
				/>
				<OffersSummaryStatCard
					label="Total archived value"
					value={formatCurrency(totalArchivedValue)}
					subtitle="Value across filtered archive"
					icon={CalendarRange}
				/>
				<OffersSummaryStatCard
					label="Acceptance rate"
					value={`${acceptanceRate}%`}
					subtitle="Accepted vs filtered outcomes"
					icon={CheckCircle2}
				/>
				<OffersSummaryStatCard
					label="Declined value"
					value={formatCurrency(declinedValue)}
					subtitle="Rejected deal value"
					icon={TrendingDown}
				/>
			</section>

			<Card className="bg-surface-container-lowest shadow-sm">
				<CardHeader className="flex flex-col gap-4">
					<CardTitle className="font-display text-xl font-semibold text-foreground">
						Archived offers
					</CardTitle>
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto]">
						<div className="relative md:col-span-2 xl:col-span-1">
							<Search
								aria-hidden
								className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search archive"
								className="pl-9"
							/>
						</div>

						<Select value={selectedClient} onValueChange={setSelectedClient}>
							<SelectTrigger className="w-full xl:w-[220px]">
								<SelectValue placeholder="Client" />
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
							value={selectedStatus}
							onValueChange={(value) =>
								setSelectedStatus(value as OfferStage | "all")
							}
						>
							<SelectTrigger className="w-full xl:w-[180px]">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All statuses</SelectItem>
									<SelectItem value="accepted">Accepted</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
									<SelectItem value="expired">Expired</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>

						<Select
							value={selectedDateRange}
							onValueChange={(value) =>
								setSelectedDateRange(value as "all" | "30" | "90" | "365")
							}
						>
							<SelectTrigger className="w-full xl:w-[180px]">
								<SelectValue placeholder="Date range" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All time</SelectItem>
									<SelectItem value="30">Last 30 days</SelectItem>
									<SelectItem value="90">Last 90 days</SelectItem>
									<SelectItem value="365">Last year</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<OffersArchiveTable offers={filteredOffers} />
				</CardContent>
			</Card>
		</div>
	);
}
