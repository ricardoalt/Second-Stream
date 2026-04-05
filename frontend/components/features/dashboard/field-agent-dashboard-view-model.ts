import { useEffect, useMemo, useState } from "react";
import { dashboardAPI } from "@/lib/api/dashboard";
import { offersAPI } from "@/lib/api/offers";
import { isPersistedStream } from "@/lib/types/dashboard";
import {
	isClientDataCacheStale,
	peekClientDataCache,
} from "@/lib/utils/client-data-cache";
import type { DashboardListResponse } from "@/lib/types/dashboard";
import type {
	OfferArchiveResponseDTO,
	OfferPipelineResponseDTO,
} from "@/lib/api/offers";
import type {
	MissingInformationStream,
	MonthlyPipelineKpi,
	OfferFollowUpState,
	OfferStageFeaturedItem,
} from "./field-agent-dashboard.types";

type FieldAgentDashboardViewModel = {
	heroKpis: MonthlyPipelineKpi[];
	missingInformationStreams: MissingInformationStream[];
	offerCounts: Record<OfferFollowUpState, number>;
	offerFeaturedItems: Partial<
		Record<OfferFollowUpState, OfferStageFeaturedItem[]>
	>;
	loading: boolean;
	error: string | null;
};

const EMPTY_OFFER_COUNTS: Record<OfferFollowUpState, number> = {
	uploaded: 0,
	waiting_to_send: 0,
	waiting_response: 0,
	under_negotiation: 0,
	accepted: 0,
	declined: 0,
	rejected: 0,
};

const FEATURED_ITEMS_PER_STAGE = 2;
const DASHBOARD_MISSING_INFO_CACHE_KEY =
	"dashboard:/projects/dashboard?bucket=missing_information&size=50";
const OFFERS_PIPELINE_CACHE_KEY = "offers:pipeline";
const OFFERS_ARCHIVE_CACHE_KEY = "offers:archive:";

const EMPTY_HERO_KPIS: MonthlyPipelineKpi[] = [
	{
		id: "pipeline-value",
		label: "Monthly pipeline",
		value: "$0",
		helpText: "Current qualified value",
		gaugeValue: 0,
	},
	{
		id: "active-streams",
		label: "Active streams",
		value: "0",
		helpText: "In discovery and offer motion",
		gaugeValue: 0,
	},
	{
		id: "awaiting-info",
		label: "Missing information",
		value: "0",
		helpText: "Need client follow-up",
		gaugeValue: 0,
	},
];

function formatCompactUsd(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
}

function gaugeFromCount(value: number, denominator: number): number {
	if (denominator <= 0) return 0;
	return Math.max(0, Math.min(100, Math.round((value / denominator) * 100)));
}

function relativeTimeLabel(isoDate: string): string {
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return "recently";

	const minutes = Math.round((date.getTime() - Date.now()) / (1000 * 60));
	const absMinutes = Math.abs(minutes);
	const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

	if (absMinutes < 60) return rtf.format(minutes, "minute");

	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 24) return rtf.format(hours, "hour");

	const days = Math.round(hours / 24);
	return rtf.format(days, "day");
}

function toMissingInfoStatusLabel(
	queuePriority: "critical" | "high" | "normal",
): MissingInformationStream["statusLabel"] {
	if (queuePriority === "critical") return "Blocked";
	if (queuePriority === "high") return "Action required";
	return "Pending";
}

function toMissingInfoPriority(
	queuePriority: "critical" | "high" | "normal",
): MissingInformationStream["priority"] {
	return queuePriority;
}

function toMissingInfoNextAction(
	queuePriorityReason: string,
	queuePriority: "critical" | "high" | "normal",
): string {
	if (queuePriorityReason === "missing_required_info") {
		return queuePriority === "critical"
			? "Send high-priority reminder"
			: "Request missing documentation";
	}

	if (queuePriority === "critical") return "Escalate follow-up with client";
	if (queuePriority === "high") return "Schedule validation follow-up";
	return "Monitor and follow up";
}

function toMissingInfoStreams(
	response: Awaited<ReturnType<typeof dashboardAPI.getDashboard>>,
): MissingInformationStream[] {
	return response.items.filter(isPersistedStream).map((item) => {
		const statusLabel = toMissingInfoStatusLabel(item.queuePriority);
		const missingItems =
			item.missingFields.length > 0
				? item.missingFields
				: ["Required information pending confirmation"];

		return {
			id: item.projectId,
			streamName: item.streamName,
			clientName: item.companyLabel ?? "Client unavailable",
			siteName: item.locationLabel ?? "Location unavailable",
			statusLabel,
			priority: toMissingInfoPriority(item.queuePriority),
			missingItems,
			nextAction: toMissingInfoNextAction(
				item.queuePriorityReason,
				item.queuePriority,
			),
			lastTouched: relativeTimeLabel(item.lastActivityAt),
		};
	});
}

function toOfferFeaturedItems(
	pipelineItems: Awaited<ReturnType<typeof offersAPI.getPipeline>>["items"],
	archiveItems: Awaited<ReturnType<typeof offersAPI.getArchive>>["items"],
): Partial<Record<OfferFollowUpState, OfferStageFeaturedItem[]>> {
	const sent = pipelineItems
		.filter((item) => item.proposalFollowUpState === "waiting_response")
		.slice(0, FEATURED_ITEMS_PER_STAGE)
		.map((item) => ({
			id: `sent-${item.projectId}`,
			primaryText: `${item.companyLabel ?? "Client unavailable"} • ${item.streamName}`,
			secondaryText: `Sent proposal • Last activity ${relativeTimeLabel(item.lastActivityAt)}`,
		}));

	const accepted = archiveItems
		.filter((item) => item.proposalFollowUpState === "accepted")
		.slice(0, FEATURED_ITEMS_PER_STAGE)
		.map((item) => ({
			id: `accepted-${item.projectId}`,
			primaryText: `${item.companyLabel ?? "Client unavailable"} • ${item.streamName}`,
			secondaryText: `Accepted ${relativeTimeLabel(item.archivedAt)}`,
		}));

	return {
		waiting_response: sent,
		accepted,
	};
}

function toOfferCounts(
	pipelineCounts: Awaited<ReturnType<typeof offersAPI.getPipeline>>["counts"],
	archiveCounts: Awaited<ReturnType<typeof offersAPI.getArchive>>["counts"],
): Record<OfferFollowUpState, number> {
	return {
		uploaded: pipelineCounts.uploaded,
		waiting_to_send: pipelineCounts.waitingToSend,
		waiting_response: pipelineCounts.waitingResponse,
		under_negotiation: pipelineCounts.underNegotiation,
		accepted: archiveCounts.accepted,
		declined: archiveCounts.declined,
		rejected: 0,
	};
}

function toHeroKpis(args: {
	activeStreams: number;
	missingInformationCount: number;
	pipelineItems: Awaited<ReturnType<typeof offersAPI.getPipeline>>["items"];
}): MonthlyPipelineKpi[] {
	const pipelineValue = args.pipelineItems.reduce(
		(sum, item) => sum + (item.valueUsd ?? 0),
		0,
	);
	const activeGauge = gaugeFromCount(args.activeStreams, 100);
	const missingGauge = gaugeFromCount(
		args.missingInformationCount,
		args.activeStreams,
	);

	return [
		{
			id: "pipeline-value",
			label: "Monthly pipeline",
			value: formatCompactUsd(pipelineValue),
			helpText: "Current qualified value",
			gaugeValue: gaugeFromCount(pipelineValue, 1_000_000),
		},
		{
			id: "active-streams",
			label: "Active streams",
			value: String(args.activeStreams),
			helpText: "In discovery and offer motion",
			gaugeValue: activeGauge,
		},
		{
			id: "awaiting-info",
			label: "Missing information",
			value: String(args.missingInformationCount),
			helpText: "Need client follow-up",
			gaugeValue: missingGauge,
		},
	];
}

export function useFieldAgentDashboardViewModel({
	enabled = true,
}: {
	enabled?: boolean;
} = {}): FieldAgentDashboardViewModel {
	const [missingInformationStreams, setMissingInformationStreams] = useState<
		MissingInformationStream[]
	>([]);
	const [heroKpis, setHeroKpis] =
		useState<MonthlyPipelineKpi[]>(EMPTY_HERO_KPIS);
	const [offerCounts, setOfferCounts] = useState(EMPTY_OFFER_COUNTS);
	const [offerFeaturedItems, setOfferFeaturedItems] = useState<
		Partial<Record<OfferFollowUpState, OfferStageFeaturedItem[]>>
	>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled) {
			setLoading(false);
			setHeroKpis(EMPTY_HERO_KPIS);
			return;
		}

		const cachedMissingInfo = peekClientDataCache<DashboardListResponse>(
			DASHBOARD_MISSING_INFO_CACHE_KEY,
		);
		const cachedPipeline =
			peekClientDataCache<OfferPipelineResponseDTO>(OFFERS_PIPELINE_CACHE_KEY);
		const cachedArchive =
			peekClientDataCache<OfferArchiveResponseDTO>(OFFERS_ARCHIVE_CACHE_KEY);

		const hasAnyCachedData = Boolean(
			cachedMissingInfo || cachedPipeline || cachedArchive,
		);

		if (cachedMissingInfo) {
			setMissingInformationStreams(toMissingInfoStreams(cachedMissingInfo.data));
		}

		if (cachedPipeline && cachedArchive) {
			setOfferCounts(
				toOfferCounts(cachedPipeline.data.counts, cachedArchive.data.counts),
			);
			setOfferFeaturedItems(
				toOfferFeaturedItems(cachedPipeline.data.items, cachedArchive.data.items),
			);
		}

		if (cachedMissingInfo && cachedPipeline) {
			setHeroKpis(
				toHeroKpis({
					activeStreams: cachedMissingInfo.data.counts.total,
					missingInformationCount:
						cachedMissingInfo.data.counts.missingInformation,
					pipelineItems: cachedPipeline.data.items,
				}),
			);
		}

		if (hasAnyCachedData) {
			setLoading(false);
			setError(null);
		}

		const needsRefresh =
			!cachedMissingInfo ||
			!cachedPipeline ||
			!cachedArchive ||
			isClientDataCacheStale(DASHBOARD_MISSING_INFO_CACHE_KEY) ||
			isClientDataCacheStale(OFFERS_PIPELINE_CACHE_KEY) ||
			isClientDataCacheStale(OFFERS_ARCHIVE_CACHE_KEY);

		if (!needsRefresh) {
			return;
		}

		let cancelled = false;

		async function load() {
			if (!hasAnyCachedData) {
				setLoading(true);
			}
			setError(null);

			try {
				const [missingInfoResult, pipelineResult, archiveResult] =
					await Promise.allSettled([
						dashboardAPI.getDashboard({
							bucket: "missing_information",
							size: 50,
						}),
						offersAPI.getPipeline(),
						offersAPI.getArchive(),
					]);

				if (cancelled) {
					return;
				}

				if (missingInfoResult.status === "fulfilled") {
					setMissingInformationStreams(
						toMissingInfoStreams(missingInfoResult.value),
					);
				}

				if (
					missingInfoResult.status === "fulfilled" &&
					pipelineResult.status === "fulfilled"
				) {
					setHeroKpis(
						toHeroKpis({
							activeStreams: missingInfoResult.value.counts.total,
							missingInformationCount:
								missingInfoResult.value.counts.missingInformation,
							pipelineItems: pipelineResult.value.items,
						}),
					);
				}

				if (
					pipelineResult.status === "fulfilled" &&
					archiveResult.status === "fulfilled"
				) {
					setOfferCounts(
						toOfferCounts(
							pipelineResult.value.counts,
							archiveResult.value.counts,
						),
					);
					setOfferFeaturedItems(
						toOfferFeaturedItems(
							pipelineResult.value.items,
							archiveResult.value.items,
						),
					);
				}

				if (
					missingInfoResult.status === "rejected" ||
					pipelineResult.status === "rejected" ||
					archiveResult.status === "rejected"
				) {
					setError(
						"Some dashboard data could not be loaded. Showing available information.",
					);
				}
			} catch {
				if (!cancelled) {
					setError(
						"Unable to load dashboard data right now. Please refresh and try again.",
					);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, [enabled]);

	return useMemo(
		() => ({
			heroKpis,
			missingInformationStreams,
			offerCounts,
			offerFeaturedItems,
			loading,
			error,
		}),
		[
			heroKpis,
			missingInformationStreams,
			offerCounts,
			offerFeaturedItems,
			loading,
			error,
		],
	);
}
