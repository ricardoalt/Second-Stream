import { Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { OfferArchiveRowDTO } from "@/lib/api/offers";
import { routes } from "@/lib/routes";
import { OfferStatusBadge } from "./offer-status-badge";

function formatCurrency(value: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value ?? 0);
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

export function OffersArchiveTable({
	offers,
}: {
	offers: OfferArchiveRowDTO[];
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow className="bg-surface-container-low">
					<TableHead className="px-4 py-3 text-[0.68rem]">Offer</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Client</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Final status
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Closed / updated
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Value</TableHead>
					<TableHead className="px-4 py-3 text-right text-[0.68rem]">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{offers.map((offer, index) => (
					<TableRow
						key={offer.offerId}
						className={
							index % 2 === 0 ? "bg-surface" : "bg-surface-container-low"
						}
					>
						<TableCell className="px-4 py-3">
							<div className="flex flex-col gap-0.5">
								<p className="font-medium text-foreground">
									{offer.streamName}
								</p>
								{offer.latestProposalVersion ? (
									<p className="text-xs text-muted-foreground">
										{offer.latestProposalVersion}
									</p>
								) : null}
							</div>
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{offer.companyLabel ?? "Unknown client"}
						</TableCell>
						<TableCell className="px-4 py-3">
							<OfferStatusBadge stage={offer.proposalFollowUpState} />
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{formatDate(offer.archivedAt)}
						</TableCell>
						<TableCell className="px-4 py-3 font-medium text-foreground">
							{formatCurrency(offer.valueUsd)}
						</TableCell>
						<TableCell className="px-4 py-3">
							<div className="flex items-center justify-end gap-2">
								<Button variant="ghost" size="sm" asChild>
									<Link href={routes.offers.detail(offer.offerId)}>
										<Eye data-icon="inline-start" aria-hidden />
										View
									</Link>
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
