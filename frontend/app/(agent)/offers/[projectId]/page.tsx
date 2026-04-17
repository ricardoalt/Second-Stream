"use client";

import { AlertTriangle, Archive, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OfferStatusBadge } from "@/components/features/offers/components/offer-status-badge";
import { OfferDetailPrimarySurface } from "@/components/features/offers/offer-detail-primary-surface";
import {
	getAllowedProposalFollowUpTransitions,
	mapProjectFollowUpToOfferStage,
	OFFER_FOLLOW_UP_LABELS,
} from "@/components/features/offers/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { offersAPI } from "@/lib/api/offers";
import { projectsAPI } from "@/lib/api/projects";
import { routes } from "@/lib/routes";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import { getErrorMessage } from "@/lib/utils/logger";

export function shouldShowInsightsRefreshFailedNotice(
	queryParamValue: string | null,
) {
	return queryParamValue === "1";
}

export function removeInsightsRefreshFailedFromHref(href: string) {
	const url = new URL(href);
	if (!url.searchParams.has("insightsRefreshFailed")) {
		return null;
	}

	url.searchParams.delete("insightsRefreshFailed");
	const search = url.searchParams.toString();

	return `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
}

export function OfferInsightsRefreshFailedNotice() {
	return (
		<Alert variant="warning">
			<AlertTriangle className="size-4" aria-hidden />
			<AlertTitle>Discovery completed with delayed insights</AlertTitle>
			<AlertDescription>
				Discovery completed and this Offer is open, but insights could not be
				generated yet. You can continue now and refresh insights when ready.
			</AlertDescription>
		</Alert>
	);
}

export function resolveOfferDetailHeaderTitle(detail: {
	displayTitle: string | null;
	offerId: string;
}) {
	const candidate = detail.displayTitle?.trim();
	if (candidate) {
		return candidate;
	}

	return "Offer";
}

export default function OfferDetailPage() {
	const params = useParams<{ projectId: string }>();
	const searchParams = useSearchParams();
	const offerId = typeof params.projectId === "string" ? params.projectId : "";
	const [insightsRefreshFailedOnHandoff] = useState(() =>
		shouldShowInsightsRefreshFailedNotice(
			searchParams.get("insightsRefreshFailed"),
		),
	);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [detail, setDetail] = useState<Awaited<
		ReturnType<typeof offersAPI.getOfferDetail>
	> | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [transitionError, setTransitionError] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [refreshError, setRefreshError] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const hydrateDetail = async (targetOfferId: string) => {
		const response = await offersAPI.getOfferDetail(targetOfferId);
		setDetail(response);
	};

	useEffect(() => {
		if (!insightsRefreshFailedOnHandoff) {
			return;
		}

		const nextHref = removeInsightsRefreshFailedFromHref(window.location.href);
		if (!nextHref) {
			return;
		}

		window.history.replaceState(window.history.state, "", nextHref);
	}, [insightsRefreshFailedOnHandoff]);

	useEffect(() => {
		if (!offerId) {
			setError("Offer link is missing project context.");
			setLoading(false);
			return;
		}

		let cancelled = false;

		setLoading(true);
		setError(null);
		setTransitionError(null);
		setRefreshError(null);
		setUploadError(null);

		void offersAPI
			.getOfferDetail(offerId)
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
				if (cancelled) return;
				setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [offerId]);

	const followUpState = detail?.followUpState;
	const stage = followUpState
		? mapProjectFollowUpToOfferStage(followUpState)
		: "requires_data";
	const nextTransitions = followUpState
		? getAllowedProposalFollowUpTransitions(followUpState)
		: [];

	const handleTransition = async (nextState: ProposalFollowUpState) => {
		if (!offerId) {
			return;
		}
		setTransitionError(null);
		setIsTransitioning(true);
		try {
			const refreshedDetail = await offersAPI.transitionOfferFollowUpState(
				offerId,
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
				await hydrateDetail(offerId);
			} catch {
				// Keep current UI state and surfaced mutation error.
			}
		} finally {
			setIsTransitioning(false);
		}
	};

	const handleRefreshInsights = async () => {
		if (!detail?.projectId || detail.sourceType !== "stream") return;
		setRefreshError(null);
		setIsRefreshing(true);
		try {
			const refreshed = await offersAPI.refreshOfferInsights(detail.projectId);
			setDetail(refreshed);
		} catch (refreshRequestError) {
			setRefreshError(
				getErrorMessage(
					refreshRequestError,
					"Could not refresh Offer insights right now.",
				),
			);
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleUploadReplace = async (file: File | null) => {
		if (!offerId || !file) return;
		setUploadError(null);
		setIsUploading(true);
		try {
			await offersAPI.uploadOfferDocument(offerId, file);
			await hydrateDetail(offerId);
		} catch (uploadRequestError) {
			setUploadError(
				getErrorMessage(
					uploadRequestError,
					"Could not upload and replace this Offer document.",
				),
			);
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleDownloadDocument = async () => {
		const fileId = detail?.offerDocument?.fileId;
		const filename = detail?.offerDocument?.filename ?? "offer-document";
		if (!fileId) return;

		try {
			const blob = await projectsAPI.downloadFileBlob(fileId);
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		} catch (downloadError) {
			setUploadError(
				getErrorMessage(
					downloadError,
					"Could not download the Offer document.",
				),
			);
		}
	};

	if (loading) {
		return (
			<div className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
				<h1 className="font-display text-2xl font-semibold text-foreground">
					Loading Offer detail...
				</h1>
			</div>
		);
	}

	if (error || !detail) {
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

	const isArchivedState =
		detail.followUpState === "accepted" || detail.followUpState === "rejected";
	const headerTitle = resolveOfferDetailHeaderTitle(detail);

	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-col gap-2">
						<Button asChild size="sm" variant="ghost" className="w-fit">
							<Link href={routes.offers.all}>
								<ArrowLeft data-icon="inline-start" aria-hidden />
								Offers pipeline
							</Link>
						</Button>
						<p className="text-xs uppercase tracking-[0.08em] text-secondary">
							Offer detail
						</p>
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							{headerTitle}
						</h1>
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<OfferStatusBadge stage={stage} />
							<span>
								State:{" "}
								{detail.followUpState
									? OFFER_FOLLOW_UP_LABELS[detail.followUpState]
									: "Pending"}
							</span>
						</div>
					</div>
					{isArchivedState ? (
						<Button asChild variant="outline" size="sm">
							<Link href={routes.offers.archive}>
								<Archive data-icon="inline-start" aria-hidden />
								View in archive
							</Link>
						</Button>
					) : null}
				</div>
			</section>

			{detail.insights?.freshness.isStale ? (
				<Alert variant="warning">
					<AlertTriangle className="size-4" aria-hidden />
					<AlertTitle>Insights are stale</AlertTitle>
					<AlertDescription>
						Workspace evidence changed after the last Offer insight generation.
						Refresh insights to use the latest source data.
					</AlertDescription>
				</Alert>
			) : null}

			{insightsRefreshFailedOnHandoff ? (
				<OfferInsightsRefreshFailedNotice />
			) : null}

			<OfferDetailPrimarySurface
				detail={detail}
				nextTransitions={nextTransitions}
				isRefreshing={isRefreshing}
				isUploading={isUploading}
				isTransitioning={isTransitioning}
				refreshError={refreshError}
				uploadError={uploadError}
				transitionError={transitionError}
				onRefreshInsights={() => {
					void handleRefreshInsights();
				}}
				onUploadClick={() => {
					fileInputRef.current?.click();
				}}
				onTransition={(nextState) => {
					void handleTransition(nextState);
				}}
				onDownload={() => {
					void handleDownloadDocument();
				}}
			/>
			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf,.doc,.docx"
				className="hidden"
				onChange={(event) => {
					void handleUploadReplace(event.target.files?.[0] ?? null);
				}}
			/>
		</div>
	);
}
