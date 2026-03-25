import Link from "next/link";
import {
	formatCurrency,
	OFFER_STAGE_LABELS,
} from "@/components/features/offers/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OfferRecord, OfferStage } from "../types";

function StageColumn({
	stage,
	offers,
}: {
	stage: OfferStage;
	offers: OfferRecord[];
}) {
	const totalValue = offers.reduce((sum, offer) => sum + offer.valueUsd, 0);

	return (
		<div className="rounded-xl bg-surface-container-low p-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
					{OFFER_STAGE_LABELS[stage]}
				</p>
				<span className="rounded-full bg-surface-container-lowest px-2 py-0.5 text-xs font-medium text-foreground">
					{offers.length}
				</span>
			</div>
			<p className="mt-1 text-xs text-muted-foreground">
				{formatCurrency(totalValue)}
			</p>
			<div className="mt-3 flex flex-col gap-2">
				{offers.slice(0, 3).map((offer) => (
					<Link
						key={offer.id}
						href={`/offers/${offer.id}`}
						className="rounded-lg bg-surface-container-lowest p-2 transition-colors hover:bg-surface"
					>
						<p className="truncate text-sm font-medium text-foreground">
							{offer.streamName}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{offer.clientName}
						</p>
						<p className="mt-1 text-xs font-medium text-primary">
							{formatCurrency(offer.valueUsd)}
						</p>
						<p className="text-xs text-muted-foreground">
							Updated {offer.updatedAt}
						</p>
					</Link>
				))}
			</div>
		</div>
	);
}

export function OffersStagePipeline({
	stages,
}: {
	stages: Array<{ stage: OfferStage; offers: OfferRecord[] }>;
}) {
	return (
		<Card className="bg-surface-container-lowest shadow-sm">
			<CardHeader>
				<CardTitle className="font-display text-xl font-semibold text-foreground">
					Offer pipeline summary
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3 lg:grid-cols-5">
				{stages.map((entry) => (
					<StageColumn
						key={entry.stage}
						stage={entry.stage}
						offers={entry.offers}
					/>
				))}
			</CardContent>
		</Card>
	);
}
