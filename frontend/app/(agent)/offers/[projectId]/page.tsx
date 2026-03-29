"use client";

import {
	ArrowLeft,
	FileText,
	MessageSquareReply,
	Shield,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OfferActivityTimeline } from "@/components/features/offers/components/offer-activity-timeline";
import { OfferStatusBadge } from "@/components/features/offers/components/offer-status-badge";
import type {
	OfferStage,
	OfferTimelineEvent,
} from "@/components/features/offers/types";
import {
	getAllowedProposalFollowUpTransitions,
	mapProjectFollowUpToOfferStage,
	PROPOSAL_FOLLOW_UP_LABELS,
} from "@/components/features/offers/utils";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { offersAPI } from "@/lib/api/offers";
import { routes } from "@/lib/routes";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import type { ProposalDTO } from "@/lib/types/proposal-dto";
import { getErrorMessage } from "@/lib/utils/logger";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
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

function buildOfferTimeline(proposal: ProposalDTO): OfferTimelineEvent[] {
	return [
		{
			id: `${proposal.id}-created`,
			title: "Offer detail available",
			description:
				"Discovery handoff is complete and this Offer is ready for commercial follow-up.",
			timestamp: formatDate(proposal.createdAt),
			type: "system",
		},
	];
}

export default function OfferDetailPage() {
	const params = useParams<{ projectId: string }>();
	const projectId =
		typeof params.projectId === "string" ? params.projectId : "";

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [detail, setDetail] = useState<Awaited<
		ReturnType<typeof offersAPI.getOfferDetail>
	> | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [transitionError, setTransitionError] = useState<string | null>(null);

	const hydrateDetail = async (targetProjectId: string) => {
		const response = await offersAPI.getOfferDetail(targetProjectId);
		setDetail(response);
	};

	useEffect(() => {
		if (!projectId) {
			setError("Offer link is missing project context.");
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);
		setTransitionError(null);
		void offersAPI
			.getOfferDetail(projectId)
			.then((response) => {
				if (cancelled) return;
				setDetail(response);
			})
			.catch((requestError) => {
				if (cancelled) return;
				setError(
					getErrorMessage(requestError, "Could not load this Offer detail."),
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
	}, [projectId]);

	const proposal = detail?.proposal ?? null;
	const timeline = useMemo(
		() => (proposal ? buildOfferTimeline(proposal) : []),
		[proposal],
	);

	if (loading) {
		return (
			<div className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
				<h1 className="font-display text-2xl font-semibold text-foreground">
					Loading Offer detail...
				</h1>
			</div>
		);
	}

	if (error || !detail || !proposal) {
		return (
			<div className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
				<h1 className="font-display text-2xl font-semibold text-foreground">
					Offer not available
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{error ?? "The requested Offer could not be loaded."}
				</p>
				<Button asChild className="mt-6">
					<Link href={routes.offers.all}>
						<ArrowLeft data-icon="inline-start" aria-hidden />
						Back to Offers
					</Link>
				</Button>
			</div>
		);
	}

	const stage: OfferStage = mapProjectFollowUpToOfferStage(
		detail.proposalFollowUpState,
	);
	const nextTransitions = getAllowedProposalFollowUpTransitions(
		detail.proposalFollowUpState,
	);

	const handleTransition = async (nextState: ProposalFollowUpState) => {
		if (!projectId) {
			return;
		}
		setTransitionError(null);
		setIsTransitioning(true);
		try {
			const refreshedDetail = await offersAPI.transitionOfferFollowUpState(
				projectId,
				nextState,
			);
			setDetail(refreshedDetail);
		} catch (transitionRequestError) {
			setTransitionError(
				getErrorMessage(
					transitionRequestError,
					"Could not update this Offer follow-up state.",
				),
			);
			try {
				await hydrateDetail(projectId);
			} catch {
				// Keep current UI state and surfaced mutation error.
			}
		} finally {
			setIsTransitioning(false);
		}
	};

	const headline =
		proposal.executiveSummary?.trim() || "Offer summary pending.";
	const technicalApproach =
		proposal.technicalApproach?.trim() ||
		"Technical approach will appear once proposal content is generated.";

	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-3">
						<Button asChild size="sm" variant="ghost">
							<Link href={routes.offers.all}>
								<ArrowLeft data-icon="inline-start" aria-hidden />
								Offers pipeline
							</Link>
						</Button>
						<span className="text-xs text-muted-foreground">/</span>
						<span className="text-xs text-secondary">{proposal.version}</span>
					</div>

					<div className="flex flex-col gap-2">
						<p className="text-xs uppercase tracking-[0.08em] text-secondary">
							Offer detail
						</p>
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							{proposal.title}
						</h1>
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<OfferStatusBadge stage={stage} />
							<span>Created {formatDate(proposal.createdAt)}</span>
							<span>Type: {proposal.proposalType}</span>
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
							<CardDescription>{headline}</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 md:grid-cols-2">
							<div className="rounded-xl bg-surface-container-low p-4">
								<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Estimated CAPEX
								</p>
								<p className="mt-1 font-display text-3xl font-semibold text-foreground">
									{formatCurrency(proposal.capex)}
								</p>
							</div>
							<div className="rounded-xl bg-surface-container-low p-4">
								<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Estimated OPEX
								</p>
								<p className="mt-1 font-display text-3xl font-semibold text-foreground">
									{formatCurrency(proposal.opex)}
								</p>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl font-semibold text-foreground">
								Technical approach
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="whitespace-pre-wrap text-sm text-muted-foreground">
								{technicalApproach}
							</p>
						</CardContent>
					</Card>
				</div>

				<div className="flex flex-col gap-6">
					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
								<MessageSquareReply
									aria-hidden
									className="size-5 text-primary"
								/>
								Follow-up actions
							</CardTitle>
							<CardDescription>
								Current state:{" "}
								{PROPOSAL_FOLLOW_UP_LABELS[detail.proposalFollowUpState]}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{nextTransitions.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									This Offer is in a terminal follow-up state.
								</p>
							) : (
								<div className="flex flex-wrap gap-2">
									{nextTransitions.map((nextState) => (
										<Button
											key={nextState}
											size="sm"
											variant="outline"
											onClick={() => {
												void handleTransition(nextState);
											}}
											disabled={isTransitioning}
										>
											Move to {PROPOSAL_FOLLOW_UP_LABELS[nextState]}
										</Button>
									))}
								</div>
							)}
							{transitionError ? (
								<p className="text-sm text-destructive">{transitionError}</p>
							) : null}
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
								<Sparkles aria-hidden className="size-5 text-primary" />
								Offer metadata
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-muted-foreground">
							<p>
								<span className="font-medium text-foreground">Author:</span>{" "}
								{proposal.author}
							</p>
							<p>
								<span className="font-medium text-foreground">Project:</span>{" "}
								{detail.projectName}
							</p>
							<p>
								<span className="font-medium text-foreground">Client:</span>{" "}
								{detail.companyLabel ?? "Unknown"}
							</p>
							<p>
								<span className="font-medium text-foreground">Location:</span>{" "}
								{detail.locationLabel ?? "Unknown"}
							</p>
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
								<Shield aria-hidden className="size-5 text-primary" />
								Document status
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-muted-foreground">
							<p className="rounded-xl bg-surface-container-low p-3">
								{proposal.pdfPath
									? "Offer PDF is available for export."
									: "Offer PDF is not generated yet."}
							</p>
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
							<OfferActivityTimeline events={timeline} />
						</CardContent>
					</Card>
				</div>
			</section>

			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex items-start gap-3">
					<FileText className="mt-0.5 size-5 text-primary" aria-hidden />
					<div>
						<p className="text-sm font-medium text-foreground">
							Offer contract source
						</p>
						<p className="text-sm text-muted-foreground">
							This detail is hydrated from real project and proposal backend
							data.
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
