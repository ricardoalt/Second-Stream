import { ArrowUpRight, Building2, Factory, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { PortfolioRow } from "@/lib/mappers/company-client";

/**
 * Card view for a single client in the portfolio.
 * Currently unused (table view is the default) but preserved for potential grid layout.
 */
export function ClientPortfolioCard({ client }: { client: PortfolioRow }) {
	return (
		<Card className="bg-surface-container-lowest shadow-sm">
			<CardHeader className="flex flex-col gap-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle className="font-display text-xl font-semibold">
							{client.name}
						</CardTitle>
						{client.industry && (
							<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
								<Factory aria-hidden="true" className="size-3.5" />
								{client.industry}
							</p>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pt-0">
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-xl bg-surface-container-low p-3">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Locations
						</p>
						<p className="mt-1 text-sm font-semibold text-foreground">
							{client.locationCount}
						</p>
					</div>
					<div className="rounded-xl bg-surface-container-low p-3">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Updated
						</p>
						<p className="mt-1 text-sm font-semibold text-foreground">
							{new Date(client.updatedAt).toLocaleDateString()}
						</p>
					</div>
				</div>

				{client.primaryContact && (
					<div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
						<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
							<Building2 aria-hidden="true" className="size-3.5" />
							{client.primaryContact.name}
						</p>
						{client.primaryContact.email && (
							<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
								<Mail aria-hidden="true" className="size-3.5" />
								{client.primaryContact.email}
							</p>
						)}
						{client.primaryContact.phone && (
							<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
								<Phone aria-hidden="true" className="size-3.5" />
								{client.primaryContact.phone}
							</p>
						)}
					</div>
				)}
			</CardContent>
			<CardFooter className="justify-end">
				<Button variant="ghost" asChild className="text-primary">
					<Link href={`/clients/${client.id}`}>
						View profile
						<ArrowUpRight data-icon="inline-end" aria-hidden="true" />
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
