import type { DraftCandidate } from "@/lib/types/discovery";

export type CandidateEditableField =
	| "clientId"
	| "locationId"
	| "material"
	| "volume"
	| "frequency"
	| "units";

export type CandidateValidationErrors = Partial<
	Record<CandidateEditableField, string>
>;

export const REQUIRED_FIELDS = new Set<CandidateEditableField>([
	"material",
]);

export const NON_EDITABLE_FIELDS = new Set<keyof DraftCandidate>([
	"itemId",
	"runId",
	"locationLabel",
	"source",
	"confidence",
	"status",
]);

function hasSuggestedClient(candidate: DraftCandidate): boolean {
	if (candidate.aiSuggestedClientAccepted !== true) {
		return false;
	}

	return (candidate.suggestedClientName ?? "").trim().length > 0;
}

function hasSuggestedCreateNewLocation(candidate: DraftCandidate): boolean {
	if (candidate.aiSuggestedLocationAccepted !== true) {
		return false;
	}

	return (
		(candidate.suggestedLocationName ?? "").trim().length > 0 &&
		(candidate.suggestedLocationCity ?? "").trim().length > 0 &&
		(candidate.suggestedLocationState ?? "").trim().length > 0
	);
}

export function validateCandidateForConfirmation(
	candidate: DraftCandidate,
): CandidateValidationErrors {
	const errors: CandidateValidationErrors = {};

	if (!(candidate.clientId ?? "").trim()) {
		if (!hasSuggestedClient(candidate)) {
			errors.clientId = "Client is required";
		}
	}

	if (!(candidate.locationId ?? "").trim()) {
		const clientResolvable =
			(candidate.clientId ?? "").trim().length > 0 || hasSuggestedClient(candidate);
		if (!(clientResolvable && hasSuggestedCreateNewLocation(candidate))) {
			errors.locationId = "Location is required";
		}
	}

	if (!candidate.material.trim()) {
		errors.material = "Material is required";
	}

	return errors;
}

export function toDiscoveryNormalizedData(
	candidate: DraftCandidate,
): Record<string, unknown> {
	const material = candidate.material.trim();
	const volume = (candidate.volume ?? "").trim();
	const frequency = (candidate.frequency ?? "").trim();

	return {
		name: material,
		estimated_volume: volume,
		volume,
		frequency,
	};
}

export function buildCandidateReviewNotes(candidate: DraftCandidate): string {
	const parts = [
		`source=${candidate.source}`,
		`units=${candidate.units ?? "n/a"}`,
		`location=${candidate.locationLabel ?? "n/a"}`,
	];
	return `confirmed_via_discovery_modal; ${parts.join("; ")}`;
}
