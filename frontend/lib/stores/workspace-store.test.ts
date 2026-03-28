import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { workspaceAPI } from "@/lib/api/workspace";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import type {
	WorkspaceHydrateResponse,
	WorkspaceQuestionAnswerUpdate,
	WorkspaceQuestionSuggestion,
} from "@/lib/types/workspace";

const originalUpdateQuestionnaireAnswers =
	workspaceAPI.updateQuestionnaireAnswers;
const originalReviewQuestionnaireSuggestions =
	workspaceAPI.reviewQuestionnaireSuggestions;

function buildHydrateResponse(
	answers: Record<string, string>,
	suggestions: WorkspaceQuestionSuggestion[] = [],
): WorkspaceHydrateResponse {
	return {
		projectId: "project-1",
		baseFields: [],
		customFields: [],
		evidenceItems: [],
		contextNote: null,
		questionnaireAnswers: answers,
		questionnaireSuggestions: suggestions,
		phaseProgress: {
			"1": Boolean(answers.q1),
			"2": Boolean(answers.q10),
			"3": Boolean(answers.q15),
			"4": Boolean(answers.q21),
		},
		firstIncompletePhase: answers.q10 ? 3 : 2,
		derived: {
			summary: null,
			facts: [],
			missingInformation: [],
			informationCoverage: 0,
			readiness: { isReady: false, missingBaseFields: [] },
			lastRefreshedAt: null,
		},
	};
}

function buildSuggestion(
	questionId: `q${number}`,
	{
		phase,
		section,
		suggestedValue,
	}: { phase: 1 | 2 | 3 | 4; section: string; suggestedValue: string },
): WorkspaceQuestionSuggestion {
	return {
		questionId,
		suggestedValue,
		status: "pending",
		phase,
		section,
		evidenceRefs: [],
		confidence: 82,
		updatedAt: "2026-03-27T00:00:00.000Z",
		hasConflict: false,
		confirmedAnswer: null,
	};
}

describe("workspace questionnaire persistence", () => {
	beforeEach(() => {
		useWorkspaceStore.getState().reset();
		workspaceAPI.updateQuestionnaireAnswers =
			originalUpdateQuestionnaireAnswers;
		workspaceAPI.reviewQuestionnaireSuggestions =
			originalReviewQuestionnaireSuggestions;
	});

	afterEach(() => {
		workspaceAPI.updateQuestionnaireAnswers =
			originalUpdateQuestionnaireAnswers;
		workspaceAPI.reviewQuestionnaireSuggestions =
			originalReviewQuestionnaireSuggestions;
	});

	it("marks questionnaire answer edits as dirty", () => {
		useWorkspaceStore
			.getState()
			.updateQuestionnaireAnswer("q1", "Spent Solvent A");

		const state = useWorkspaceStore.getState();
		expect(state.questionnaireAnswers.q1).toBe("Spent Solvent A");
		expect(state.questionnaireAnswersDirty).toBe(true);
		expect(state.questionnaireSaveStatus).toBe("idle");
	});

	it("persists questionnaire answers through workspace API", async () => {
		const apiMock = mock(
			async (_projectId: string, updates: WorkspaceQuestionAnswerUpdate[]) => {
				expect(updates).toEqual([
					{ question_id: "q1", value: "Spent Solvent A" },
					{ question_id: "q10", value: "" },
				]);
				return buildHydrateResponse({ q1: "Spent Solvent A", q10: "" });
			},
		);
		workspaceAPI.updateQuestionnaireAnswers = apiMock;

		useWorkspaceStore
			.getState()
			.updateQuestionnaireAnswer("q1", "Spent Solvent A");
		useWorkspaceStore.getState().updateQuestionnaireAnswer("q10", "");

		await useWorkspaceStore.getState().saveQuestionnaireAnswers("project-1");

		expect(apiMock).toHaveBeenCalledTimes(1);
		const state = useWorkspaceStore.getState();
		expect(state.questionnaireAnswersDirty).toBe(false);
		expect(state.questionnaireSaveStatus).toBe("saved");
		expect(state.firstIncompletePhase).toBe(2);
		expect(state.phaseProgress).toEqual({
			"1": true,
			"2": false,
			"3": false,
			"4": false,
		});
	});

	it("keeps newer local edits when a save response is stale", async () => {
		let resolveResponse: ((value: WorkspaceHydrateResponse) => void) | null =
			null;
		const pendingResponse = new Promise<WorkspaceHydrateResponse>((resolve) => {
			resolveResponse = resolve;
		});

		workspaceAPI.updateQuestionnaireAnswers = mock(async () => pendingResponse);

		useWorkspaceStore.getState().updateQuestionnaireAnswer("q1", "first value");
		const savePromise = useWorkspaceStore
			.getState()
			.saveQuestionnaireAnswers("project-1");

		useWorkspaceStore
			.getState()
			.updateQuestionnaireAnswer("q1", "newer local value");

		if (!resolveResponse) {
			throw new Error("Missing deferred resolver");
		}
		resolveResponse(buildHydrateResponse({ q1: "first value" }));
		await savePromise;

		const state = useWorkspaceStore.getState();
		expect(state.questionnaireAnswers.q1).toBe("newer local value");
		expect(state.questionnaireAnswersDirty).toBe(true);
		expect(state.questionnaireSaveStatus).toBe("saved");
	});

	it("keeps saved questionnaire answers after hydrate reload", () => {
		const savedPayload = buildHydrateResponse({
			q1: "Spent Solvent A",
			q10: "",
		});

		useWorkspaceStore.getState().applyHydrateData(savedPayload);
		useWorkspaceStore.getState().reset();
		useWorkspaceStore.getState().applyHydrateData(savedPayload);

		const state = useWorkspaceStore.getState();
		expect(state.questionnaireAnswers.q1).toBe("Spent Solvent A");
		expect(state.questionnaireAnswers.q10).toBe("");
		expect(state.phaseProgress).toEqual({
			"1": true,
			"2": false,
			"3": false,
			"4": false,
		});
		expect(state.firstIncompletePhase).toBe(2);
		expect(state.questionnaireAnswersDirty).toBe(false);
	});

	it("hydrates questionnaire suggestions for review state", () => {
		const suggestion: WorkspaceQuestionSuggestion = {
			questionId: "q1",
			suggestedValue: "AI suggested answer",
			status: "pending",
			phase: 1,
			section: "Stream Snapshot",
			evidenceRefs: [],
			confidence: 82,
			updatedAt: "2026-03-27T00:00:00.000Z",
			hasConflict: false,
			confirmedAnswer: null,
		};

		useWorkspaceStore
			.getState()
			.applyHydrateData(buildHydrateResponse({}, [suggestion]));

		const state = useWorkspaceStore.getState();
		expect(state.questionnaireSuggestions).toEqual([suggestion]);
	});

	it("reviews and accepts a questionnaire suggestion", async () => {
		const suggestion = buildSuggestion("q1", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI answer",
		});

		useWorkspaceStore
			.getState()
			.applyHydrateData(buildHydrateResponse({}, [suggestion]));

		const reviewMock = mock(async () => ({
			processedCount: 1,
			ignoredQuestionIds: [],
			workspace: buildHydrateResponse({ q1: "AI answer" }, []),
		}));
		workspaceAPI.reviewQuestionnaireSuggestions = reviewMock;

		await useWorkspaceStore
			.getState()
			.reviewQuestionnaireSuggestions("project-1", "accept", {
				kind: "field",
				question_id: "q1",
			});

		expect(reviewMock).toHaveBeenCalledTimes(1);
		expect(useWorkspaceStore.getState().questionnaireAnswers.q1).toBe(
			"AI answer",
		);
		expect(useWorkspaceStore.getState().questionnaireSuggestions).toEqual([]);
		expect(useWorkspaceStore.getState().reviewSuggestionsStatus).toBe("saved");
	});

	it("reviews and rejects a questionnaire suggestion per field", async () => {
		const suggestion = buildSuggestion("q1", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI answer",
		});

		useWorkspaceStore
			.getState()
			.applyHydrateData(
				buildHydrateResponse({ q1: "Manual answer" }, [suggestion]),
			);

		const reviewMock = mock(async () => ({
			processedCount: 1,
			ignoredQuestionIds: [],
			workspace: buildHydrateResponse({ q1: "Manual answer" }, []),
		}));
		workspaceAPI.reviewQuestionnaireSuggestions = reviewMock;

		await useWorkspaceStore
			.getState()
			.reviewQuestionnaireSuggestions("project-1", "reject", {
				kind: "field",
				question_id: "q1",
			});

		expect(reviewMock).toHaveBeenCalledWith("project-1", {
			action: "reject",
			scope: { kind: "field", question_id: "q1" },
		});
		expect(useWorkspaceStore.getState().questionnaireAnswers.q1).toBe(
			"Manual answer",
		);
		expect(useWorkspaceStore.getState().questionnaireSuggestions).toEqual([]);
	});

	it("accepts all pending suggestions in a section", async () => {
		const q1 = buildSuggestion("q1", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI q1",
		});
		const q2 = buildSuggestion("q2", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI q2",
		});
		const q10 = buildSuggestion("q10", {
			phase: 2,
			section: "Current Handling",
			suggestedValue: "AI q10",
		});

		useWorkspaceStore
			.getState()
			.applyHydrateData(buildHydrateResponse({}, [q1, q2, q10]));

		const reviewMock = mock(async () => ({
			processedCount: 2,
			ignoredQuestionIds: [],
			workspace: buildHydrateResponse({ q1: "AI q1", q2: "AI q2" }, [q10]),
		}));
		workspaceAPI.reviewQuestionnaireSuggestions = reviewMock;

		await useWorkspaceStore
			.getState()
			.reviewQuestionnaireSuggestions("project-1", "accept", {
				kind: "section",
				section: "Stream Snapshot",
			});

		const state = useWorkspaceStore.getState();
		expect(state.questionnaireAnswers.q1).toBe("AI q1");
		expect(state.questionnaireAnswers.q2).toBe("AI q2");
		expect(state.questionnaireAnswers.q10).toBeUndefined();
		expect(state.questionnaireSuggestions).toEqual([q10]);
	});

	it("rejects all pending suggestions in a section", async () => {
		const q1 = buildSuggestion("q1", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI q1",
		});
		const q2 = buildSuggestion("q2", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI q2",
		});
		const q10 = buildSuggestion("q10", {
			phase: 2,
			section: "Current Handling",
			suggestedValue: "AI q10",
		});

		useWorkspaceStore
			.getState()
			.applyHydrateData(buildHydrateResponse({ q1: "Manual" }, [q1, q2, q10]));

		const reviewMock = mock(async () => ({
			processedCount: 2,
			ignoredQuestionIds: [],
			workspace: buildHydrateResponse({ q1: "Manual" }, [q10]),
		}));
		workspaceAPI.reviewQuestionnaireSuggestions = reviewMock;

		await useWorkspaceStore
			.getState()
			.reviewQuestionnaireSuggestions("project-1", "reject", {
				kind: "section",
				section: "Stream Snapshot",
			});

		const state = useWorkspaceStore.getState();
		expect(state.questionnaireAnswers.q1).toBe("Manual");
		expect(state.questionnaireAnswers.q2).toBeUndefined();
		expect(state.questionnaireSuggestions).toEqual([q10]);
	});

	it("rejects all pending suggestions in a phase", async () => {
		const q1 = buildSuggestion("q1", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI q1",
		});
		const q2 = buildSuggestion("q2", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI q2",
		});
		const q15 = buildSuggestion("q15", {
			phase: 3,
			section: "Technical Confidence",
			suggestedValue: "AI q15",
		});

		useWorkspaceStore
			.getState()
			.applyHydrateData(buildHydrateResponse({ q1: "Manual" }, [q1, q2, q15]));

		const reviewMock = mock(async () => ({
			processedCount: 2,
			ignoredQuestionIds: [],
			workspace: buildHydrateResponse({ q1: "Manual" }, [q15]),
		}));
		workspaceAPI.reviewQuestionnaireSuggestions = reviewMock;

		await useWorkspaceStore
			.getState()
			.reviewQuestionnaireSuggestions("project-1", "reject", {
				kind: "phase",
				phase: 1,
			});

		const state = useWorkspaceStore.getState();
		expect(state.questionnaireAnswers.q1).toBe("Manual");
		expect(state.questionnaireSuggestions).toEqual([q15]);
	});

	it("keeps local answer when accept returns no inference for a field", async () => {
		const q1 = buildSuggestion("q1", {
			phase: 1,
			section: "Stream Snapshot",
			suggestedValue: "AI q1",
		});

		useWorkspaceStore
			.getState()
			.applyHydrateData(buildHydrateResponse({ q1: "Manual" }, [q1]));

		const reviewMock = mock(async () => ({
			processedCount: 0,
			ignoredQuestionIds: ["q1"],
			workspace: buildHydrateResponse({ q1: "Manual" }, [q1]),
		}));
		workspaceAPI.reviewQuestionnaireSuggestions = reviewMock;

		await useWorkspaceStore
			.getState()
			.reviewQuestionnaireSuggestions("project-1", "accept", {
				kind: "field",
				question_id: "q1",
			});

		const state = useWorkspaceStore.getState();
		expect(state.questionnaireAnswers.q1).toBe("Manual");
		expect(state.questionnaireSuggestions).toEqual([q1]);
		expect(state.reviewSuggestionsStatus).toBe("saved");
	});
});
