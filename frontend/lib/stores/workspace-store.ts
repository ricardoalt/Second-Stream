import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { workspaceAPI } from "@/lib/api/workspace";
import type {
	BaseFieldId,
	WorkspaceBaseField,
	WorkspaceBaseFieldUpdate,
	WorkspaceConfirmProposalEditItem,
	WorkspaceCustomField,
	WorkspaceCustomFieldUpdate,
	WorkspaceDerivedInsights,
	WorkspaceEvidenceItem,
	WorkspaceHydrateResponse,
	WorkspacePhaseProgress,
	WorkspaceProposalBatch,
	WorkspaceProposalItem,
	WorkspaceQuestionAnswerUpdate,
	WorkspaceQuestionId,
	WorkspaceQuestionSuggestion,
	WorkspaceQuestionSuggestionReviewScope,
	WorkspaceQuickCaptureStatus,
} from "@/lib/types/workspace";
import { getErrorMessage, logger } from "@/lib/utils/logger";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type AutoAnalysisGuard = "idle" | "waiting" | "ran";

interface WorkspaceState {
	// Core data
	projectId: string | null;
	baseFields: WorkspaceBaseField[];
	customFields: WorkspaceCustomField[];
	evidenceItems: WorkspaceEvidenceItem[];
	contextNote: string;
	derived: WorkspaceDerivedInsights | null;
	questionnaireAnswers: Record<WorkspaceQuestionId, string>;
	questionnaireSuggestions: WorkspaceQuestionSuggestion[];
	phaseProgress: WorkspacePhaseProgress;
	firstIncompletePhase: 1 | 2 | 3 | 4;

	// Transient
	proposalBatch: WorkspaceProposalBatch | null;
	proposalModalOpen: boolean;

	// Dirty state — true while local edits haven't been confirmed by the server
	baseFieldsDirty: boolean;
	contextNoteDirty: boolean;
	customFieldsDirty: boolean;
	questionnaireAnswersDirty: boolean;
	summaryStale: boolean;
	newReadyEvidenceSinceAnalysis: boolean;
	newReadyEvidenceCountSinceAnalysis: number;
	hydratedProjectId: string | null;

	// Loading states
	initialized: boolean;
	hydrating: boolean;
	pendingHydrate: boolean;
	loading: boolean;
	refreshing: boolean;
	confirming: boolean;
	baseFieldsSaveStatus: SaveStatus;
	contextNoteSaveStatus: SaveStatus;
	customFieldsSaveStatus: SaveStatus;
	questionnaireSaveStatus: SaveStatus;
	reviewSuggestionsStatus: SaveStatus;
	error: string | null;
	backgroundHydrateError: string | null;
	quickCaptureStatus: WorkspaceQuickCaptureStatus;

	// Upload session — tracks files from current upload batch for auto-analysis
	uploadSessionFileIds: string[];
	autoAnalysisGuard: AutoAnalysisGuard;
	sessionHydrateNeeded: boolean;
	sessionHydrateRetries: number;

	// Actions
	hydrate: (projectId: string) => Promise<void>;
	applyHydrateData: (data: WorkspaceHydrateResponse) => void;
	updateBaseField: (fieldId: BaseFieldId, value: string) => void;
	saveBaseFields: (projectId: string) => Promise<void>;
	updateQuestionnaireAnswer: (
		questionId: WorkspaceQuestionId,
		value: string,
	) => void;
	reviewQuestionnaireSuggestions: (
		projectId: string,
		action: "accept" | "reject",
		scope: WorkspaceQuestionSuggestionReviewScope,
	) => Promise<void>;
	saveQuestionnaireAnswers: (projectId: string) => Promise<void>;
	updateContextNote: (text: string) => void;
	saveContextNote: (projectId: string) => Promise<void>;
	updateCustomField: (
		fieldId: string,
		updates: Partial<Pick<WorkspaceCustomField, "label" | "answer">>,
	) => void;
	saveCustomFields: (projectId: string) => Promise<void>;
	runAnalysis: (projectId: string) => Promise<void>;
	updateProposal: (
		tempId: string,
		updates: Partial<WorkspaceProposalItem>,
	) => void;
	confirmProposals: (projectId: string) => Promise<void>;
	closeProposalBatchModal: () => void;
	reopenProposalBatchModal: () => void;
	dismissProposalBatch: () => void;
	registerUploadedFile: (fileId: string) => void;
	clearUploadSession: () => void;
	clearUploadSessionSubset: (ids: string[]) => void;
	clearQuickCaptureStatus: () => void;
	clearBackgroundHydrateError: () => void;
	reset: () => void;
}

const INITIAL_DERIVED: WorkspaceDerivedInsights = {
	summary: null,
	facts: [],
	missingInformation: [],
	informationCoverage: 0,
	readiness: { isReady: false, missingBaseFields: [] },
	lastRefreshedAt: null,
};

const createInitialState = () => ({
	projectId: null as string | null,
	baseFields: [] as WorkspaceBaseField[],
	customFields: [] as WorkspaceCustomField[],
	evidenceItems: [] as WorkspaceEvidenceItem[],
	contextNote: "",
	derived: null as WorkspaceDerivedInsights | null,
	questionnaireAnswers: {} as Record<WorkspaceQuestionId, string>,
	questionnaireSuggestions: [] as WorkspaceQuestionSuggestion[],
	phaseProgress: { "1": false, "2": false, "3": false, "4": false },
	firstIncompletePhase: 1 as 1 | 2 | 3 | 4,
	proposalBatch: null as WorkspaceProposalBatch | null,
	proposalModalOpen: false,
	baseFieldsDirty: false,
	contextNoteDirty: false,
	customFieldsDirty: false,
	questionnaireAnswersDirty: false,
	summaryStale: false,
	newReadyEvidenceSinceAnalysis: false,
	newReadyEvidenceCountSinceAnalysis: 0,
	hydratedProjectId: null as string | null,
	initialized: false,
	hydrating: false,
	pendingHydrate: false,
	loading: false,
	refreshing: false,
	confirming: false,
	baseFieldsSaveStatus: "idle" as SaveStatus,
	contextNoteSaveStatus: "idle" as SaveStatus,
	customFieldsSaveStatus: "idle" as SaveStatus,
	questionnaireSaveStatus: "idle" as SaveStatus,
	reviewSuggestionsStatus: "idle" as SaveStatus,
	error: null as string | null,
	backgroundHydrateError: null as string | null,
	quickCaptureStatus: "idle" as WorkspaceQuickCaptureStatus,
	uploadSessionFileIds: [] as string[],
	autoAnalysisGuard: "idle" as AutoAnalysisGuard,
	sessionHydrateNeeded: false,
	sessionHydrateRetries: 0,
});

const SESSION_HYDRATE_MAX_RETRIES = 5;
const SESSION_HYDRATE_RETRY_DELAY_MS = 3_000;

function areQuestionnaireAnswersEqual(
	left: Record<string, string>,
	right: Record<string, string>,
): boolean {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) {
		return false;
	}

	for (const key of leftKeys) {
		if (left[key] !== right[key]) {
			return false;
		}
	}

	return true;
}

function getReviewScopeQuestionIds(
	suggestions: WorkspaceQuestionSuggestion[],
	scope: WorkspaceQuestionSuggestionReviewScope,
): WorkspaceQuestionId[] {
	if (scope.kind === "field") {
		return [scope.question_id];
	}

	if (scope.kind === "section") {
		return suggestions
			.filter(
				(suggestion) =>
					suggestion.status === "pending" &&
					suggestion.section === scope.section,
			)
			.map((suggestion) => suggestion.questionId);
	}

	return suggestions
		.filter(
			(suggestion) =>
				suggestion.status === "pending" && suggestion.phase === scope.phase,
		)
		.map((suggestion) => suggestion.questionId);
}

export const useWorkspaceStore = create<WorkspaceState>()(
	immer((set, get) => ({
		...createInitialState(),

		hydrate: async (projectId: string) => {
			const current = get();
			if (current.hydrating && current.projectId === projectId) {
				// Queue a follow-up so the session doesn't get stranded
				set((s) => {
					s.pendingHydrate = true;
				});
				return;
			}

			let isInitialLoad = false;
			set((s) => {
				// Only show loading spinner on initial load or project switch
				if (!s.initialized || s.projectId !== projectId) {
					s.loading = true;
					isInitialLoad = true;
				}
				s.hydrating = true;
				s.error = null;
				s.projectId = projectId;
			});

			try {
				const data = await workspaceAPI.hydrate(projectId);
				get().applyHydrateData(data);
			} catch (error) {
				const message = getErrorMessage(error, "Failed to load workspace");
				logger.error("Workspace hydrate failed", error, "WorkspaceStore");
				let hasPendingHydrate = false;
				let needsSessionReconcile = false;
				set((s) => {
					s.loading = false;
					s.hydrating = false;
					hasPendingHydrate = s.pendingHydrate;
					s.pendingHydrate = false;
					// Don't clear sessionHydrateNeeded — stays set until a success clears it
					needsSessionReconcile = s.sessionHydrateNeeded;
					if (isInitialLoad) {
						s.error = message;
					} else {
						s.backgroundHydrateError = message;
					}
				});
				if (hasPendingHydrate) {
					// Concurrent-call guard — retry immediately (one-shot, not a server fault)
					const pid = get().projectId;
					if (pid) get().hydrate(pid);
				} else if (needsSessionReconcile) {
					const retries = get().sessionHydrateRetries;
					if (retries < SESSION_HYDRATE_MAX_RETRIES) {
						const pid = get().projectId;
						if (pid) {
							set((s) => {
								s.sessionHydrateRetries += 1;
							});
							setTimeout(() => {
								const current = get();
								if (current.sessionHydrateNeeded && current.projectId === pid) {
									current.hydrate(pid);
								}
							}, SESSION_HYDRATE_RETRY_DELAY_MS);
						}
					} else {
						set((s) => {
							s.backgroundHydrateError =
								"Evidence is still processing or not yet visible. Retry analysis manually.";
							s.quickCaptureStatus = "retry_required";
							s.uploadSessionFileIds = [];
							s.autoAnalysisGuard = "idle";
							s.sessionHydrateNeeded = false;
							s.sessionHydrateRetries = 0;
						});
					}
				}
			}
		},

		applyHydrateData: (data: WorkspaceHydrateResponse) => {
			let hasPendingHydrate = false;
			let sessionStillNeeded = false;
			let shouldRunSessionAnalysis = false;
			let sessionFileIdsForAnalysis: string[] = [];
			let analysisProjectId: string | null = null;
			set((s) => {
				const isInitialHydrateForProject =
					s.hydratedProjectId !== data.projectId;
				const hadAnalysisBeforeHydrate = s.derived?.lastRefreshedAt !== null;
				// Snapshot completed evidence count before overwriting
				const prevCompletedCount = s.evidenceItems.filter(
					(i) => i.processingStatus === "completed",
				).length;

				s.projectId = data.projectId;
				s.baseFields = Array.isArray(data.baseFields) ? data.baseFields : [];
				s.customFields = Array.isArray(data.customFields)
					? data.customFields
					: [];
				s.evidenceItems = Array.isArray(data.evidenceItems)
					? data.evidenceItems
					: [];
				// Don't overwrite a dirty context note — local edit takes precedence
				if (!s.contextNoteDirty) {
					s.contextNote =
						typeof data.contextNote === "string" ? data.contextNote : "";
				}
				if (!s.questionnaireAnswersDirty) {
					s.questionnaireAnswers = data.questionnaireAnswers ?? {};
				}
				s.questionnaireSuggestions = Array.isArray(
					data.questionnaireSuggestions,
				)
					? data.questionnaireSuggestions
					: [];
				s.phaseProgress = data.phaseProgress ?? {
					"1": false,
					"2": false,
					"3": false,
					"4": false,
				};
				s.firstIncompletePhase = data.firstIncompletePhase ?? 1;
				if (data.derived && typeof data.derived === "object") {
					s.derived = {
						...data.derived,
						facts: Array.isArray(data.derived.facts) ? data.derived.facts : [],
						missingInformation: Array.isArray(data.derived.missingInformation)
							? data.derived.missingInformation
							: [],
					};
				} else {
					s.derived = null;
				}
				// Mark summary stale when completed evidence count grows
				const newCompletedCount = s.evidenceItems.filter(
					(i) => i.processingStatus === "completed",
				).length;
				if (
					!isInitialHydrateForProject &&
					newCompletedCount > prevCompletedCount
				) {
					const deltaCompleted = newCompletedCount - prevCompletedCount;
					s.summaryStale = true;
					if (hadAnalysisBeforeHydrate) {
						s.newReadyEvidenceSinceAnalysis = true;
						s.newReadyEvidenceCountSinceAnalysis += deltaCompleted;
					}
				}
				if (isInitialHydrateForProject) {
					s.newReadyEvidenceSinceAnalysis = false;
					s.newReadyEvidenceCountSinceAnalysis = 0;
				}
				s.hydratedProjectId = data.projectId;

				s.initialized = true;
				s.hydrating = false;
				s.loading = false;
				s.error = null;
				// Only clear the reconcile flag once all session files are visible
				const allSessionFilesVisible =
					s.uploadSessionFileIds.length === 0 ||
					s.uploadSessionFileIds.every((id) =>
						s.evidenceItems.some((item) => item.id === id),
					);
				if (allSessionFilesVisible) {
					s.sessionHydrateNeeded = false;
					s.sessionHydrateRetries = 0;
					if (
						s.uploadSessionFileIds.length > 0 &&
						s.autoAnalysisGuard === "waiting"
					) {
						s.autoAnalysisGuard = "ran";
						s.quickCaptureStatus = "analyzing";
						shouldRunSessionAnalysis = true;
						sessionFileIdsForAnalysis = [...s.uploadSessionFileIds];
						analysisProjectId = data.projectId;
					}
				}
				sessionStillNeeded = s.sessionHydrateNeeded;
				hasPendingHydrate = s.pendingHydrate;
				s.pendingHydrate = false;
			});
			if (hasPendingHydrate) {
				// Concurrent-call guard — retry immediately (one-shot)
				const projectId = get().projectId;
				if (projectId) get().hydrate(projectId);
			} else if (shouldRunSessionAnalysis && analysisProjectId) {
				void get()
					.runAnalysis(analysisProjectId)
					.then(() => {
						get().clearUploadSessionSubset(sessionFileIdsForAnalysis);
						set((s) => {
							if (s.uploadSessionFileIds.length === 0) {
								s.quickCaptureStatus = "completed";
								s.backgroundHydrateError = null;
							}
						});
					})
					.catch((error) => {
						logger.error(
							"Quick Capture analysis failed",
							error,
							"WorkspaceStore",
						);
						set((s) => {
							s.backgroundHydrateError =
								"Quick Capture analysis could not complete. Retry analysis manually.";
							s.quickCaptureStatus = "retry_required";
							s.uploadSessionFileIds = [];
							s.autoAnalysisGuard = "idle";
							s.sessionHydrateNeeded = false;
							s.sessionHydrateRetries = 0;
						});
					});
			} else if (sessionStillNeeded) {
				// Session files still missing — use same delayed/bounded path as error
				const retries = get().sessionHydrateRetries;
				if (retries < SESSION_HYDRATE_MAX_RETRIES) {
					const pid = get().projectId;
					if (pid) {
						set((s) => {
							s.sessionHydrateRetries += 1;
						});
						setTimeout(() => {
							const current = get();
							if (current.sessionHydrateNeeded && current.projectId === pid) {
								current.hydrate(pid);
							}
						}, SESSION_HYDRATE_RETRY_DELAY_MS);
					}
				} else {
					set((s) => {
						s.backgroundHydrateError =
							"Evidence is still processing or not yet visible. Retry analysis manually.";
						s.quickCaptureStatus = "retry_required";
						s.uploadSessionFileIds = [];
						s.autoAnalysisGuard = "idle";
						s.sessionHydrateNeeded = false;
						s.sessionHydrateRetries = 0;
					});
				}
			}
		},

		updateBaseField: (fieldId: BaseFieldId, value: string) => {
			set((s) => {
				const field = s.baseFields.find((f) => f.fieldId === fieldId);
				if (field) {
					field.value = value;
					field.isFilled = value.trim().length > 0;
				}
				s.baseFieldsSaveStatus = "idle";
				s.baseFieldsDirty = true;
				s.summaryStale = true;
			});
		},

		saveBaseFields: async (projectId: string) => {
			const fields = get().baseFields;
			// Send ALL fields (including empty) so backend can clear previously-filled values
			const updates: WorkspaceBaseFieldUpdate[] = fields.map((f) => ({
				field_id: f.fieldId,
				value: f.value,
			}));

			if (updates.length === 0) return;

			// Snapshot values being sent so we can detect if the user typed more
			const sentValues: Record<string, string> = {};
			for (const f of fields) sentValues[f.fieldId] = f.value;

			set((s) => {
				s.baseFieldsSaveStatus = "saving";
			});

			try {
				const data = await workspaceAPI.updateBaseFields(projectId, updates);
				const current = get().baseFields;
				const valuesStillMatch = current.every(
					(f) => sentValues[f.fieldId] === f.value,
				);
				if (valuesStillMatch) {
					get().applyHydrateData(data);
					set((s) => {
						s.baseFieldsSaveStatus = "saved";
						s.baseFieldsDirty = false;
					});
				} else {
					// User typed more while request was in flight — don't overwrite or clear dirty
					set((s) => {
						s.baseFieldsSaveStatus = "saved";
					});
				}
			} catch (error) {
				logger.error("Failed to save base fields", error, "WorkspaceStore");
				set((s) => {
					s.baseFieldsSaveStatus = "error";
				});
			}
		},

		updateQuestionnaireAnswer: (
			questionId: WorkspaceQuestionId,
			value: string,
		) => {
			set((s) => {
				s.questionnaireAnswers[questionId] = value;
				s.questionnaireAnswersDirty = true;
				s.questionnaireSaveStatus = "idle";
			});
		},

		reviewQuestionnaireSuggestions: async (
			projectId: string,
			action: "accept" | "reject",
			scope: WorkspaceQuestionSuggestionReviewScope,
		) => {
			const currentState = get();
			if (currentState.reviewSuggestionsStatus === "saving") return;

			const targetQuestionIds = getReviewScopeQuestionIds(
				currentState.questionnaireSuggestions,
				scope,
			);

			set((s) => {
				s.reviewSuggestionsStatus = "saving";
			});

			try {
				const response = await workspaceAPI.reviewQuestionnaireSuggestions(
					projectId,
					{ action, scope },
				);
				get().applyHydrateData(response.workspace);

				if (action === "accept" && targetQuestionIds.length > 0) {
					const ignored = new Set(response.ignoredQuestionIds);
					set((s) => {
						for (const questionId of targetQuestionIds) {
							if (ignored.has(questionId)) continue;
							const accepted =
								response.workspace.questionnaireAnswers[questionId];
							if (typeof accepted === "string") {
								s.questionnaireAnswers[questionId] = accepted;
							}
						}
					});
				}

				set((s) => {
					s.reviewSuggestionsStatus = "saved";
				});
			} catch (error) {
				logger.error(
					"Failed to review questionnaire suggestions",
					error,
					"WorkspaceStore",
				);
				set((s) => {
					s.reviewSuggestionsStatus = "error";
				});
				throw error;
			}
		},

		saveQuestionnaireAnswers: async (projectId: string) => {
			const currentState = get();
			if (!currentState.questionnaireAnswersDirty) return;
			if (currentState.questionnaireSaveStatus === "saving") return;

			const answers = currentState.questionnaireAnswers;
			const updates: WorkspaceQuestionAnswerUpdate[] = Object.entries(
				answers,
			).map(([questionId, value]) => ({
				question_id: questionId as WorkspaceQuestionId,
				value,
			}));

			if (updates.length === 0) return;

			const sentValues = { ...answers };

			set((s) => {
				s.questionnaireSaveStatus = "saving";
			});

			try {
				const data = await workspaceAPI.updateQuestionnaireAnswers(
					projectId,
					updates,
				);
				const latestAnswers = get().questionnaireAnswers;
				const valuesStillMatch = areQuestionnaireAnswersEqual(
					latestAnswers,
					sentValues,
				);
				if (valuesStillMatch) {
					set((s) => {
						s.questionnaireAnswersDirty = false;
					});
					get().applyHydrateData(data);
					set((s) => {
						s.questionnaireSaveStatus = "saved";
					});
				} else {
					set((s) => {
						s.questionnaireSaveStatus = "saved";
					});
				}
			} catch (error) {
				logger.error(
					"Failed to save questionnaire answers",
					error,
					"WorkspaceStore",
				);
				set((s) => {
					s.questionnaireSaveStatus = "error";
				});
			}
		},

		updateContextNote: (text: string) => {
			set((s) => {
				s.contextNote = text;
				s.contextNoteSaveStatus = "idle";
				s.contextNoteDirty = true;
				s.summaryStale = true;
			});
		},

		updateCustomField: (
			fieldId: string,
			updates: Partial<Pick<WorkspaceCustomField, "label" | "answer">>,
		) => {
			set((s) => {
				const field = s.customFields.find((f) => f.id === fieldId);
				if (!field) return;
				if (typeof updates.label === "string") {
					field.label = updates.label;
				}
				if (typeof updates.answer === "string") {
					field.answer = updates.answer;
				}
				s.customFieldsSaveStatus = "idle";
				s.customFieldsDirty = true;
				s.summaryStale = true;
			});
		},

		saveContextNote: async (projectId: string) => {
			const text = get().contextNote;

			set((s) => {
				s.contextNoteSaveStatus = "saving";
			});

			try {
				await workspaceAPI.updateContextNote(projectId, text);
				const contextNoteUnchanged = get().contextNote === text;
				set((s) => {
					s.contextNoteSaveStatus = "saved";
					if (contextNoteUnchanged) s.contextNoteDirty = false;
				});
			} catch (error) {
				logger.error("Failed to save context note", error, "WorkspaceStore");
				set((s) => {
					s.contextNoteSaveStatus = "error";
				});
			}
		},

		saveCustomFields: async (projectId: string) => {
			const customFields = get().customFields;
			const updates: WorkspaceCustomFieldUpdate[] = customFields.map(
				(field) => ({
					id: field.id,
					label: field.label,
					answer: field.answer,
				}),
			);

			if (updates.length === 0) return;

			const sentValues: Record<string, WorkspaceCustomFieldUpdate> = {};
			for (const update of updates) {
				sentValues[update.id] = update;
			}

			set((s) => {
				s.customFieldsSaveStatus = "saving";
			});

			try {
				const data = await workspaceAPI.updateCustomFields(projectId, updates);
				const current = get().customFields;
				const valuesStillMatch = current.every((field) => {
					const sent = sentValues[field.id];
					if (!sent) return false;
					return sent.label === field.label && sent.answer === field.answer;
				});
				if (valuesStillMatch) {
					get().applyHydrateData(data);
					set((s) => {
						s.customFieldsSaveStatus = "saved";
						s.customFieldsDirty = false;
					});
				} else {
					set((s) => {
						s.customFieldsSaveStatus = "saved";
					});
				}
			} catch (error) {
				logger.error("Failed to save custom fields", error, "WorkspaceStore");
				set((s) => {
					s.customFieldsSaveStatus = "error";
				});
			}
		},

		runAnalysis: async (projectId: string) => {
			set((s) => {
				s.refreshing = true;
			});

			try {
				const data = await workspaceAPI.refreshInsights(projectId);
				set((s) => {
					s.derived = data.derived;
					s.proposalBatch =
						data.proposalBatch.proposals.length > 0 ? data.proposalBatch : null;
					s.questionnaireSuggestions = Array.isArray(
						data.questionnaireSuggestions,
					)
						? data.questionnaireSuggestions
						: [];
					s.proposalModalOpen = data.proposalBatch.proposals.length > 0;
					s.refreshing = false;
					s.summaryStale = false;
					s.newReadyEvidenceSinceAnalysis = false;
					s.newReadyEvidenceCountSinceAnalysis = 0;
				});
			} catch (error) {
				logger.error("Workspace refresh failed", error, "WorkspaceStore");
				set((s) => {
					s.refreshing = false;
				});
				throw error;
			}
		},

		updateProposal: (
			tempId: string,
			updates: Partial<WorkspaceProposalItem>,
		) => {
			set((s) => {
				if (!s.proposalBatch) return;
				const proposal = s.proposalBatch.proposals.find(
					(p) => p.tempId === tempId,
				);
				if (proposal) {
					Object.assign(proposal, updates);
				}
			});
		},

		confirmProposals: async (projectId: string) => {
			const batch = get().proposalBatch;
			if (!batch) return;

			set((s) => {
				s.confirming = true;
			});

			try {
				const edits: WorkspaceConfirmProposalEditItem[] = batch.proposals.map(
					(proposal) => {
						const payload: WorkspaceConfirmProposalEditItem = {
							tempId: proposal.tempId,
							selected: proposal.selected,
						};
						if (proposal.selected) {
							payload.proposedAnswer = proposal.proposedAnswer;
							if (proposal.targetKind === "custom_field") {
								payload.proposedLabel = proposal.proposedLabel;
							}
						}
						return payload;
					},
				);
				const data = await workspaceAPI.confirmProposals(
					projectId,
					batch.batchId,
					edits,
				);
				get().applyHydrateData(data.workspace);
				set((s) => {
					s.proposalBatch = null;
					s.proposalModalOpen = false;
					s.confirming = false;
					s.summaryStale = true;
				});
			} catch (error) {
				logger.error("Failed to confirm proposals", error, "WorkspaceStore");
				set((s) => {
					s.confirming = false;
				});
				throw error;
			}
		},

		closeProposalBatchModal: () => {
			set((s) => {
				s.proposalModalOpen = false;
			});
		},

		reopenProposalBatchModal: () => {
			set((s) => {
				if (!s.proposalBatch) return;
				s.proposalModalOpen = true;
			});
		},

		dismissProposalBatch: () => {
			set((s) => {
				s.proposalBatch = null;
				s.proposalModalOpen = false;
			});
		},

		registerUploadedFile: (fileId: string) => {
			set((s) => {
				if (!s.uploadSessionFileIds.includes(fileId)) {
					s.uploadSessionFileIds.push(fileId);
				}
				if (s.autoAnalysisGuard === "idle" || s.autoAnalysisGuard === "ran") {
					s.autoAnalysisGuard = "waiting";
				}
				s.sessionHydrateNeeded = true;
				s.sessionHydrateRetries = 0;
				s.quickCaptureStatus = "pending";
				s.backgroundHydrateError = null;
			});
		},

		clearUploadSession: () => {
			set((s) => {
				s.uploadSessionFileIds = [];
				s.autoAnalysisGuard = "idle";
				s.sessionHydrateNeeded = false;
				s.sessionHydrateRetries = 0;
				s.quickCaptureStatus = "idle";
			});
		},

		clearUploadSessionSubset: (ids: string[]) => {
			set((s) => {
				s.uploadSessionFileIds = s.uploadSessionFileIds.filter(
					(id) => !ids.includes(id),
				);
				if (s.uploadSessionFileIds.length === 0) {
					s.autoAnalysisGuard = "idle";
					s.sessionHydrateNeeded = false;
					s.sessionHydrateRetries = 0;
				} else {
					// Newer files were added during analysis — re-arm for next cycle
					s.autoAnalysisGuard = "waiting";
					s.quickCaptureStatus = "pending";
				}
			});
		},

		clearQuickCaptureStatus: () => {
			set((s) => {
				s.quickCaptureStatus = "idle";
			});
		},

		clearBackgroundHydrateError: () => {
			set((s) => {
				s.backgroundHydrateError = null;
			});
		},

		reset: () => {
			set(createInitialState());
		},
	})),
);

// Selectors
export const useWorkspaceLoading = () => useWorkspaceStore((s) => s.loading);

export const useWorkspaceError = () => useWorkspaceStore((s) => s.error);

export const useWorkspaceBaseFields = () =>
	useWorkspaceStore(useShallow((s) => s.baseFields));

export const useWorkspaceCustomFields = () =>
	useWorkspaceStore(useShallow((s) => s.customFields));

export const useWorkspaceEvidence = () =>
	useWorkspaceStore(useShallow((s) => s.evidenceItems));

export const useWorkspaceDerived = () =>
	useWorkspaceStore((s) => s.derived ?? INITIAL_DERIVED);

export const useWorkspaceQuestionnaireSuggestions = () =>
	useWorkspaceStore(useShallow((s) => s.questionnaireSuggestions));

export const useWorkspaceReviewSuggestionsStatus = () =>
	useWorkspaceStore((s) => s.reviewSuggestionsStatus);

export const useWorkspaceProposalBatch = () =>
	useWorkspaceStore((s) => s.proposalBatch);

export const useWorkspaceProposalModalOpen = () =>
	useWorkspaceStore((s) => s.proposalModalOpen);

export const useWorkspaceSummaryStale = () =>
	useWorkspaceStore((s) => s.summaryStale);

export const useWorkspaceNewReadyEvidenceSinceAnalysis = () =>
	useWorkspaceStore((s) => s.newReadyEvidenceSinceAnalysis);

export const useWorkspaceActions = () =>
	useWorkspaceStore(
		useShallow((s) => ({
			hydrate: s.hydrate,
			updateBaseField: s.updateBaseField,
			saveBaseFields: s.saveBaseFields,
			updateQuestionnaireAnswer: s.updateQuestionnaireAnswer,
			reviewQuestionnaireSuggestions: s.reviewQuestionnaireSuggestions,
			saveQuestionnaireAnswers: s.saveQuestionnaireAnswers,
			updateContextNote: s.updateContextNote,
			saveContextNote: s.saveContextNote,
			updateCustomField: s.updateCustomField,
			saveCustomFields: s.saveCustomFields,
			runAnalysis: s.runAnalysis,
			updateProposal: s.updateProposal,
			confirmProposals: s.confirmProposals,
			closeProposalBatchModal: s.closeProposalBatchModal,
			reopenProposalBatchModal: s.reopenProposalBatchModal,
			dismissProposalBatch: s.dismissProposalBatch,
			registerUploadedFile: s.registerUploadedFile,
			clearUploadSession: s.clearUploadSession,
			clearUploadSessionSubset: s.clearUploadSessionSubset,
			clearQuickCaptureStatus: s.clearQuickCaptureStatus,
			clearBackgroundHydrateError: s.clearBackgroundHydrateError,
			reset: s.reset,
		})),
	);
