import type {
	StreamRow,
} from "@/components/features/streams/types";
import type {
	DraftItemRow,
	PersistedStreamRow,
} from "@/lib/types/dashboard";

function computeDaysSinceLastActivity(lastActivityAt: string): number {
	const parsed = Date.parse(lastActivityAt);
	if (Number.isNaN(parsed)) {
		return 0;
	}

	const millisecondsPerDay = 1000 * 60 * 60 * 24;
	const elapsedMs = Date.now() - parsed;
	if (elapsedMs <= 0) {
		return 0;
	}

	return Math.floor(elapsedMs / millisecondsPerDay);
}

function persistedStatus(row: PersistedStreamRow): StreamRow["status"] {
	if (row.missingRequiredInfo) {
		return "missing_info";
	}

	if (row.pendingConfirmation) {
		return "draft";
	}

	if (row.bucket === "proposal") {
		return "ready_for_offer";
	}

	return "active";
}

export function adaptPersistedStream(
	row: PersistedStreamRow,
	): StreamRow {
	return {
		id: row.projectId,
		name: row.streamName,
		wasteType: row.wasteCategoryLabel ?? "",
		client: row.companyLabel ?? "",
		...(row.companyId ? { clientId: row.companyId } : {}),
		location: row.locationLabel ?? "",
		agent: row.ownerDisplayName ?? "",
		volume: row.volumeSummary ?? "",
		lastUpdated: row.lastActivityAt,
		daysSinceLastActivity: computeDaysSinceLastActivity(row.lastActivityAt),
		missingFields: row.missingFields,
		status: persistedStatus(row),
	};
}

export function adaptDraftItem(row: DraftItemRow): StreamRow {
	const volume = row.volumeSummary ?? "";

	return {
		id: row.itemId,
		name: row.streamName,
		wasteType: "",
		client: row.companyLabel ?? "",
		...(row.companyId ? { clientId: row.companyId } : {}),
		location: row.locationLabel ?? "",
		agent: "",
		volume,
		lastUpdated: row.lastActivityAt,
		daysSinceLastActivity: computeDaysSinceLastActivity(row.lastActivityAt),
		status: "draft",
	};
}
