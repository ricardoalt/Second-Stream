import type {
	WorkspaceBaseFieldUpdate,
	WorkspaceConfirmProposalEditItem,
	WorkspaceConfirmResponse,
	WorkspaceContextNoteResponse,
	WorkspaceCustomFieldUpdate,
	WorkspaceHydrateResponse,
	WorkspaceRefreshInsightsResponse,
} from "@/lib/types/workspace";
import { apiClient } from "./client";

export const workspaceAPI = {
	async hydrate(projectId: string): Promise<WorkspaceHydrateResponse> {
		return apiClient.get<WorkspaceHydrateResponse>(
			`/projects/${projectId}/workspace`,
		);
	},

	async updateBaseFields(
		projectId: string,
		baseFields: WorkspaceBaseFieldUpdate[],
	): Promise<WorkspaceHydrateResponse> {
		return apiClient.patch<WorkspaceHydrateResponse>(
			`/projects/${projectId}/workspace/base-fields`,
			{ base_fields: baseFields },
		);
	},

	async updateContextNote(
		projectId: string,
		text: string,
	): Promise<WorkspaceContextNoteResponse> {
		return apiClient.patch<WorkspaceContextNoteResponse>(
			`/projects/${projectId}/workspace/context-note`,
			{ text },
		);
	},

	async updateCustomFields(
		projectId: string,
		customFields: WorkspaceCustomFieldUpdate[],
	): Promise<WorkspaceHydrateResponse> {
		return apiClient.patch<WorkspaceHydrateResponse>(
			`/projects/${projectId}/workspace/custom-fields`,
			{ custom_fields: customFields },
		);
	},

	async refreshInsights(
		projectId: string,
	): Promise<WorkspaceRefreshInsightsResponse> {
		return apiClient.request<WorkspaceRefreshInsightsResponse>(
			`/projects/${projectId}/workspace/refresh-insights`,
			{ method: "POST", timeout: 120000 },
		);
	},

	async confirmProposals(
		projectId: string,
		batchId: string,
		proposals: WorkspaceConfirmProposalEditItem[],
	): Promise<WorkspaceConfirmResponse> {
		return apiClient.post<WorkspaceConfirmResponse>(
			`/projects/${projectId}/workspace/custom-fields/confirm`,
			{ batch_id: batchId, proposals },
		);
	},
};
