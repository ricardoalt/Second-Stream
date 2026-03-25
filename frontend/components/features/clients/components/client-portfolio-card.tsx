import {
	ArrowUpRight,
	Building2,
	Factory,
	Mail,
	Phone,
	Waves,
} from "lucide-react";
import Link from "next/link";
import { ClientStatusBadge } from "@/components/features/clients/components/client-status-badge";
import type { PortfolioClient } from "@/components/features/clients/mock-data";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

export function ClientPortfolioCard({ client }: { client: PortfolioClient }) {
	return (
		<Card className="bg-surface-container-lowest shadow-sm">
			<CardHeader className="flex flex-col gap-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle className="font-display text-xl font-semibold">
							{client.name}
						</CardTitle>
						<CardDescription className="inline-flex items-center gap-1 text-xs text-muted-foreground">
							<Factory aria-hidden="true" className="size-3.5" />
							{client.industry}
						</CardDescription>
					</div>
					<ClientStatusBadge status={client.status} />
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 pt-0">
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-xl bg-surface-container-low p-3">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Streams
						</p>
						<p className="mt-1 text-sm font-semibold text-foreground">
							{client.streamCount} active
						</p>
					</div>
					<div className="rounded-xl bg-surface-container-low p-3">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Pipeline
						</p>
						<p className="mt-1 text-sm font-semibold text-foreground">
							{currencyFormatter.format(client.pipelineValue)}
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
					<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
						<Building2 aria-hidden="true" className="size-3.5" />
						{client.locationCount} location{client.locationCount > 1 ? "s" : ""}
						· {numberFormatter.format(client.annualVolumeGallons)} gal/yr
					</p>
					<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
						<Mail aria-hidden="true" className="size-3.5" />
						{client.contactEmail}
					</p>
					<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
						<Phone aria-hidden="true" className="size-3.5" />
						{client.contactPhone}
					</p>
				</div>

				<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
					<Waves aria-hidden="true" className="size-3.5" />
					Last activity {client.lastActivity}
				</p>
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
