import type { StreamRow } from "@/components/features/streams/types";
import type { DraftItemRow, PersistedStreamRow } from "@/lib/types/dashboard";

function parseVolumeSummary(volumeSummary: string | null): {
	volume: string;
	units?: string;
	frequency?: string;
} {
	if (!volumeSummary) {
		return { volume: "" };
	}

	const normalized = volumeSummary.trim();
	if (normalized.length === 0) {
		return { volume: "" };
	}

	const slashIndex = normalized.indexOf("/");
	const volumePart =
		slashIndex >= 0 ? normalized.slice(0, slashIndex).trim() : normalized;
	const frequencyPart =
		slashIndex >= 0 ? normalized.slice(slashIndex + 1).trim() : "";

	const unitsMatch = volumePart.match(/^[\d.,\s-]+(.+)$/);
	const parsedUnits = unitsMatch?.[1]?.trim();

	return {
		volume: volumePart,
		...(parsedUnits ? { units: parsedUnits } : {}),
		...(frequencyPart ? { frequency: frequencyPart } : {}),
	};
}

function trimToNull(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

function buildSuggestedLocationLabel(row: DraftItemRow): string {
	const explicit = trimToNull(row.suggestedLocationName);
	if (explicit) {
		return explicit;
	}

	const parts = [
		trimToNull(row.suggestedLocationCity),
		trimToNull(row.suggestedLocationState),
	].filter((value): value is string => Boolean(value));

	return parts.join(", ");
}

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

export function adaptPersistedStream(row: PersistedStreamRow): StreamRow {
	const volumeData = parseVolumeSummary(row.volumeSummary);

	return {
		id: row.projectId,
		name: row.streamName,
		wasteType: row.wasteCategoryLabel ?? "",
		client: row.companyLabel ?? "",
		...(row.companyId ? { clientId: row.companyId } : {}),
		location: row.locationLabel ?? "",
		agent: row.ownerDisplayName ?? "",
		...(row.ownerDisplayName ? { ownerName: row.ownerDisplayName } : {}),
		...(row.ownerUserId ? { ownerUserId: row.ownerUserId } : {}),
		...(row.creatorDisplayName ? { creatorName: row.creatorDisplayName } : {}),
		hasExplicitOwner: row.hasExplicitOwner ?? true,
		volume: volumeData.volume,
		...(volumeData.units ? { units: volumeData.units } : {}),
		...(volumeData.frequency ? { frequency: volumeData.frequency } : {}),
		lastUpdated: row.lastActivityAt,
		daysSinceLastActivity: computeDaysSinceLastActivity(row.lastActivityAt),
		missingFields: row.missingFields,
		status: persistedStatus(row),
	};
}

export function adaptDraftItem(row: DraftItemRow): StreamRow {
	const volumeData = parseVolumeSummary(row.volumeSummary);
	const clientLabel =
		trimToNull(row.companyLabel) ?? trimToNull(row.suggestedCompanyLabel) ?? "";
	const locationLabel =
		trimToNull(row.locationLabel) ?? buildSuggestedLocationLabel(row);
	const structuredVolume = trimToNull(row.volume);
	const structuredUnits = trimToNull(row.units);
	const structuredFrequency = trimToNull(row.frequency);

	return {
		id: row.itemId,
		name: row.streamName,
		wasteType: row.streamName,
		client: clientLabel,
		...(row.companyId ? { clientId: row.companyId } : {}),
		location: locationLabel,
		agent: "",
		volume: structuredVolume ?? volumeData.volume,
		...((structuredUnits ?? volumeData.units)
			? { units: structuredUnits ?? volumeData.units }
			: {}),
		...((structuredFrequency ?? volumeData.frequency)
			? { frequency: structuredFrequency ?? volumeData.frequency }
			: {}),
		lastUpdated: row.lastActivityAt,
		daysSinceLastActivity: computeDaysSinceLastActivity(row.lastActivityAt),
		status: "draft",
	};
}
