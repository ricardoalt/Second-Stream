"use client";

import {
	Archive,
	CheckCircle2,
	LayoutDashboard,
	Search,
	TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OffersArchiveTable } from "@/components/features/offers/components/offers-archive-table";
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

// ═══════════════════════════════════════════════════════════
// NEW: Design System Patterns
// ════════════════════════════════════════════════════════════

import { KpiCard, PageHeader } from "@/components/patterns";

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
			<PageHeader
				title="Historical Offer Archive"
				subtitle="Review accepted and declined offers with archived context."
				icon={LayoutDashboard}
			/>

			{error ? (
				<Card className="border-0 bg-destructive/5 shadow-xs">
					<CardContent className="py-4 text-sm text-destructive">
						{error}
					</CardContent>
				</Card>
			) : null}

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					title="Archive Count"
					value={String(archive.counts.total)}
					subtitle="Archived terminal offers"
					icon={Archive}
					variant="default"
				/>
				<KpiCard
					title="Total Archived Value"
					value={formatCurrency(totalArchivedValue)}
					subtitle="Value across selected archive rows"
					icon={Archive}
					variant="accent"
				/>
				<KpiCard
					title="Acceptance Rate"
					value={`${acceptanceRate}%`}
					subtitle="Accepted vs selected archived outcomes"
					icon={CheckCircle2}
					variant="success"
				/>
				<KpiCard
					title="Declined Value"
					value={formatCurrency(declinedValue)}
					subtitle="Declined archived offer value"
					icon={TrendingDown}
					variant="warning"
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
