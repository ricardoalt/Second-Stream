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

interface RenameChatThreadRequestDTO {
	title: string;
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

const CHAT_API_BASE_URL = (
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1"
).replace(/\/$/, "");

const CHAT_ATTACHMENT_DOWNLOAD_PATH_REGEX =
	/\/chat\/attachments\/([^/]+)\/download\/?$/;

function buildChatAttachmentDownloadPath(attachmentId: string): string {
	return `/chat/attachments/${attachmentId}/download`;
}

export function buildChatAttachmentDownloadUrl(attachmentId: string): string {
	return `${CHAT_API_BASE_URL}${buildChatAttachmentDownloadPath(attachmentId)}`;
}

export function getChatAttachmentIdFromDownloadUrl(
	downloadUrl: string,
): string | null {
	try {
		const parsed = new URL(downloadUrl, CHAT_API_BASE_URL);
		const pathMatch = parsed.pathname.match(
			CHAT_ATTACHMENT_DOWNLOAD_PATH_REGEX,
		);
		if (!pathMatch) {
			return null;
		}

		const rawAttachmentId = pathMatch[1];
		if (!rawAttachmentId) {
			return null;
		}

		return decodeURIComponent(rawAttachmentId);
	} catch {
		return null;
	}
}

interface DownloadChatAttachmentOptions {
	organizationId?: string | null;
}

export async function downloadChatAttachment(
	attachmentId: string,
	options: DownloadChatAttachmentOptions = {},
): Promise<Blob> {
	return apiClient.downloadBlob(
		buildChatAttachmentDownloadPath(attachmentId),
		options.organizationId
			? {
					headers: {
						"X-Organization-Id": options.organizationId,
					},
				}
			: undefined,
	);
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

export async function renameChatThread(
	threadId: string,
	title: string,
	options: ListChatThreadsOptions = {},
): Promise<ChatThreadSummaryDTO> {
	return apiClient.patch<ChatThreadSummaryDTO>(
		`/chat/threads/${threadId}`,
		{ title } satisfies RenameChatThreadRequestDTO,
		options.organizationId
			? {
					"X-Organization-Id": options.organizationId,
				}
			: undefined,
	);
}

export async function archiveChatThread(
	threadId: string,
	options: ListChatThreadsOptions = {},
): Promise<void> {
	await apiClient.post<void>(
		`/chat/threads/${threadId}/archive`,
		undefined,
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
				url: buildChatAttachmentDownloadUrl(attachment.id),
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
