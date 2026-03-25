"use client";

import {
	ArrowLeft,
	Download,
	FilePenLine,
	MessageSquareReply,
	Send,
	Shield,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OfferActivityTimeline } from "@/components/features/offers/components/offer-activity-timeline";
import { OfferStatusBadge } from "@/components/features/offers/components/offer-status-badge";
import {
	formatCurrency,
	getOfferById,
} from "@/components/features/offers/mock-data";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function OfferDetailPage() {
	const params = useParams<{ id: string }>();
	const offerId = typeof params.id === "string" ? params.id : "";
	const offer = getOfferById(offerId);

	if (!offer) {
		return (
			<div className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
				<h1 className="font-display text-2xl font-semibold text-foreground">
					Offer not found
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					The requested offer does not exist in the current mock dataset.
				</p>
				<Button asChild className="mt-6">
					<Link href="/offers">
						<ArrowLeft data-icon="inline-start" aria-hidden />
						Back to offers
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-3">
						<Button asChild size="sm" variant="ghost">
							<Link href="/offers">
								<ArrowLeft data-icon="inline-start" aria-hidden />
								Offers pipeline
							</Link>
						</Button>
						<span className="text-xs text-muted-foreground">/</span>
						<span className="text-xs text-secondary">{offer.reference}</span>
					</div>

					<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
						<div className="flex flex-col gap-2">
							<p className="text-xs uppercase tracking-[0.08em] text-secondary">
								Offer detail
							</p>
							<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
								{offer.streamName}
							</h1>
							<p className="text-sm text-muted-foreground">
								{offer.clientName} · {offer.location}
							</p>
							<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<OfferStatusBadge stage={offer.stage} />
								<span>Created {offer.createdAt}</span>
								<span>Updated {offer.updatedAt}</span>
							</div>
						</div>

						<div className="flex flex-wrap gap-2 xl:justify-end">
							<Button variant="secondary">
								<FilePenLine data-icon="inline-start" aria-hidden />
								Edit
							</Button>
							<Button>
								<Send data-icon="inline-start" aria-hidden />
								Send to Client
							</Button>
							<Button variant="outline">
								<Download data-icon="inline-start" aria-hidden />
								Export PDF
							</Button>
						</div>
					</div>
				</div>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
				<div className="flex flex-col gap-6">
					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl font-semibold text-foreground">
								Offer summary
							</CardTitle>
							<CardDescription>{offer.executiveSummary}</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-2">
							<div className="rounded-xl bg-surface-container-low p-4">
								<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Offer value
								</p>
								<p className="mt-1 font-display text-3xl font-semibold text-foreground">
									{formatCurrency(offer.valueUsd)}
								</p>
								<p className="text-xs text-muted-foreground">
									Annualized estimate
								</p>
							</div>
							<div className="rounded-xl bg-surface-container-low p-4">
								<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Pricing basis
								</p>
								<p className="mt-1 text-lg font-semibold text-foreground">
									{offer.pricing.unitPriceUsd.toFixed(2)}{" "}
									{offer.pricing.unitLabel}
								</p>
								<p className="text-xs text-muted-foreground">
									{offer.pricing.monthlyVolume}
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl font-semibold text-foreground">
								Financial details & terms
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
							<div className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3">
								<span>Net annual value</span>
								<span className="font-medium text-foreground">
									{formatCurrency(offer.pricing.netAnnualValueUsd)}
								</span>
							</div>
							<div className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3">
								<span>Payment terms</span>
								<span className="font-medium text-foreground">
									{offer.pricing.paymentTerms}
								</span>
							</div>
							<div className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3">
								<span>Offer expiry date</span>
								<span className="font-medium text-foreground">
									{offer.pricing.expiresOn}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl font-semibold text-foreground">
								Linked waste streams
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							{offer.linkedStreams.map((stream) => (
								<div
									key={stream.id}
									className="rounded-xl bg-surface-container-low p-3"
								>
									<p className="text-sm font-medium text-foreground">
										{stream.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{stream.location}
									</p>
									<p className="mt-1 text-xs text-secondary">{stream.status}</p>
								</div>
							))}
						</CardContent>
					</Card>
				</div>

				<div className="flex flex-col gap-6">
					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
								<Sparkles aria-hidden className="size-5 text-primary" />
								Strategic insights
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{offer.strategicInsights}
							</p>
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
								<Shield aria-hidden className="size-5 text-primary" />
								Compliance notes
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							{offer.complianceNotes.map((note) => (
								<p
									key={note}
									className="rounded-xl bg-surface-container-low p-3 text-sm text-muted-foreground"
								>
									{note}
								</p>
							))}
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
								<MessageSquareReply
									aria-hidden
									className="size-5 text-primary"
								/>
								Activity timeline
							</CardTitle>
						</CardHeader>
						<CardContent>
							<OfferActivityTimeline events={offer.timeline} />
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
