/**
 * Workspace v1 types — mirrors backend schemas/workspace.py (camelCase via BaseSchema)
 */

export type BaseFieldId =
	| "material_type"
	| "material_name"
	| "composition"
	| "volume"
	| "frequency";

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

export interface WorkspaceHydrateResponse {
	projectId: string;
	baseFields: WorkspaceBaseField[];
	customFields: WorkspaceCustomField[];
	evidenceItems: WorkspaceEvidenceItem[];
	contextNote: string | null;
	derived: WorkspaceDerivedInsights;
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
