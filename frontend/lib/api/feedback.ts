import { apiClient } from "./client";

export type FeedbackType =
	| "bug"
	| "incorrect_response"
	| "feature_request"
	| "general";

/** Shared feedback type configuration for consistent UI across components */
export const FEEDBACK_TYPE_CONFIG = {
	bug: { label: "Bug", variant: "destructive" as const },
	incorrect_response: {
		label: "Incorrect Response",
		variant: "warning" as const,
	},
	feature_request: { label: "Feature Request", variant: "default" as const },
	general: { label: "General", variant: "outline" as const },
} as const satisfies Record<
	FeedbackType,
	{
		label: string;
		variant:
			| "default"
			| "destructive"
			| "secondary"
			| "outline"
			| "success"
			| "warning";
	}
>;

export interface FeedbackPayload {
	content: string;
	feedbackType?: FeedbackType;
	pagePath?: string;
}

export interface FeedbackPublicCreateResponse {
	id: string;
	createdAt: string;
}

export interface AdminFeedbackUser {
	id: string;
	firstName: string;
	lastName: string;
}

export interface AdminFeedbackItem {
	id: string;
	content: string;
	feedbackType: FeedbackType | null;
	pagePath: string | null;
	userId: string;
	user: AdminFeedbackUser;
	resolvedAt: string | null;
	resolvedByUserId: string | null;
	createdAt: string;
	attachmentCount: number;
}

export interface FeedbackAttachment {
	id: string;
	originalFilename: string;
	sizeBytes: number;
	contentType: string | null;
	isPreviewable: boolean;
	createdAt: string;
}

export interface AdminFeedbackAttachment extends FeedbackAttachment {
	downloadUrl: string;
	previewUrl?: string | null;
}

export interface ListFeedbackParams {
	days?: 7 | 30;
	resolved?: boolean;
	feedbackType?: FeedbackType;
	limit?: number;
}

interface FeedbackRequestOptions {
	organizationId?: string;
}

function getOrgHeader(
	options?: FeedbackRequestOptions,
): Record<string, string> | undefined {
	if (!options?.organizationId) {
		return undefined;
	}

	return { "X-Organization-Id": options.organizationId };
}

export const feedbackAPI = {
	async submit(
		payload: FeedbackPayload,
	): Promise<FeedbackPublicCreateResponse> {
		return apiClient.post<FeedbackPublicCreateResponse>(
			"/feedback",
			payload as unknown as Record<string, unknown>,
		);
	},

	async list(
		params?: ListFeedbackParams,
		options?: FeedbackRequestOptions,
	): Promise<AdminFeedbackItem[]> {
		const query = new URLSearchParams();
		if (params?.days) query.set("days", String(params.days));
		if (params?.resolved !== undefined)
			query.set("resolved", String(params.resolved));
		if (params?.feedbackType) query.set("feedback_type", params.feedbackType);
		if (params?.limit) query.set("limit", String(params.limit));

		const queryString = query.toString();
		const endpoint = queryString
			? `/admin/feedback?${queryString}`
			: "/admin/feedback";
		return apiClient.get<AdminFeedbackItem[]>(endpoint, getOrgHeader(options));
	},

	async resolve(id: string): Promise<AdminFeedbackItem> {
		return apiClient.patch<AdminFeedbackItem>(`/admin/feedback/${id}`, {
			resolved: true,
		} as unknown as Record<string, unknown>);
	},

	async reopen(id: string): Promise<AdminFeedbackItem> {
		return apiClient.patch<AdminFeedbackItem>(`/admin/feedback/${id}`, {
			resolved: false,
		} as unknown as Record<string, unknown>);
	},

	async uploadAttachments(
		feedbackId: string,
		files: File[],
	): Promise<FeedbackAttachment[]> {
		const formData = new FormData();
		files.forEach((file) => {
			formData.append("attachments", file);
		});
		return apiClient.post<FeedbackAttachment[]>(
			`/feedback/${feedbackId}/attachments`,
			formData,
		);
	},

	async listAttachments(
		feedbackId: string,
		options?: FeedbackRequestOptions,
	): Promise<AdminFeedbackAttachment[]> {
		return apiClient.get<AdminFeedbackAttachment[]>(
			`/admin/feedback/${feedbackId}/attachments`,
			getOrgHeader(options),
		);
	},

	async delete(id: string): Promise<void> {
		await apiClient.delete(`/admin/feedback/${id}`);
	},
};
