import { describe, expect, it } from "bun:test";
import type { DraftCandidate } from "@/lib/types/discovery";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const modalModule = await import("./draft-confirmation-modal");

const pendingCandidate: DraftCandidate = {
	itemId: "item-1",
	runId: "run-1",
	clientId: "company-1",
	locationId: "location-1",
	material: "PET",
	volume: "100 kg/week",
	frequency: "weekly",
	units: "kg",
	locationLabel: "Plant A",
	source: "streams.csv",
	confidence: 0.9,
	status: "pending",
};

describe("DraftConfirmationModal helpers", () => {
	it("marks row busy for active confirm or bulk pending confirm", () => {
		expect(
			modalModule.isCandidateBusy({
				candidate: pendingCandidate,
				confirmingId: "item-1",
				isBulkConfirming: false,
			}),
		).toBe(true);

		expect(
			modalModule.isCandidateBusy({
				candidate: pendingCandidate,
				confirmingId: null,
				isBulkConfirming: true,
			}),
		).toBe(true);

		expect(
			modalModule.isCandidateBusy({
				candidate: { ...pendingCandidate, status: "confirmed" },
				confirmingId: null,
				isBulkConfirming: true,
			}),
		).toBe(false);
	});

	it("returns correct footer label for finalize action", () => {
		expect(modalModule.processFinalizeAllLabel(true)).toBe("Finishing…");
		expect(modalModule.processFinalizeAllLabel(false)).toBe("Finish Review");
	});

	it("treats reject action as optional", () => {
		expect(modalModule.canRejectCandidates(undefined)).toBe(false);
		expect(modalModule.canRejectCandidates(() => {})).toBe(true);
	});

	it("flags missing client and location as unresolved", () => {
		expect(
			modalModule.resolveCandidateResolutionState({
				...pendingCandidate,
				clientId: null,
				locationId: null,
			}),
		).toEqual({
			missingClient: true,
			missingLocation: true,
			ambiguousLocation: false,
			suggestedLocationLabel: null,
			requiresResolution: true,
		});
	});

	it("flags ambiguous location and exposes suggestion label", () => {
		expect(
			modalModule.resolveCandidateResolutionState({
				...pendingCandidate,
				locationId: null,
				locationResolutionHint: "ambiguous",
				locationSuggestionLabel: "Plant B (suggested)",
			}),
		).toEqual({
			missingClient: false,
			missingLocation: true,
			ambiguousLocation: true,
			suggestedLocationLabel: "Plant B (suggested)",
			requiresResolution: true,
		});
	});

	it("flags suggested location without forcing ambiguous state", () => {
		expect(
			modalModule.resolveCandidateResolutionState({
				...pendingCandidate,
				locationId: null,
				locationResolutionHint: "suggested",
				locationSuggestionLabel: "Plant A",
			}),
		).toEqual({
			missingClient: false,
			missingLocation: true,
			ambiguousLocation: false,
			suggestedLocationLabel: "Plant A",
			requiresResolution: true,
		});
	});

	it("marks fully resolved candidate as confirmable", () => {
		expect(
			modalModule.resolveCandidateResolutionState(pendingCandidate),
		).toEqual({
			missingClient: false,
			missingLocation: false,
			ambiguousLocation: false,
			suggestedLocationLabel: null,
			requiresResolution: false,
		});
	});

	it("keeps candidate confirmable even when volume/frequency are absent", () => {
		expect(
			modalModule.resolveCandidateResolutionState({
				...pendingCandidate,
				volume: null,
				frequency: null,
			}),
		).toEqual({
			missingClient: false,
			missingLocation: false,
			ambiguousLocation: false,
			suggestedLocationLabel: null,
			requiresResolution: false,
		});
	});

	it("resolves create-new availability for unlocked and locked client flows", () => {
		expect(
			modalModule.resolveCreateNewAvailability({
				...pendingCandidate,
				clientId: null,
				clientLocked: false,
			}),
		).toEqual({
			canCreateClient: true,
			canCreateLocation: false,
		});

		expect(
			modalModule.resolveCreateNewAvailability({
				...pendingCandidate,
				clientLocked: true,
			}),
		).toEqual({
			canCreateClient: false,
			canCreateLocation: true,
		});
	});

	it("summarizes mixed resolved and incomplete draft sets", () => {
		expect(
			modalModule.resolveCandidateBatchResolutionState([
				pendingCandidate,
				{ ...pendingCandidate, itemId: "item-2", locationId: null },
			]),
		).toEqual({
			resolvedCount: 1,
			incompleteCount: 1,
			hasMixedResolvedAndIncomplete: true,
		});

		expect(
			modalModule.resolveCandidateBatchResolutionState([
				{ ...pendingCandidate, itemId: "item-3", locationId: null },
			]),
		).toEqual({
			resolvedCount: 0,
			incompleteCount: 1,
			hasMixedResolvedAndIncomplete: false,
		});
	});

	it("keeps AI suggestions unresolved until explicit resolution ids exist", () => {
		expect(
			modalModule.resolveCandidateResolutionState({
				...pendingCandidate,
				clientId: null,
				locationId: null,
				suggestedClientName: "INDORAMA",
				suggestedLocationName: "Plant Norte",
			}),
		).toEqual({
			missingClient: true,
			missingLocation: true,
			ambiguousLocation: false,
			suggestedLocationLabel: "Plant Norte",
			requiresResolution: true,
		});
	});

	it("treats accepted create-new client suggestion as resolved client", () => {
		expect(
			modalModule.resolveCandidateResolutionState({
				...pendingCandidate,
				clientId: null,
				locationId: null,
				suggestedClientName: "INDORAMA",
				aiSuggestedClientAccepted: true,
			}),
		).toEqual({
			missingClient: false,
			missingLocation: true,
			ambiguousLocation: false,
			suggestedLocationLabel: null,
			requiresResolution: true,
		});
	});

	it("treats accepted create-new location suggestion as resolved when minimum fields exist", () => {
		expect(
			modalModule.resolveCandidateResolutionState({
				...pendingCandidate,
				clientId: null,
				locationId: null,
				suggestedClientName: "INDORAMA",
				aiSuggestedClientAccepted: true,
				suggestedLocationName: "Plant Norte",
				suggestedLocationCity: "Monterrey",
				suggestedLocationState: "NL",
				aiSuggestedLocationAccepted: true,
			}),
		).toEqual({
			missingClient: false,
			missingLocation: false,
			ambiguousLocation: false,
			suggestedLocationLabel: null,
			requiresResolution: false,
		});
	});

	it("keeps accepted create-new location unresolved when minimum fields are incomplete", () => {
		expect(
			modalModule.resolveCandidateResolutionState({
				...pendingCandidate,
				clientId: null,
				locationId: null,
				suggestedClientName: "INDORAMA",
				aiSuggestedClientAccepted: true,
				suggestedLocationName: "Plant Norte",
				suggestedLocationCity: null,
				suggestedLocationState: "NL",
				aiSuggestedLocationAccepted: true,
			}),
		).toEqual({
			missingClient: false,
			missingLocation: true,
			ambiguousLocation: false,
			suggestedLocationLabel: "Plant Norte",
			requiresResolution: true,
		});
	});

	it("blocks location resolution until client is resolved", () => {
		expect(
			modalModule.canResolveLocationForCandidate({
				...pendingCandidate,
				clientId: null,
				locationId: null,
				suggestedClientName: "INDORAMA",
				suggestedLocationName: "Plant Norte",
			}),
		).toBe(false);

		expect(
			modalModule.canResolveLocationForCandidate({
				...pendingCandidate,
				clientId: "company-77",
				locationId: null,
				suggestedClientName: "INDORAMA",
				suggestedLocationName: "Plant Norte",
			}),
		).toBe(true);

		expect(
			modalModule.canResolveLocationForCandidate({
				...pendingCandidate,
				clientId: null,
				locationId: null,
				suggestedClientName: "INDORAMA",
				aiSuggestedClientAccepted: true,
			}),
		).toBe(true);
	});

	it("allows confirm gating when create-new client and location suggestions are accepted", () => {
		expect(
			modalModule.resolveConfirmableDrafts([
				{
					...pendingCandidate,
					itemId: "create-new-accepted",
					clientId: null,
					locationId: null,
					suggestedClientName: "INDORAMA",
					aiSuggestedClientAccepted: true,
					suggestedLocationName: "Plant Norte",
					suggestedLocationCity: "Monterrey",
					suggestedLocationState: "NL",
					aiSuggestedLocationAccepted: true,
				},
			]),
		).toEqual({
			confirmableIds: ["create-new-accepted"],
			blockedIds: [],
		});
	});

	it("blocks incomplete drafts while allowing complete drafts in same batch", () => {
		expect(
			modalModule.resolveConfirmableDrafts([
				{ ...pendingCandidate, itemId: "complete-1" },
				{
					...pendingCandidate,
					itemId: "incomplete-1",
					locationId: null,
					suggestedClientName: "INDORAMA",
					suggestedLocationName: "Plant Norte",
				},
			]),
		).toEqual({
			confirmableIds: ["complete-1"],
			blockedIds: ["incomplete-1"],
		});
	});

	it("auto-applies resolved client to drafts sharing same suggested client", () => {
		expect(
			modalModule.applyClientResolutionBySuggestedClient({
				candidates: [
					{
						...pendingCandidate,
						itemId: "draft-1",
						clientId: null,
						locationId: null,
						suggestedClientName: "INDORAMA",
					},
					{
						...pendingCandidate,
						itemId: "draft-2",
						clientId: null,
						locationId: null,
						suggestedClientName: "INDORAMA",
					},
					{
						...pendingCandidate,
						itemId: "draft-3",
						clientId: null,
						locationId: null,
						suggestedClientName: "OTHER",
					},
				],
				targetItemId: "draft-1",
				resolvedClientId: "company-77",
			}),
		).toEqual([
			{
				...pendingCandidate,
				itemId: "draft-1",
				clientId: "company-77",
				locationId: null,
				suggestedClientName: "INDORAMA",
				locationResolutionHint: "missing",
				locationSuggestionLabel: null,
			},
			{
				...pendingCandidate,
				itemId: "draft-2",
				clientId: "company-77",
				locationId: null,
				suggestedClientName: "INDORAMA",
				locationResolutionHint: "missing",
				locationSuggestionLabel: null,
			},
			{
				...pendingCandidate,
				itemId: "draft-3",
				clientId: null,
				locationId: null,
				suggestedClientName: "OTHER",
			},
		]);
	});

	it("matches suggested client names app-side without auto-confirming", () => {
		expect(
			modalModule.resolveSuggestedClientMatches({
				candidates: [
					{
						...pendingCandidate,
						itemId: "draft-1",
						clientId: null,
						suggestedClientName: "indorama",
					},
				],
				companies: [
					{ id: "company-77", name: "INDORAMA" },
					{ id: "company-88", name: "Other" },
				],
			}),
		).toEqual({
			draftClientMatches: {
				"draft-1": ["company-77"],
			},
		});
	});

	it("prefills single-match suggested clients as existing selections", () => {
		expect(
			modalModule.resolveAutoPrefillClientResolutions({
				candidates: [
					{
						...pendingCandidate,
						itemId: "draft-1",
						clientId: null,
						suggestedClientName: "INDORAMA",
					},
					{
						...pendingCandidate,
						itemId: "draft-2",
						clientId: null,
						suggestedClientName: "OTHER",
					},
				],
				draftClientMatches: {
					"draft-1": ["company-77"],
					"draft-2": [],
				},
			}),
		).toEqual([{ itemId: "draft-1", clientId: "company-77" }]);
	});

	it("does not prefill when suggestion is ambiguous or already resolved", () => {
		expect(
			modalModule.resolveAutoPrefillClientResolutions({
				candidates: [
					{
						...pendingCandidate,
						itemId: "draft-1",
						clientId: null,
						suggestedClientName: "INDORAMA",
					},
					{
						...pendingCandidate,
						itemId: "draft-2",
						clientId: "company-existing",
						suggestedClientName: "ACME",
					},
				],
				draftClientMatches: {
					"draft-1": ["company-77", "company-88"],
					"draft-2": ["company-99"],
				},
			}),
		).toEqual([]);
	});

	it("exposes suggested client prefill only when no existing client is selected", () => {
		expect(
			modalModule.resolveClientSuggestedPrefillValue({
				...pendingCandidate,
				clientId: null,
				suggestedClientName: "EXXON",
			}),
		).toBe("EXXON");

		expect(
			modalModule.resolveClientSuggestedPrefillValue({
				...pendingCandidate,
				clientId: "company-1",
				suggestedClientName: "EXXON",
			}),
		).toBeNull();

		expect(
			modalModule.resolveClientSuggestedPrefillValue({
				...pendingCandidate,
				clientId: null,
				suggestedClientName: "EXXON - Baton Rouge",
			}),
		).toBeNull();
	});

	it("exposes suggested location prefill only when location is unresolved", () => {
		expect(
			modalModule.resolveLocationSuggestedPrefillValue({
				...pendingCandidate,
				locationId: null,
				suggestedLocationName: "Beaumont",
				suggestedLocationCity: "Beaumont",
				suggestedLocationState: "TX",
			}),
		).toBe("Beaumont - Beaumont");

		expect(
			modalModule.resolveLocationSuggestedPrefillValue({
				...pendingCandidate,
				locationId: "location-1",
				suggestedLocationName: "Beaumont",
				suggestedLocationCity: "Beaumont",
				suggestedLocationState: "TX",
			}),
		).toBeNull();
	});

	it("tracks AI client suggestion acceptance explicitly for create-new flow", () => {
		expect(
			modalModule.isAiClientSuggestionAccepted({
				candidate: {
					...pendingCandidate,
					clientId: null,
					suggestedClientName: "EXXON",
				},
				draftClientMatches: {
					"item-1": [],
				},
			}),
		).toBe(false);

		expect(
			modalModule.isAiClientSuggestionAccepted({
				candidate: {
					...pendingCandidate,
					clientId: null,
					suggestedClientName: "EXXON",
					aiSuggestedClientAccepted: true,
				},
				draftClientMatches: {
					"item-1": [],
				},
			}),
		).toBe(true);

		expect(
			modalModule.isAiClientSuggestionAccepted({
				candidate: {
					...pendingCandidate,
					clientId: null,
					suggestedClientName: "EXXON",
				},
				draftClientMatches: {
					"item-1": ["company-1"],
				},
			}),
		).toBe(false);
	});

	it("recognizes when AI location suggestion can be created immediately", () => {
		expect(
			modalModule.canCreateLocationFromSuggestion({
				...pendingCandidate,
				locationId: null,
				suggestedLocationName: "North Plant",
				suggestedLocationCity: "Monterrey",
				suggestedLocationState: "NL",
			}),
		).toBe(true);

		expect(
			modalModule.canCreateLocationFromSuggestion({
				...pendingCandidate,
				locationId: null,
				suggestedLocationName: "North Plant",
				suggestedLocationCity: null,
				suggestedLocationState: "NL",
			}),
		).toBe(false);
	});
});
