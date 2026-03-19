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
	WorkspaceProposalBatch,
	WorkspaceProposalItem,
} from "@/lib/types/workspace";
import { getErrorMessage, logger } from "@/lib/utils/logger";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface WorkspaceState {
	// Core data
	projectId: string | null;
	baseFields: WorkspaceBaseField[];
	customFields: WorkspaceCustomField[];
	evidenceItems: WorkspaceEvidenceItem[];
	contextNote: string;
	derived: WorkspaceDerivedInsights | null;

	// Transient
	proposalBatch: WorkspaceProposalBatch | null;
	proposalModalOpen: boolean;

	// Dirty state — true while local edits haven't been confirmed by the server
	baseFieldsDirty: boolean;
	contextNoteDirty: boolean;
	customFieldsDirty: boolean;
	summaryStale: boolean;
	newReadyEvidenceSinceAnalysis: boolean;
	newReadyEvidenceCountSinceAnalysis: number;
	hydratedProjectId: string | null;

	// Loading states
	loading: boolean;
	refreshing: boolean;
	confirming: boolean;
	baseFieldsSaveStatus: SaveStatus;
	contextNoteSaveStatus: SaveStatus;
	customFieldsSaveStatus: SaveStatus;
	error: string | null;

	// Actions
	hydrate: (projectId: string) => Promise<void>;
	applyHydrateData: (data: WorkspaceHydrateResponse) => void;
	updateBaseField: (fieldId: BaseFieldId, value: string) => void;
	saveBaseFields: (projectId: string) => Promise<void>;
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
	proposalBatch: null as WorkspaceProposalBatch | null,
	proposalModalOpen: false,
	baseFieldsDirty: false,
	contextNoteDirty: false,
	customFieldsDirty: false,
	summaryStale: false,
	newReadyEvidenceSinceAnalysis: false,
	newReadyEvidenceCountSinceAnalysis: 0,
	hydratedProjectId: null as string | null,
	loading: false,
	refreshing: false,
	confirming: false,
	baseFieldsSaveStatus: "idle" as SaveStatus,
	contextNoteSaveStatus: "idle" as SaveStatus,
	customFieldsSaveStatus: "idle" as SaveStatus,
	error: null as string | null,
});

export const useWorkspaceStore = create<WorkspaceState>()(
	immer((set, get) => ({
		...createInitialState(),

		hydrate: async (projectId: string) => {
			const current = get();
			if (current.loading && current.projectId === projectId) return;

			set((s) => {
				s.loading = true;
				s.error = null;
				s.projectId = projectId;
			});

			try {
				const data = await workspaceAPI.hydrate(projectId);
				get().applyHydrateData(data);
			} catch (error) {
				const message = getErrorMessage(error, "Failed to load workspace");
				logger.error("Workspace hydrate failed", error, "WorkspaceStore");
				set((s) => {
					s.loading = false;
					s.error = message;
				});
			}
		},

		applyHydrateData: (data: WorkspaceHydrateResponse) => {
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

				s.loading = false;
				s.error = null;
			});
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
			reset: s.reset,
		})),
	);
