"use client";

import { Archive, CheckCircle2, Search, TrendingDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OffersArchiveTable } from "@/components/features/offers/components/offers-archive-table";
import { OffersSummaryStatCard } from "@/components/features/offers/components/offers-summary-stat-card";
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
import { type OfferArchiveResponseDTO, offersAPI } from "@/lib/api/offers";
import { getErrorMessage } from "@/lib/utils/logger";

type ArchiveStatusFilter = "all" | "accepted" | "declined";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
}

export default function OffersArchivePage() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [selectedStatus, setSelectedStatus] =
		useState<ArchiveStatusFilter>("all");
	const [archive, setArchive] = useState<OfferArchiveResponseDTO>({
		counts: {
			total: 0,
			accepted: 0,
			declined: 0,
		},
		items: [],
	});

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);

		const params =
			selectedStatus === "all"
				? { search: query }
				: { search: query, status: selectedStatus };

		void offersAPI
			.getArchive(params)
			.then((response) => {
				if (cancelled) {
					return;
				}
				setArchive(response);
			})
			.catch((requestError) => {
				if (cancelled) {
					return;
				}
				setError(
					getErrorMessage(requestError, "Could not load archived Offers."),
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
	}, [query, selectedStatus]);

	const totalArchivedValue = useMemo(
		() => archive.items.reduce((sum, offer) => sum + (offer.valueUsd ?? 0), 0),
		[archive.items],
	);

	const declinedValue = useMemo(
		() =>
			archive.items
				.filter((offer) => offer.proposalFollowUpState === "declined")
				.reduce((sum, offer) => sum + (offer.valueUsd ?? 0), 0),
		[archive.items],
	);

	const acceptanceRate =
		archive.counts.total === 0
			? 0
			: Math.round((archive.counts.accepted / archive.counts.total) * 100);

	if (loading) {
		return (
			<div className="rounded-2xl bg-surface-container-lowest p-8 shadow-xs">
				<h1 className="font-display text-2xl font-semibold text-foreground">
					Loading archived Offers...
				</h1>
			</div>
		);
	}

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
						Review accepted and declined offers with archived context.
					</p>
				</div>
			</section>

			{error ? (
				<Card className="border-0 bg-destructive/5 shadow-xs">
					<CardContent className="py-4 text-sm text-destructive">
						{error}
					</CardContent>
				</Card>
			) : null}

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<OffersSummaryStatCard
					label="Archive count"
					value={String(archive.counts.total)}
					subtitle="Archived terminal offers"
					icon={Archive}
				/>
				<OffersSummaryStatCard
					label="Total archived value"
					value={formatCurrency(totalArchivedValue)}
					subtitle="Value across selected archive rows"
					icon={Archive}
				/>
				<OffersSummaryStatCard
					label="Acceptance rate"
					value={`${acceptanceRate}%`}
					subtitle="Accepted vs selected archived outcomes"
					icon={CheckCircle2}
				/>
				<OffersSummaryStatCard
					label="Declined value"
					value={formatCurrency(declinedValue)}
					subtitle="Declined archived offer value"
					icon={TrendingDown}
				/>
			</section>

			<Card className="bg-surface-container-lowest shadow-sm">
				<CardHeader className="flex flex-col gap-4">
					<CardTitle className="font-display text-xl font-semibold text-foreground">
						Archived offers
					</CardTitle>
					<div className="grid gap-3 md:grid-cols-[1fr_auto]">
						<div className="relative">
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

						<Select
							value={selectedStatus}
							onValueChange={(value) =>
								setSelectedStatus(value as ArchiveStatusFilter)
							}
						>
							<SelectTrigger className="w-full md:w-[200px]">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All statuses</SelectItem>
									<SelectItem value="accepted">Accepted</SelectItem>
									<SelectItem value="declined">Declined</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<OffersArchiveTable offers={archive.items} />
				</CardContent>
			</Card>
		</div>
	);
}
