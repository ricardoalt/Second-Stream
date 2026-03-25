import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "../mock-data";
import type { OfferRecord } from "../types";
import { OfferStatusBadge } from "./offer-status-badge";

export function OffersPipelineTable({ offers }: { offers: OfferRecord[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow className="bg-surface-container-low">
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Client / stream
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Offer ref</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Stage</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Value</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Updated</TableHead>
					<TableHead className="px-4 py-3 text-right text-[0.68rem]">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{offers.map((offer, index) => (
					<TableRow
						key={offer.id}
						className={
							index % 2 === 0 ? "bg-surface" : "bg-surface-container-low"
						}
					>
						<TableCell className="px-4 py-3">
							<div className="flex flex-col gap-0.5">
								<Link
									href={`/offers/${offer.id}`}
									className="font-medium text-foreground hover:text-primary"
								>
									{offer.streamName}
								</Link>
								<span className="text-xs text-muted-foreground">
									{offer.clientName}
								</span>
							</div>
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{offer.reference}
						</TableCell>
						<TableCell className="px-4 py-3">
							<OfferStatusBadge stage={offer.stage} />
						</TableCell>
						<TableCell className="px-4 py-3 font-medium text-foreground">
							{formatCurrency(offer.valueUsd)}
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{offer.updatedAt}
						</TableCell>
						<TableCell className="px-4 py-3 text-right">
							<button
								type="button"
								aria-label={`More actions for ${offer.reference}`}
								className="inline-flex rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
							>
								<MoreHorizontal aria-hidden className="size-4" />
							</button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
