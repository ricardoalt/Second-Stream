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

function buildSession(
	overrides?: Partial<DiscoverySessionResult>,
): DiscoverySessionResult {
	return {
		id: "session-1",
		companyId: "company-1",
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
				clientId: "company-1",
				locationId: "location-1",
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
		expect(errors.volume).toBeDefined();
		expect(errors.frequency).toBeDefined();
		expect(decideDraft).not.toHaveBeenCalled();
	});

	it("process & finalize all confirms pending via API and keeps unresolved as drafts", async () => {
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
		const outcome = await discoveryWizardModule.processFinalizeAllCandidates({
			candidates,
			decideDiscoveryDraft: decideDraft,
		});

		expect(decideDraft).toHaveBeenCalledTimes(2);
		expect(outcome.confirmedIds.sort()).toEqual([
			"pending-valid-1",
			"pending-valid-2",
		]);
		expect(outcome.validationById["pending-invalid"]?.material).toBeDefined();
		expect(outcome.updatedCandidates).toEqual([
			{ ...candidates[0], status: "confirmed" },
			{ ...candidates[1], status: "confirmed" },
			{ ...candidates[2], status: "skipped" },
			candidates[3],
		]);
	});

	it("requires selected location before discovery can start", () => {
		expect(
			discoveryWizardModule.canStartDiscovery({
				companyId: "company-1",
				locationId: "",
				filesCount: 1,
				hasAudio: false,
				hasValidTextSource: false,
			}),
		).toBe(false);
	});

	it("resets selected location when client changes", () => {
		expect(
			discoveryWizardModule.resolveLocationIdOnCompanyChange({
				previousCompanyId: "company-1",
				nextCompanyId: "company-2",
				currentLocationId: "location-1",
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
		await discoveryWizardModule.confirmCandidateDecision({
			candidate,
			decideDiscoveryDraft: decideDraftWithoutFallback,
		});

		expect(decideDraftWithoutFallback).toHaveBeenCalledWith(
			"item-1",
			expect.not.objectContaining({
				locationResolution: expect.anything(),
			}),
		);
	});

	it("keeps discovery session creation company-scoped", () => {
		expect(
			discoveryWizardModule.resolveDiscoverySessionCompanyScope({
				companyId: "company-1",
				locationId: "location-1",
			}),
		).toBe("company-1");
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
			},
			storage,
		);

		const loaded = orchestrationModule.loadDiscoveryResumeState(storage);
		expect(loaded).toEqual(
			expect.objectContaining({
				sessionId: "session-1",
				companyId: "company-1",
				locationId: "location-1",
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
				savedAt: Date.now() - 5_000,
			}),
		);

		const loaded = orchestrationModule.loadDiscoveryResumeState(storage, 1000);
		expect(loaded).toBeNull();
		expect(storage.getItem("discovery-wizard-resume-session")).toBeNull();
	});
});
