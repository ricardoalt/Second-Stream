import type {
	BulkImportCompanyResolution,
	BulkImportLocationResolution,
} from "@/lib/api/bulk-import";
import {
	parseAiCreateCompanySelection,
	parseAiCreateLocationSelection,
} from "@/lib/discovery-ai-suggestions";
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

export const REQUIRED_FIELDS = new Set<CandidateEditableField>(["material"]);

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
			(candidate.clientId ?? "").trim().length > 0 ||
			hasSuggestedClient(candidate);
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

export function resolveDiscoveryDecisionResolutions(params: {
	candidate: DraftCandidate;
	defaultLocationId?: string | null;
}): {
	companyResolution?: BulkImportCompanyResolution;
	locationResolution?: BulkImportLocationResolution;
} {
	const { candidate, defaultLocationId } = params;
	const clientId = (candidate.clientId ?? "").trim();
	const locationId = (candidate.locationId ?? defaultLocationId ?? "").trim();
	const suggestedClientName = (candidate.suggestedClientName ?? "").trim();
	const aiClientAccepted = candidate.aiSuggestedClientAccepted === true;

	const companyResolution = clientId
		? {
				mode: "existing" as const,
				companyId: clientId,
			}
		: aiClientAccepted && suggestedClientName
			? {
					mode: "create_new" as const,
					name: suggestedClientName,
				}
			: undefined;

	const suggestedLocationName = (candidate.suggestedLocationName ?? "").trim();
	const suggestedLocationCity = (candidate.suggestedLocationCity ?? "").trim();
	const suggestedLocationState = (
		candidate.suggestedLocationState ?? ""
	).trim();
	const suggestedLocationAddress = (
		candidate.suggestedLocationAddress ?? ""
	).trim();
	const aiLocationAccepted = candidate.aiSuggestedLocationAccepted === true;

	const locationResolution = locationId
		? {
				mode: "existing" as const,
				locationId,
			}
		: aiLocationAccepted &&
				suggestedLocationName &&
				suggestedLocationCity &&
				suggestedLocationState
			? {
					mode: "create_new" as const,
					name: suggestedLocationName,
					city: suggestedLocationCity,
					state: suggestedLocationState,
					...(suggestedLocationAddress
						? { address: suggestedLocationAddress }
						: {}),
				}
			: undefined;

	return {
		...(companyResolution ? { companyResolution } : {}),
		...(locationResolution ? { locationResolution } : {}),
	};
}

function normalizeSuggestedName(value?: string | null): string {
	return (value ?? "").trim().toLocaleLowerCase();
}

function areCandidatesEquivalent(
	current: DraftCandidate,
	next: DraftCandidate,
): boolean {
	for (const key in current) {
		if (
			current[key as keyof DraftCandidate] !== next[key as keyof DraftCandidate]
		) {
			return false;
		}
	}

	for (const key in next) {
		if (!(key in current)) {
			return false;
		}
	}

	return true;
}

function mapCandidatesPreservingReference(params: {
	candidates: DraftCandidate[];
	mapper: (candidate: DraftCandidate) => DraftCandidate;
}): DraftCandidate[] {
	const { candidates, mapper } = params;
	let hasChanges = false;
	const nextCandidates = candidates.map((candidate) => {
		const nextCandidate = mapper(candidate);
		if (nextCandidate !== candidate) {
			hasChanges = true;
		}
		return nextCandidate;
	});

	return hasChanges ? nextCandidates : candidates;
}

export function resolveCandidatesAfterFieldChange(params: {
	candidates: DraftCandidate[];
	itemId: string;
	field: CandidateEditableField;
	value: string;
}): DraftCandidate[] {
	const { candidates, itemId, field, value } = params;
	if (field !== "clientId") {
		return mapCandidatesPreservingReference({
			candidates,
			mapper: (candidate) => {
				if (candidate.itemId !== itemId) {
					return candidate;
				}

				if (field !== "locationId") {
					return candidate[field] === value
						? candidate
						: {
								...candidate,
								[field]: value,
							};
				}

				const acceptedSuggestedLocationLabel =
					parseAiCreateLocationSelection(value);
				if (acceptedSuggestedLocationLabel !== null) {
					const nextCandidate = {
						...candidate,
						locationId: null,
						suggestedLocationName:
							candidate.suggestedLocationName ?? acceptedSuggestedLocationLabel,
						aiSuggestedLocationAccepted: true,
						locationResolutionHint: "suggested" as const,
					};
					return areCandidatesEquivalent(candidate, nextCandidate)
						? candidate
						: nextCandidate;
				}

				const nextCandidate = {
					...candidate,
					locationId: value,
					aiSuggestedLocationAccepted: false,
					locationResolutionHint: (value ? "none" : "missing") as
						| "none"
						| "missing",
				};

				if (
					(candidate.locationId ?? "") === value &&
					candidate.aiSuggestedLocationAccepted !== true
				) {
					return candidate;
				}

				return areCandidatesEquivalent(candidate, nextCandidate)
					? candidate
					: nextCandidate;
			},
		});
	}

	const acceptedSuggestedClientName = parseAiCreateCompanySelection(value);
	if (acceptedSuggestedClientName !== null) {
		return mapCandidatesPreservingReference({
			candidates,
			mapper: (candidate) => {
				if (candidate.itemId !== itemId) {
					return candidate;
				}

				if (candidate.clientLocked) {
					return candidate;
				}

				const nextCandidate = {
					...candidate,
					clientId: null,
					suggestedClientName: acceptedSuggestedClientName,
					aiSuggestedClientAccepted: true,
					locationId: null,
					aiSuggestedLocationAccepted: false,
					locationResolutionHint: "missing" as const,
					locationSuggestionLabel: null,
				};

				return areCandidatesEquivalent(candidate, nextCandidate)
					? candidate
					: nextCandidate;
			},
		});
	}

	const targetCandidate = candidates.find(
		(candidate) => candidate.itemId === itemId,
	);
	if (!targetCandidate) {
		return candidates;
	}

	const normalizedSuggestedClient = normalizeSuggestedName(
		targetCandidate.suggestedClientName,
	);

	return mapCandidatesPreservingReference({
		candidates,
		mapper: (candidate) => {
			const isTarget = candidate.itemId === itemId;
			const sameSuggestedClient =
				normalizedSuggestedClient.length > 0 &&
				normalizeSuggestedName(candidate.suggestedClientName) ===
					normalizedSuggestedClient;
			const shouldAutoApply =
				value.trim().length > 0 &&
				sameSuggestedClient &&
				!(candidate.clientId ?? "").trim();

			if (!isTarget && !shouldAutoApply) {
				return candidate;
			}

			if (candidate.clientLocked) {
				return candidate;
			}

			const currentClientId = candidate.clientId ?? "";
			const nextClientId = value;
			const shouldResetLocation = nextClientId !== currentClientId;

			if (
				!shouldResetLocation &&
				candidate.aiSuggestedClientAccepted !== true
			) {
				return candidate;
			}

			if (shouldResetLocation) {
				const nextCandidate = {
					...candidate,
					clientId: nextClientId,
					aiSuggestedClientAccepted: false,
					locationId: null,
					aiSuggestedLocationAccepted: false,
					locationResolutionHint: "missing" as const,
					locationSuggestionLabel: null,
				};

				return areCandidatesEquivalent(candidate, nextCandidate)
					? candidate
					: nextCandidate;
			}

			const nextCandidate = {
				...candidate,
				clientId: nextClientId,
				aiSuggestedClientAccepted: false,
				locationId: candidate.locationId,
			};

			return areCandidatesEquivalent(candidate, nextCandidate)
				? candidate
				: nextCandidate;
		},
	});
}
