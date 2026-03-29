import { Download, Eye } from "lucide-react";
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
import { routes } from "@/lib/routes";
import { formatCurrency } from "../mock-data";
import type { OfferRecord } from "../types";
import { OfferStatusBadge } from "./offer-status-badge";

export function OffersArchiveTable({ offers }: { offers: OfferRecord[] }) {
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
						key={offer.id}
						className={
							index % 2 === 0 ? "bg-surface" : "bg-surface-container-low"
						}
					>
						<TableCell className="px-4 py-3">
							<div className="flex flex-col gap-0.5">
								<p className="font-medium text-foreground">
									{offer.streamName}
								</p>
								<p className="text-xs text-muted-foreground">
									{offer.reference}
								</p>
							</div>
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{offer.clientName}
						</TableCell>
						<TableCell className="px-4 py-3">
							<OfferStatusBadge stage={offer.stage} />
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{offer.updatedAt}
						</TableCell>
						<TableCell className="px-4 py-3 font-medium text-foreground">
							{formatCurrency(offer.valueUsd)}
						</TableCell>
						<TableCell className="px-4 py-3">
							<div className="flex items-center justify-end gap-2">
								<Button variant="ghost" size="sm" asChild>
									<Link href={routes.offers.detail(offer.projectId)}>
										<Eye data-icon="inline-start" aria-hidden />
										View
									</Link>
								</Button>
								<Button variant="ghost" size="sm">
									<Download data-icon="inline-start" aria-hidden />
									Export
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
