import type { MyUIMessage } from "@/types/ui-message";
import { apiClient } from "./client";

export {
	buildChatThreadHistoryQueryKey,
	buildChatThreadsQueryKey,
	CHAT_THREAD_HISTORY_QUERY_KEY,
	CHAT_THREADS_QUERY_KEY,
	type ChatThreadsQueryScope,
} from "@/lib/chat-runtime/query-keys";

export interface ChatThreadSummaryDTO {
	id: string;
	title: string | null;
	lastMessagePreview: string | null;
	lastMessageAt: string | null;
	createdAt: string;
	updatedAt: string;
}

interface ChatThreadListResponseDTO {
	items?: ChatThreadSummaryDTO[];
}

interface ListChatThreadsOptions {
	organizationId?: string | null;
}

interface ChatAttachmentDTO {
	id: string;
	messageId: string | null;
	originalFilename: string;
	contentType: string | null;
	sizeBytes: number;
	createdAt: string;
}

interface ChatMessageDTO {
	id: string;
	role: "user" | "assistant";
	contentText: string;
	status: string | null;
	createdAt: string;
	attachments: ChatAttachmentDTO[];
}

interface ChatThreadDetailDTO {
	id: string;
	title: string | null;
	lastMessagePreview: string | null;
	lastMessageAt: string | null;
	messages: ChatMessageDTO[];
}

export async function listChatThreads(
	options: ListChatThreadsOptions = {},
): Promise<ChatThreadSummaryDTO[]> {
	const response = await apiClient.get<ChatThreadListResponseDTO>(
		"/chat/threads",
		options.organizationId
			? {
					"X-Organization-Id": options.organizationId,
				}
			: undefined,
	);
	if (!response.items || !Array.isArray(response.items)) {
		return [];
	}

	return response.items;
}

export async function fetchChatThreadDetail(
	threadId: string,
	options: ListChatThreadsOptions = {},
): Promise<ChatThreadDetailDTO> {
	return apiClient.get<ChatThreadDetailDTO>(
		`/chat/threads/${threadId}`,
		options.organizationId
			? {
					"X-Organization-Id": options.organizationId,
			  }
			: undefined,
	);
}

export async function reloadPersistedThreadHistory(
	threadId: string,
	options: ListChatThreadsOptions = {},
): Promise<MyUIMessage[]> {
	const detail = await fetchChatThreadDetail(threadId, options);
	return detail.messages.map((message) => ({
		id: message.id,
		role: message.role,
		content: message.contentText,
		parts: [
			{ type: "text", text: message.contentText },
			...message.attachments.map((attachment) => ({
				type: "file" as const,
				filename: attachment.originalFilename,
				mediaType: attachment.contentType ?? "application/octet-stream",
				url: `attachment://${attachment.id}`,
			})),
		],
		createdAt: message.createdAt,
	}));
}

export async function uploadChatAttachment(file: File): Promise<string> {
	const response = await apiClient.uploadFile<ChatAttachmentDTO>(
		"/chat/attachments",
		file,
	);
	return response.id;
}
