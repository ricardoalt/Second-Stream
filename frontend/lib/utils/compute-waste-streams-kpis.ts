import type {
	StreamRow,
	WasteStreamsKpis,
} from "@/components/features/streams/types";
import type { DashboardCounts } from "@/lib/types/dashboard";

function computeFromRows(streams: StreamRow[]): WasteStreamsKpis {
	const activeStreams = streams.filter(
		(stream) => stream.status !== "draft",
	).length;
	const criticalAlerts = streams.filter(
		(stream) => stream.status === "missing_info" || stream.status === "blocked",
	).length;
	const openOffers = streams.filter(
		(stream) => stream.status === "ready_for_offer",
	).length;

	return {
		activeStreams,
		criticalAlerts,
		monthlyVolume: null,
		openOffers,
		unavailableReasons: {
			monthlyVolume: "pending_backend_contract",
		},
	};
}

function computeFromCounts(counts: DashboardCounts): WasteStreamsKpis {
	return {
		activeStreams: counts.total,
		criticalAlerts: counts.missingInformation,
		monthlyVolume: null,
		openOffers: null,
		unavailableReasons: {
			monthlyVolume: "pending_backend_contract",
			openOffers: "pending_backend_contract",
		},
	};
}

export function computeWasteStreamsKpis(
	input: StreamRow[] | DashboardCounts,
): WasteStreamsKpis {
	if (Array.isArray(input)) {
		return computeFromRows(input);
	}

	return computeFromCounts(input);
}
