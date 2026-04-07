"use client";

import {
	Archive,
	CheckCircle2,
	LayoutDashboard,
	TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OffersArchiveTable } from "@/components/features/offers/components/offers-archive-table";
import {
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
import { Card, CardContent } from "@/components/ui/card";
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
			<PageShell>
				<h1 className="font-display text-2xl font-semibold text-foreground">
					Loading archived Offers...
				</h1>
			</PageShell>
		);
	}

	return (
		<PageShell gap="lg">
			<FadeIn direction="up">
				<PageHeader
					title="Historical Offer Archive"
					subtitle="Review accepted and declined offers with archived context."
					icon={LayoutDashboard}
				/>
			</FadeIn>

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
						title="Archive Count"
						value={String(archive.counts.total)}
						subtitle="Archived terminal offers"
						icon={Archive}
						variant="default"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Total Archived Value"
						value={formatCurrency(totalArchivedValue)}
						subtitle="Value across selected archive rows"
						icon={Archive}
						variant="accent"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Acceptance Rate"
						value={`${acceptanceRate}%`}
						subtitle="Accepted vs selected archived outcomes"
						icon={CheckCircle2}
						variant="success"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Declined Value"
						value={formatCurrency(declinedValue)}
						subtitle="Declined archived offer value"
						icon={TrendingDown}
						variant="warning"
					/>
				</HoverLift>
			</StatRail>

			<FilterBar
				search={{
					value: query,
					onChange: setQuery,
					placeholder: "Search archive",
				}}
				filters={[
					{
						key: "status",
						value: selectedStatus,
						onChange: (value) =>
							setSelectedStatus(value as ArchiveStatusFilter),
						options: [
							{ value: "all", label: "All statuses" },
							{ value: "accepted", label: "Accepted" },
							{ value: "declined", label: "Declined" },
						],
						width: "w-[180px]",
					},
				]}
			/>

			<Card className="bg-surface-container-lowest shadow-sm">
				<CardContent className="pt-4">
					<OffersArchiveTable offers={archive.items} />
				</CardContent>
			</Card>
		</PageShell>
	);
}
