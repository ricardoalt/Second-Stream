import { describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DraftItemRow } from "@/lib/types/dashboard";
import type {
	DiscoverySessionResult,
	DraftCandidate,
} from "@/lib/types/discovery";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const discoveryWizardModule = await import("./discovery-wizard");
const orchestrationModule = await import("./use-discovery-orchestration");
const idleViewModule = await import("./views/idle-view");

function buildSession(
	overrides?: Partial<DiscoverySessionResult>,
): DiscoverySessionResult {
	return {
		id: "session-1",
		companyId: "company-1",
		locationId: null,
		assignedOwnerUserId: null,
		status: "review_ready",
		startedAt: null,
		completedAt: null,
		processingError: null,
		sources: [],
		summary: {
			totalSources: 1,
			fileSources: 1,
			audioSources: 0,
			textSources: 0,
			locationsFound: 0,
			wasteStreamsFound: 0,
			draftsNeedingConfirmation: 0,
			failedSources: 0,
		},
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("confirmTerminalDiscoverySnapshot", () => {
	it("uses confirmed terminal snapshot when second fetch has final summary", async () => {
		const initialTerminal = buildSession();
		const confirmedTerminal = buildSession({
			summary: {
				totalSources: 1,
				fileSources: 1,
				audioSources: 0,
				textSources: 0,
				locationsFound: 2,
				wasteStreamsFound: 3,
				draftsNeedingConfirmation: 3,
				failedSources: 0,
			},
		});

		const result = await discoveryWizardModule.confirmTerminalDiscoverySnapshot(
			{
				sessionId: "session-1",
				terminalSession: initialTerminal,
				getSession: async () => confirmedTerminal,
			},
		);

		expect(result.summary.draftsNeedingConfirmation).toBe(3);
	});
});

describe("review helpers", () => {
	it("maps dashboard draft rows to pending draft candidates", () => {
		const rows: DraftItemRow[] = [
			{
				kind: "draft_item",
				bucket: "needs_confirmation",
				itemId: "item-1",
				runId: "run-1",
				groupId: null,
				streamName: "PET flakes",
				companyId: "company-1",
				companyLabel: "Acme",
				locationLabel: "Plant A",
				volumeSummary: "120 kg/week",
				lastActivityAt: "2026-01-01T00:00:00Z",
				sourceType: "bulk_import",
				sourceFilename: "streams.csv",
				draftStatus: "pending_review",
				confidence: 0.91,
				draftKind: "linked",
				confirmable: true,
				target: null,
			},
		];

		expect(
			discoveryWizardModule.mapCandidateRows(rows, "company-1", "location-1"),
		).toEqual([
			{
				itemId: "item-1",
				runId: "run-1",
				suggestedClientName: "Acme",
				suggestedClientConfidence: null,
				suggestedClientEvidence: [],
				aiSuggestedClientAccepted: false,
				suggestedLocationName: "Plant A",
				aiSuggestedLocationAccepted: false,
				suggestedLocationCity: null,
				suggestedLocationState: null,
				suggestedLocationAddress: null,
				suggestedLocationConfidence: null,
				suggestedLocationEvidence: [],
				clientId: "company-1",
				clientLocked: true,
				locationId: "location-1",
				locationResolutionHint: "none",
				locationSuggestionLabel: null,
				material: "PET flakes",
				volume: "120 kg/week",
				frequency: "week",
				units: "kg",
				locationLabel: "Plant A",
				source: "streams.csv",
				confidence: 0.91,
				status: "pending",
			},
		]);
	});

	it("maps organization-scoped draft targets as unresolved candidates for explicit confirmation", () => {
		const rows: DraftItemRow[] = [
			{
				kind: "draft_item",
				bucket: "needs_confirmation",
				itemId: "item-org-1",
				runId: "run-org-1",
				groupId: null,
				streamName: "Mixed Org Stream",
				companyId: null,
				companyLabel: null,
				locationLabel: null,
				volumeSummary: "90 kg/week",
				lastActivityAt: "2026-01-01T00:00:00Z",
				sourceType: "bulk_import",
				sourceFilename: "org.csv",
				suggestedCompanyLabel: "Indorama",
				suggestedLocationName: "North Plant",
				suggestedLocationCity: "Monterrey",
				suggestedLocationState: "NL",
				suggestedLocationAddress: "Ave 123",
				draftStatus: "pending_review",
				confidence: 0.67,
				draftKind: "orphan_stream",
				confirmable: true,
				target: {
					targetKind: "confirmation_flow",
					runId: "run-org-1",
					itemId: "item-org-1",
					sourceType: "bulk_import",
					entrypointType: "organization",
					entrypointId: "org-1",
				},
			},
		];

		expect(discoveryWizardModule.mapCandidateRows(rows, null, null)).toEqual([
			{
				itemId: "item-org-1",
				runId: "run-org-1",
				suggestedClientName: "Indorama",
				suggestedClientConfidence: null,
				suggestedClientEvidence: [],
				aiSuggestedClientAccepted: false,
				suggestedLocationName: "North Plant",
				aiSuggestedLocationAccepted: false,
				suggestedLocationCity: "Monterrey",
				suggestedLocationState: "NL",
				suggestedLocationAddress: "Ave 123",
				suggestedLocationConfidence: null,
				suggestedLocationEvidence: [],
				clientId: null,
				clientLocked: false,
				locationId: null,
				locationResolutionHint: "missing",
				locationSuggestionLabel: null,
				material: "Mixed Org Stream",
				volume: "90 kg/week",
				frequency: "week",
				units: "kg",
				locationLabel: null,
				source: "org.csv",
				confidence: 0.67,
				status: "pending",
			},
		]);
	});

	it("keeps suggested company label intact when structured location fields are present", () => {
		const rows: DraftItemRow[] = [
			{
				kind: "draft_item",
				bucket: "needs_confirmation",
				itemId: "item-mixed-1",
				runId: "run-mixed-1",
				groupId: null,
				streamName: "Spent Solvent",
				companyId: null,
				companyLabel: null,
				suggestedCompanyLabel: "EXXON - Baton Rouge",
				locationLabel: null,
				suggestedLocationName: null,
				suggestedLocationCity: "Baton Rouge",
				suggestedLocationState: "LA",
				suggestedLocationAddress: null,
				volumeSummary: "70 kg/week",
				lastActivityAt: "2026-01-01T00:00:00Z",
				sourceType: "bulk_import",
				sourceFilename: "mixed.csv",
				draftStatus: "pending_review",
				confidence: 0.62,
				draftKind: "orphan_stream",
				queuePriority: "normal",
				queuePriorityReason: "normal",
				confirmable: true,
				target: {
					targetKind: "confirmation_flow",
					runId: "run-mixed-1",
					itemId: "item-mixed-1",
					sourceType: "bulk_import",
					entrypointType: "organization",
					entrypointId: "org-1",
				},
			},
		];

		expect(discoveryWizardModule.mapCandidateRows(rows, null, null)).toEqual([
			expect.objectContaining({
				suggestedClientName: "EXXON - Baton Rouge",
				suggestedLocationName: null,
				suggestedLocationCity: "Baton Rouge",
				suggestedLocationState: "LA",
			}),
		]);
	});

	it("does not split suggested company label when structured location suggestion is present", () => {
		const rows: DraftItemRow[] = [
			{
				kind: "draft_item",
				bucket: "needs_confirmation",
				itemId: "item-structured-1",
				runId: "run-structured-1",
				groupId: null,
				streamName: "Spent Catalyst",
				companyId: null,
				companyLabel: null,
				suggestedCompanyLabel: "EXXON - Baton Rouge",
				locationLabel: null,
				suggestedLocationName: "North Plant",
				suggestedLocationCity: "Baton Rouge",
				suggestedLocationState: "LA",
				suggestedLocationAddress: "500 Main",
				volumeSummary: "70 kg/week",
				lastActivityAt: "2026-01-01T00:00:00Z",
				sourceType: "bulk_import",
				sourceFilename: "structured.csv",
				draftStatus: "pending_review",
				confidence: 0.62,
				draftKind: "orphan_stream",
				queuePriority: "normal",
				queuePriorityReason: "normal",
				confirmable: true,
				target: {
					targetKind: "confirmation_flow",
					runId: "run-structured-1",
					itemId: "item-structured-1",
					sourceType: "bulk_import",
					entrypointType: "organization",
					entrypointId: "org-1",
				},
			},
		];

		expect(discoveryWizardModule.mapCandidateRows(rows, null, null)).toEqual([
			expect.objectContaining({
				suggestedClientName: "EXXON - Baton Rouge",
				suggestedLocationName: "North Plant",
				suggestedLocationCity: "Baton Rouge",
				suggestedLocationState: "LA",
				suggestedLocationAddress: "500 Main",
			}),
		]);
	});

	it("allows candidate confirmation when volume/frequency are missing but client/location/material are resolved", async () => {
		const candidate: DraftCandidate = {
			itemId: "item-optional-volume-frequency",
			runId: "run-optional",
			clientId: "company-1",
			locationId: "location-1",
			material: "Recovered PET",
			volume: null,
			frequency: null,
			units: null,
			locationLabel: "Plant A",
			source: "streams.csv",
			confidence: 0.8,
			status: "pending",
		};

		const decideDraft = mock(async () => ({}) as never);
		const errors = await discoveryWizardModule.confirmCandidateDecision({
			candidate,
			decideDiscoveryDraft: decideDraft,
		});

		expect(errors).toEqual({});
		expect(decideDraft).toHaveBeenCalledWith(
			"item-optional-volume-frequency",
			expect.objectContaining({
				action: "confirm",
			}),
		);
	});

	it("auto-applies client resolution to same suggested client names in batch", () => {
		const candidates: DraftCandidate[] = [
			{
				...{
					itemId: "item-1",
					runId: "run-1",
					clientId: null,
					locationId: null,
					material: "PET flakes",
					volume: "120 kg/week",
					frequency: "weekly",
					units: "kg",
					locationLabel: "Plant A",
					source: "streams.csv",
					confidence: 0.91,
					status: "pending" as const,
				},
				suggestedClientName: "INDORAMA",
				suggestedLocationName: "Plant A",
			},
			{
				...{
					itemId: "item-2",
					runId: "run-1",
					clientId: null,
					locationId: null,
					material: "PET resin",
					volume: "90 kg/week",
					frequency: "weekly",
					units: "kg",
					locationLabel: "Plant B",
					source: "streams.csv",
					confidence: 0.9,
					status: "pending" as const,
				},
				suggestedClientName: "INDORAMA",
				suggestedLocationName: "Plant B",
			},
			{
				...{
					itemId: "item-3",
					runId: "run-1",
					clientId: null,
					locationId: null,
					material: "Paper",
					volume: "20 kg/week",
					frequency: "weekly",
					units: "kg",
					locationLabel: "Plant C",
					source: "streams.csv",
					confidence: 0.8,
					status: "pending" as const,
				},
				suggestedClientName: "ACME",
				suggestedLocationName: "Plant C",
			},
		];

		expect(
			orchestrationModule.resolveCandidatesAfterFieldChange({
				candidates,
				itemId: "item-1",
				field: "clientId",
				value: "company-77",
			}),
		).toEqual([
			expect.objectContaining({
				itemId: "item-1",
				clientId: "company-77",
				locationId: null,
			}),
			expect.objectContaining({
				itemId: "item-2",
				clientId: "company-77",
				locationId: null,
			}),
			expect.objectContaining({
				itemId: "item-3",
				clientId: null,
				locationId: null,
			}),
		]);
	});

	it("routes to no-results when no candidates exist", () => {
		expect(
			discoveryWizardModule.shouldRouteToNoResults({
				draftsNeedingConfirmation: 0,
				mappedCandidatesCount: 0,
			}),
		).toBe(true);

		expect(
			discoveryWizardModule.shouldRouteToNoResults({
				draftsNeedingConfirmation: 2,
				mappedCandidatesCount: 0,
			}),
		).toBe(true);

		expect(
			discoveryWizardModule.shouldRouteToNoResults({
				draftsNeedingConfirmation: 2,
				mappedCandidatesCount: 2,
			}),
		).toBe(false);
	});

	it("auto-opens confirmation modal when AI candidates exist", () => {
		expect(
			discoveryWizardModule.resolveDiscoveryReviewStep({
				draftsNeedingConfirmation: 2,
				mappedCandidatesCount: 2,
			}),
		).toEqual({
			phase: "review",
			openCandidateModal: true,
		});

		expect(
			discoveryWizardModule.resolveDiscoveryReviewStep({
				draftsNeedingConfirmation: 2,
				mappedCandidatesCount: 0,
			}),
		).toEqual({
			phase: "no-results",
			openCandidateModal: false,
		});
	});

	it("uses guarded close warning while unresolved candidates remain", () => {
		expect(
			discoveryWizardModule.resolveCandidateModalInstruction({
				nextOpen: true,
				pendingCandidatesCount: 2,
			}),
		).toBe("open-review");

		expect(
			discoveryWizardModule.resolveCandidateModalInstruction({
				nextOpen: false,
				pendingCandidatesCount: 1,
			}),
		).toBe("warn-unresolved-drafts");

		expect(
			discoveryWizardModule.resolveCandidateModalInstruction({
				nextOpen: false,
				pendingCandidatesCount: 0,
			}),
		).toBe("close-complete");
	});

	it("routes processing terminal results to review or no-results", () => {
		expect(
			orchestrationModule.resolveProcessingTerminalRoute({
				status: "review_ready",
				draftsNeedingConfirmation: 2,
				mappedCandidatesCount: 2,
			}),
		).toEqual({
			phase: "review",
			openCandidateModal: true,
		});

		expect(
			orchestrationModule.resolveProcessingTerminalRoute({
				status: "review_ready",
				draftsNeedingConfirmation: 2,
				mappedCandidatesCount: 0,
			}),
		).toEqual({
			phase: "no-results",
			openCandidateModal: false,
		});

		expect(
			orchestrationModule.resolveProcessingTerminalRoute({
				status: "partial_failure",
				draftsNeedingConfirmation: 0,
				mappedCandidatesCount: 0,
			}),
		).toEqual({
			phase: "no-results",
			openCandidateModal: false,
		});
	});

	it("routes failed processing terminal results to error phase", () => {
		expect(
			orchestrationModule.resolveProcessingTerminalRoute({
				status: "failed",
				draftsNeedingConfirmation: 3,
				mappedCandidatesCount: 3,
			}),
		).toEqual({
			phase: "error",
			openCandidateModal: false,
		});
	});

	it("resolves discovery resume modes by status and pending drafts", () => {
		expect(
			orchestrationModule.resolveDiscoveryResumeMode({
				status: "processing",
				draftsNeedingConfirmation: 0,
			}),
		).toBe("processing");

		expect(
			orchestrationModule.resolveDiscoveryResumeMode({
				status: "review_ready",
				draftsNeedingConfirmation: 2,
			}),
		).toBe("review");

		expect(
			orchestrationModule.resolveDiscoveryResumeMode({
				status: "partial_failure",
				draftsNeedingConfirmation: 0,
			}),
		).toBe("terminal");

		expect(
			orchestrationModule.resolveDiscoveryResumeMode({
				status: "failed",
				draftsNeedingConfirmation: 4,
			}),
		).toBe("terminal");
	});

	it("builds reject decision payload for candidate deletion", async () => {
		const decideDraft = mock(async () => ({}) as never);

		await orchestrationModule.rejectCandidateDecision({
			itemId: "item-123",
			decideDiscoveryDraft: decideDraft,
		});

		expect(decideDraft).toHaveBeenCalledWith("item-123", {
			action: "reject",
			reviewNotes: "rejected_via_discovery_wizard",
		});
	});

	it("does not request destructive confirmation for candidate confirm actions", () => {
		const confirm = mock(() => false);

		expect(
			orchestrationModule.shouldProceedWithCandidateAction({
				action: "confirm",
				confirm,
			}),
		).toBe(true);
		expect(confirm).not.toHaveBeenCalled();
	});

	it("requires explicit destructive confirmation for candidate reject actions", () => {
		const confirm = mock(() => true);

		expect(
			orchestrationModule.shouldProceedWithCandidateAction({
				action: "reject",
				confirm,
			}),
		).toBe(true);
		expect(confirm).toHaveBeenCalledWith(
			orchestrationModule.REJECT_CANDIDATE_CONFIRMATION_MESSAGE,
		);
	});

	it("renders no-results actions for recovery paths", () => {
		const html = renderToStaticMarkup(
			createElement(discoveryWizardModule.NoResultsView, {
				onClose: () => {},
				onTryAgain: () => {},
				onCreateManually: () => {},
			}),
		);

		expect(html).toContain("No streams detected");
		expect(html).toContain("Close");
		expect(html).toContain("Try Again");
		expect(html).toContain("Create Manually");
	});
});

describe("candidate confirmation flow", () => {
	it("returns validation errors for incomplete single-candidate confirm", async () => {
		const candidate: DraftCandidate = {
			itemId: "item-1",
			runId: "run-1",
			clientId: "company-1",
			locationId: "location-1",
			material: "",
			volume: null,
			frequency: null,
			units: "kg",
			locationLabel: "Plant A",
			source: "streams.csv",
			confidence: 0.8,
			status: "pending",
		};

		const decideDraft = mock(async () => ({}) as never);
		const errors = await discoveryWizardModule.confirmCandidateDecision({
			candidate,
			decideDiscoveryDraft: decideDraft,
		});

		expect(errors.material).toBeDefined();
		expect(errors.volume).toBeUndefined();
		expect(errors.frequency).toBeUndefined();
		expect(decideDraft).not.toHaveBeenCalled();
	});

	it("finalize review keeps pending candidates as drafts without bulk confirming", async () => {
		const candidates: DraftCandidate[] = [
			{
				itemId: "pending-valid-1",
				runId: "run-1",
				clientId: "company-1",
				locationId: "location-1",
				material: "PET",
				volume: "100 kg/week",
				frequency: "weekly",
				units: "kg",
				locationLabel: "Plant A",
				source: "a.csv",
				confidence: 0.9,
				status: "pending",
			},
			{
				itemId: "pending-valid-2",
				runId: "run-1",
				clientId: "company-1",
				locationId: "location-2",
				material: "HDPE",
				volume: "80 kg/week",
				frequency: "weekly",
				units: "kg",
				locationLabel: "Plant B",
				source: "b.csv",
				confidence: 0.88,
				status: "pending",
			},
			{
				itemId: "pending-invalid",
				runId: "run-1",
				clientId: "company-1",
				locationId: null,
				material: "",
				volume: null,
				frequency: null,
				units: "kg",
				locationLabel: null,
				source: "c.csv",
				confidence: 0.4,
				status: "pending",
			},
			{
				itemId: "already-confirmed",
				runId: "run-1",
				clientId: "company-1",
				locationId: "location-3",
				material: "Paper",
				volume: "20 kg/week",
				frequency: "weekly",
				units: "kg",
				locationLabel: "Plant C",
				source: "d.csv",
				confidence: 0.9,
				status: "confirmed",
			},
		];

		const decideDraft = mock(async () => ({}) as never);
		const outcome =
			discoveryWizardModule.processFinalizeAllCandidates(candidates);

		expect(decideDraft).not.toHaveBeenCalled();
		expect(outcome.confirmedIds).toEqual(["already-confirmed"]);
		expect(outcome.updatedCandidates).toEqual([
			{ ...candidates[0], status: "skipped" },
			{ ...candidates[1], status: "skipped" },
			{ ...candidates[2], status: "skipped" },
			candidates[3],
		]);
	});

	it("allows none scope start when valid sources exist", () => {
		expect(
			discoveryWizardModule.canStartDiscovery({
				filesCount: 1,
				hasAudio: false,
				hasValidTextSource: false,
			}),
		).toBe(true);
	});

	it("allows starting discovery from voice notes only", () => {
		expect(
			discoveryWizardModule.canStartDiscovery({
				filesCount: 0,
				hasAudio: true,
				hasValidTextSource: false,
			}),
		).toBe(true);
	});

	it("allows starting discovery from valid text only", () => {
		expect(
			discoveryWizardModule.canStartDiscovery({
				filesCount: 0,
				hasAudio: false,
				hasValidTextSource: true,
			}),
		).toBe(true);
	});

	it("blocks discovery when no valid source was provided", () => {
		expect(
			discoveryWizardModule.canStartDiscovery({
				filesCount: 0,
				hasAudio: false,
				hasValidTextSource: false,
			}),
		).toBe(false);
	});

	it("explains when discovery is blocked by missing sources", () => {
		expect(
			idleViewModule.getDiscoveryBlockedReason({
				filesCount: 0,
				hasAudio: false,
				hasValidTextSource: false,
			}),
		).toBe("Add a file, voice note, or at least 20 characters of notes.");
	});

	it("builds discovery session create payload without pre-scope fields", () => {
		expect(
			orchestrationModule.resolveDiscoverySessionCreatePayload({
				assignedOwnerUserId: null,
			}),
		).toEqual({});

		expect(
			orchestrationModule.resolveDiscoverySessionCreatePayload({
				assignedOwnerUserId: "user-123",
			}),
		).toEqual({ assignedOwnerUserId: "user-123" });
	});

	it("auto-selects the only available location for discovery", () => {
		expect(
			idleViewModule.resolveDiscoveryAutoLocation({
				currentLocationId: "",
				availableLocationIds: ["location-1"],
			}),
		).toBe("location-1");
		expect(
			idleViewModule.resolveDiscoveryAutoLocation({
				currentLocationId: "location-2",
				availableLocationIds: ["location-1"],
			}),
		).toBe("location-2");
		expect(
			idleViewModule.resolveDiscoveryAutoLocation({
				currentLocationId: "",
				availableLocationIds: ["location-1", "location-2"],
			}),
		).toBe("");
	});

	it("blocks quick entry save when location is missing", () => {
		expect(
			discoveryWizardModule.canSaveQuickEntry({
				clientId: "company-1",
				locationId: "",
				material: "Spent Solvent",
				volume: "5000",
				units: "Gallons",
				frequency: "Weekly",
				isSaving: false,
			}),
		).toBe(false);
	});

	it("blocks quick entry save when required core fields are missing", () => {
		expect(
			discoveryWizardModule.canSaveQuickEntry({
				clientId: "company-1",
				locationId: "location-1",
				material: "Spent Solvent",
				volume: "",
				units: "Gallons",
				frequency: "Weekly",
				isSaving: false,
			}),
		).toBe(false);

		expect(
			discoveryWizardModule.canSaveQuickEntry({
				clientId: "company-1",
				locationId: "location-1",
				material: "Spent Solvent",
				volume: "5000",
				units: "Gallons",
				frequency: "",
				isSaving: false,
			}),
		).toBe(false);
	});

	it("applies locationResolution only when a location can be resolved", async () => {
		const candidate: DraftCandidate = {
			itemId: "item-1",
			runId: "run-1",
			clientId: "company-1",
			locationId: null,
			material: "PET",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationLabel: null,
			source: "streams.csv",
			confidence: 0.9,
			status: "pending",
		};

		const decideDraftWithFallback = mock(async () => ({}) as never);
		await discoveryWizardModule.confirmCandidateDecision({
			candidate,
			decideDiscoveryDraft: decideDraftWithFallback,
			defaultLocationId: "location-99",
		});

		expect(decideDraftWithFallback).toHaveBeenCalledWith(
			"item-1",
			expect.objectContaining({
				locationResolution: {
					mode: "existing",
					locationId: "location-99",
				},
			}),
		);

		const decideDraftWithoutFallback = mock(async () => ({}) as never);
		const validationErrors =
			await discoveryWizardModule.confirmCandidateDecision({
				candidate,
				decideDiscoveryDraft: decideDraftWithoutFallback,
			});

		expect(validationErrors.locationId).toBeDefined();
		expect(decideDraftWithoutFallback).not.toHaveBeenCalled();
	});

	it("builds discovery decision resolutions with company and location contracts", () => {
		const candidate: DraftCandidate = {
			itemId: "item-22",
			runId: "run-22",
			clientId: "company-22",
			locationId: "location-22",
			material: "PET",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationLabel: "Plant A",
			source: "x.csv",
			confidence: 0.9,
			status: "pending",
		};

		expect(
			orchestrationModule.resolveDiscoveryDecisionResolutions({
				candidate,
				defaultLocationId: "",
			}),
		).toEqual({
			companyResolution: {
				mode: "existing",
				companyId: "company-22",
			},
			locationResolution: {
				mode: "existing",
				locationId: "location-22",
			},
		});
	});

	it("uses default location fallback when candidate location is missing", () => {
		const candidate: DraftCandidate = {
			itemId: "item-23",
			runId: "run-23",
			clientId: "company-23",
			locationId: null,
			material: "Paper",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationLabel: null,
			source: "x.csv",
			confidence: 0.9,
			status: "pending",
		};

		expect(
			orchestrationModule.resolveDiscoveryDecisionResolutions({
				candidate,
				defaultLocationId: "location-fallback",
			}),
		).toEqual({
			companyResolution: {
				mode: "existing",
				companyId: "company-23",
			},
			locationResolution: {
				mode: "existing",
				locationId: "location-fallback",
			},
		});
	});

	it("builds discovery decision resolutions with create_new location when AI suggestion has enough data", () => {
		const candidate: DraftCandidate = {
			itemId: "item-create-new-location",
			runId: "run-create-new-location",
			clientId: "company-44",
			locationId: null,
			material: "Recovered paper",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationLabel: null,
			source: "x.csv",
			confidence: 0.9,
			status: "pending",
			suggestedLocationName: "Suggested Plant",
			aiSuggestedLocationAccepted: true,
			suggestedLocationCity: "Monterrey",
			suggestedLocationState: "NL",
			suggestedLocationAddress: "Ave 123",
		};

		expect(
			orchestrationModule.resolveDiscoveryDecisionResolutions({
				candidate,
				defaultLocationId: "",
			}),
		).toEqual({
			companyResolution: {
				mode: "existing",
				companyId: "company-44",
			},
			locationResolution: {
				mode: "create_new",
				name: "Suggested Plant",
				city: "Monterrey",
				state: "NL",
				address: "Ave 123",
			},
		});
	});

	it("does not build create_new location when suggestion was not accepted", () => {
		const candidate: DraftCandidate = {
			itemId: "item-create-new-location-unaccepted",
			runId: "run-create-new-location-unaccepted",
			clientId: "company-44",
			locationId: null,
			material: "Recovered paper",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationLabel: null,
			source: "x.csv",
			confidence: 0.9,
			status: "pending",
			suggestedLocationName: "Suggested Plant",
			suggestedLocationCity: "Monterrey",
			suggestedLocationState: "NL",
			aiSuggestedLocationAccepted: false,
		};

		expect(
			orchestrationModule.resolveDiscoveryDecisionResolutions({
				candidate,
				defaultLocationId: "",
			}),
		).toEqual({
			companyResolution: {
				mode: "existing",
				companyId: "company-44",
			},
		});
	});

	it("does not build create_new location when AI suggestion is incomplete", () => {
		const candidate: DraftCandidate = {
			itemId: "item-incomplete-location-suggestion",
			runId: "run-incomplete-location-suggestion",
			clientId: "company-55",
			locationId: null,
			material: "Recovered paper",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationLabel: null,
			source: "x.csv",
			confidence: 0.9,
			status: "pending",
			suggestedLocationName: "Suggested Plant",
			suggestedLocationCity: "",
			suggestedLocationState: "NL",
		};

		expect(
			orchestrationModule.resolveDiscoveryDecisionResolutions({
				candidate,
				defaultLocationId: "",
			}),
		).toEqual({
			companyResolution: {
				mode: "existing",
				companyId: "company-55",
			},
		});
	});

	it("builds create_new company resolution from AI suggestion when no client is explicitly selected", () => {
		const candidate: DraftCandidate = {
			itemId: "item-create-new-company",
			runId: "run-create-new-company",
			clientId: null,
			locationId: null,
			material: "Recovered paper",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationLabel: null,
			source: "x.csv",
			confidence: 0.9,
			status: "pending",
			suggestedClientName: "AI Suggested New Client",
			aiSuggestedClientAccepted: true,
		};

		expect(
			orchestrationModule.resolveDiscoveryDecisionResolutions({
				candidate,
				defaultLocationId: "",
			}),
		).toEqual({
			companyResolution: {
				mode: "create_new",
				name: "AI Suggested New Client",
			},
		});
	});

	it("does not build create_new company resolution when suggestion was not accepted", () => {
		const candidate: DraftCandidate = {
			itemId: "item-create-new-company-gated",
			runId: "run-create-new-company-gated",
			clientId: null,
			material: "Recovered paper",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationId: null,
			locationLabel: null,
			source: "x.csv",
			confidence: 0.9,
			status: "pending",
			suggestedClientName: "AI Suggested New Client",
			aiSuggestedClientAccepted: false,
		};

		expect(
			orchestrationModule.resolveDiscoveryDecisionResolutions({
				candidate,
				defaultLocationId: "",
			}),
		).toEqual({});
	});

	it("builds create_new company resolution only when AI suggestion is accepted", () => {
		const candidate: DraftCandidate = {
			itemId: "item-create-new-company-accepted",
			runId: "run-create-new-company-accepted",
			clientId: null,
			material: "Recovered paper",
			volume: "100 kg/week",
			frequency: "weekly",
			units: "kg",
			locationId: null,
			locationLabel: null,
			source: "x.csv",
			confidence: 0.9,
			status: "pending",
			suggestedClientName: "AI Suggested New Client",
			aiSuggestedClientAccepted: true,
		};

		expect(
			orchestrationModule.resolveDiscoveryDecisionResolutions({
				candidate,
				defaultLocationId: "",
			}),
		).toEqual({
			companyResolution: {
				mode: "create_new",
				name: "AI Suggested New Client",
			},
		});
	});

	it("shows Assign Owner only for org-admin or superadmin", () => {
		expect(
			idleViewModule.canShowAssignOwnerControl({
				isOrgAdmin: true,
				isSuperAdmin: false,
			}),
		).toBe(true);
		expect(
			idleViewModule.canShowAssignOwnerControl({
				isOrgAdmin: false,
				isSuperAdmin: true,
			}),
		).toBe(true);
		expect(
			idleViewModule.canShowAssignOwnerControl({
				isOrgAdmin: false,
				isSuperAdmin: false,
			}),
		).toBe(false);
	});

	it("filters assignable owners to active org-admin and field-agent excluding current user", () => {
		const filtered = idleViewModule.filterAssignableOwners(
			[
				{
					id: "u1",
					email: "org-admin@example.com",
					firstName: "Org",
					lastName: "Admin",
					isVerified: true,
					isActive: true,
					createdAt: "2026-01-01T00:00:00Z",
					isSuperuser: false,
					role: "org_admin",
					organizationId: "org-1",
					permissions: [],
					permissionsVersion: "v1",
				},
				{
					id: "u2",
					email: "field-agent@example.com",
					firstName: "Field",
					lastName: "Agent",
					isVerified: true,
					isActive: true,
					createdAt: "2026-01-01T00:00:00Z",
					isSuperuser: false,
					role: "field_agent",
					organizationId: "org-1",
					permissions: [],
					permissionsVersion: "v1",
				},
				{
					id: "u3",
					email: "inactive@example.com",
					firstName: "Inactive",
					lastName: "Agent",
					isVerified: true,
					isActive: false,
					createdAt: "2026-01-01T00:00:00Z",
					isSuperuser: false,
					role: "field_agent",
					organizationId: "org-1",
					permissions: [],
					permissionsVersion: "v1",
				},
				{
					id: "u4",
					email: "sales@example.com",
					firstName: "Sales",
					lastName: "Rep",
					isVerified: true,
					isActive: true,
					createdAt: "2026-01-01T00:00:00Z",
					isSuperuser: false,
					role: "sales",
					organizationId: "org-1",
					permissions: [],
					permissionsVersion: "v1",
				},
			],
			"u1",
		);

		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.id).toBe("u2");
	});

	it("formats assignable owner role labels", () => {
		expect(idleViewModule.formatAssignableOwnerRoleLabel("org_admin")).toBe(
			"Org Admin",
		);
		expect(idleViewModule.formatAssignableOwnerRoleLabel("field_agent")).toBe(
			"Field Agent",
		);
	});

	it("resolves owner payload for quick entry fallback", () => {
		expect(idleViewModule.resolveAssignedOwnerUserId("")).toBeUndefined();
		expect(idleViewModule.resolveAssignedOwnerUserId("self")).toBeUndefined();
		expect(idleViewModule.resolveAssignedOwnerUserId("user-123")).toBe(
			"user-123",
		);
	});
});

describe("discovery resume persistence", () => {
	function createStorageMock(): Storage {
		const map = new Map<string, string>();
		return {
			length: 0,
			clear() {
				map.clear();
			},
			getItem(key: string) {
				return map.get(key) ?? null;
			},
			key(index: number) {
				const keys = Array.from(map.keys());
				return keys[index] ?? null;
			},
			removeItem(key: string) {
				map.delete(key);
			},
			setItem(key: string, value: string) {
				map.set(key, value);
			},
		} as Storage;
	}

	it("persists and loads discovery resume state", () => {
		const storage = createStorageMock();

		orchestrationModule.persistDiscoveryResumeState(
			{
				sessionId: "session-1",
				companyId: "company-1",
				locationId: "location-1",
				assignedOwnerUserId: "user-1",
			},
			storage,
		);

		const loaded = orchestrationModule.loadDiscoveryResumeState(storage);
		expect(loaded).toEqual(
			expect.objectContaining({
				sessionId: "session-1",
				companyId: "company-1",
				locationId: "location-1",
				assignedOwnerUserId: "user-1",
			}),
		);
		expect(typeof loaded?.savedAt).toBe("number");
	});

	it("expires stale discovery resume state", () => {
		const storage = createStorageMock();

		storage.setItem(
			"discovery-wizard-resume-session",
			JSON.stringify({
				sessionId: "old-session",
				companyId: "company-1",
				locationId: "location-1",
				assignedOwnerUserId: null,
				savedAt: Date.now() - 5_000,
			}),
		);

		const loaded = orchestrationModule.loadDiscoveryResumeState(storage, 1000);
		expect(loaded).toBeNull();
		expect(storage.getItem("discovery-wizard-resume-session")).toBeNull();
	});
});
