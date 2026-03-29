/**
 * Workspace v1 types — mirrors backend schemas/workspace.py (camelCase via BaseSchema)
 */

export type BaseFieldId =
	| "material_type"
	| "material_name"
	| "composition"
	| "volume"
	| "frequency";

export type WorkspaceQuestionId = `q${number}`;

export type WorkspaceQuickCaptureStatus =
	| "idle"
	| "pending"
	| "analyzing"
	| "completed"
	| "retry_required";

export type WorkspacePhaseProgress = {
	"1": boolean;
	"2": boolean;
	"3": boolean;
	"4": boolean;
};

// Response type — field names match camelCase serialization from backend BaseSchema
export interface WorkspaceBaseField {
	fieldId: BaseFieldId;
	label: string;
	value: string;
	required: boolean;
	isFilled: boolean;
}

// Request type — snake_case accepted by backend (populate_by_name=True)
export interface WorkspaceBaseFieldUpdate {
	field_id: BaseFieldId;
	value: string;
}

export interface WorkspaceEvidenceRef {
	fileId: string;
	filename: string;
	page: number | null;
	excerpt: string | null;
}

export interface WorkspaceCustomField {
	id: string;
	label: string;
	answer: string;
	createdAt: string;
	createdBy: "ai_confirmed";
	evidenceRefs: WorkspaceEvidenceRef[];
	confidence: number | null;
}

export interface WorkspaceCustomFieldUpdate {
	id: string;
	label: string;
	answer: string;
}

export interface WorkspaceEvidenceItem {
	id: string;
	filename: string;
	category: string;
	processingStatus: "queued" | "processing" | "completed" | "failed";
	uploadedAt: string;
	summary: string | null;
	facts: string[];
	processingError: string | null;
}

export interface WorkspaceReadiness {
	isReady: boolean;
	missingBaseFields: string[];
}

export interface WorkspaceDerivedInsights {
	summary: string | null;
	facts: string[];
	missingInformation: string[];
	informationCoverage: number;
	readiness: WorkspaceReadiness;
	lastRefreshedAt: string | null;
}

export interface WorkspaceQuestionSuggestion {
	questionId: WorkspaceQuestionId;
	suggestedValue: string;
	status: "pending" | "rejected";
	phase: 1 | 2 | 3 | 4;
	section: string;
	evidenceRefs: WorkspaceEvidenceRef[];
	confidence: number | null;
	updatedAt: string;
	hasConflict: boolean;
	confirmedAnswer: string | null;
}

export type WorkspaceQuestionSuggestionReviewScope =
	| {
			kind: "field";
			question_id: WorkspaceQuestionId;
	  }
	| {
			kind: "section";
			section: string;
	  }
	| {
			kind: "phase";
			phase: 1 | 2 | 3 | 4;
	  };

export interface WorkspaceQuestionSuggestionReviewRequest {
	action: "accept" | "reject";
	scope: WorkspaceQuestionSuggestionReviewScope;
}

export interface WorkspaceQuestionSuggestionReviewResponse {
	processedCount: number;
	ignoredQuestionIds: WorkspaceQuestionId[];
	workspace: WorkspaceHydrateResponse;
}

export interface WorkspaceHydrateResponse {
	projectId: string;
	baseFields: WorkspaceBaseField[];
	customFields: WorkspaceCustomField[];
	evidenceItems: WorkspaceEvidenceItem[];
	contextNote: string | null;
	questionnaireAnswers: Record<WorkspaceQuestionId, string>;
	questionnaireSuggestions: WorkspaceQuestionSuggestion[];
	phaseProgress: WorkspacePhaseProgress;
	firstIncompletePhase: 1 | 2 | 3 | 4;
	derived: WorkspaceDerivedInsights;
}

export interface WorkspaceQuestionAnswerUpdate {
	question_id: WorkspaceQuestionId;
	value: string;
}

export interface WorkspaceProposalItem {
	tempId: string;
	targetKind: "base_field" | "custom_field";
	baseFieldId: BaseFieldId | null;
	existingCustomFieldId: string | null;
	proposedLabel: string;
	proposedAnswer: string;
	selected: boolean;
	evidenceRefs: WorkspaceEvidenceRef[];
	confidence: number | null;
}

export interface WorkspaceConfirmProposalEditItem {
	tempId: string;
	selected: boolean;
	proposedLabel?: string;
	proposedAnswer?: string;
}

export interface WorkspaceProposalBatch {
	batchId: string;
	proposals: WorkspaceProposalItem[];
	generatedAt: string;
}

export interface WorkspaceRefreshInsightsResponse {
	derived: WorkspaceDerivedInsights;
	proposalBatch: WorkspaceProposalBatch;
	questionnaireSuggestions: WorkspaceQuestionSuggestion[];
}

export interface WorkspaceConfirmResponse {
	createdFields: WorkspaceCustomField[];
	ignoredTempIds: string[];
	workspace: WorkspaceHydrateResponse;
}

export interface WorkspaceContextNoteResponse {
	text: string;
	updatedAt: string;
}

export interface WorkspaceOfferNavigationTarget {
	projectId: string;
	proposalId: string;
}

export interface WorkspaceCompleteDiscoveryResponse {
	message: string;
	offer: WorkspaceOfferNavigationTarget;
}
