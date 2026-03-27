import type { DraftCandidate } from "@/lib/types/discovery";

export type CandidateEditableField = "material" | "volume" | "frequency";

export type CandidateValidationErrors = Partial<
	Record<CandidateEditableField, string>
>;

export const REQUIRED_FIELDS = new Set<CandidateEditableField>([
	"material",
	"volume",
	"frequency",
]);

export const NON_EDITABLE_FIELDS = new Set<keyof DraftCandidate>([
	"itemId",
	"runId",
	"locationLabel",
	"source",
	"confidence",
	"status",
	"units",
]);

export function validateCandidateForConfirmation(
	candidate: DraftCandidate,
): CandidateValidationErrors {
	const errors: CandidateValidationErrors = {};

	if (!candidate.material.trim()) {
		errors.material = "Material is required";
	}

	if (!(candidate.volume ?? "").trim()) {
		errors.volume = "Volume is required";
	}

	if (!(candidate.frequency ?? "").trim()) {
		errors.frequency = "Frequency is required";
	}

	return errors;
}

export function toDiscoveryNormalizedData(
	candidate: DraftCandidate,
): Record<string, unknown> {
	return {
		material_name: candidate.material.trim(),
		estimated_volume: (candidate.volume ?? "").trim(),
		frequency: (candidate.frequency ?? "").trim(),
		location_name: candidate.locationLabel?.trim() || null,
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
