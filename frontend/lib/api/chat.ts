import { SELECTED_ORG_STORAGE_KEY } from "@/lib/constants/storage";
import type { MyUIMessage } from "@/types/ui-message";
import { apiClient } from "./client";

export interface ChatThreadSummaryDTO {
	id: string;
	title: string | null;
	lastMessagePreview: string | null;
	lastMessageAt: string | null;
	createdAt: string;
	updatedAt: string;
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

export type ChatStreamEvent =
	| { event: "start"; runId?: string; threadId?: string }
	| { event: "delta"; delta: string }
	| { event: "completed"; messageId?: string }
	| { event: "error"; code?: string };

export function parseChatSSEBuffer(buffer: string): {
	events: ChatStreamEvent[];
	rest: string;
} {
	const blocks = buffer.split("\n\n");
	const rest = blocks.pop() ?? "";
	const events: ChatStreamEvent[] = [];

	for (const block of blocks) {
		if (block.trim().length === 0) {
			continue;
		}

		let eventName = "";
		const dataLines: string[] = [];

		for (const line of block.split("\n")) {
			if (line.startsWith("event:")) {
				eventName = line.slice(6).trim();
			}
			if (line.startsWith("data:")) {
				dataLines.push(line.slice(5).trim());
			}
		}

		if (eventName.length === 0) {
			continue;
		}

		const rawData = dataLines.join("\n");
		const payload = rawData.length > 0 ? safeJsonParse(rawData) : {};
		const normalizedPayload = normalizePayload(payload);

		if (eventName === "start") {
			const runId = stringOrUndefined(normalizedPayload.runId);
			const threadId = stringOrUndefined(normalizedPayload.threadId);
			events.push({
				event: "start",
				...(runId ? { runId } : {}),
				...(threadId ? { threadId } : {}),
			});
			continue;
		}

		if (eventName === "delta") {
			events.push({
				event: "delta",
				delta: stringOrUndefined(normalizedPayload.delta) ?? "",
			});
			continue;
		}

		if (eventName === "completed") {
			const messageId = stringOrUndefined(normalizedPayload.messageId);
			events.push({
				event: "completed",
				...(messageId ? { messageId } : {}),
			});
			continue;
		}

		if (eventName === "error") {
			const code = stringOrUndefined(normalizedPayload.code);
			events.push({
				event: "error",
				...(code ? { code } : {}),
			});
		}
	}

	return { events, rest };
}

export async function createChatThread(
	title?: string,
): Promise<ChatThreadSummaryDTO> {
	return apiClient.post<ChatThreadSummaryDTO>("/chat/threads", { title });
}

export async function fetchChatThreadDetail(
	threadId: string,
): Promise<ChatThreadDetailDTO> {
	return apiClient.get<ChatThreadDetailDTO>(`/chat/threads/${threadId}`);
}

export async function reloadPersistedThreadHistory(
	threadId: string,
): Promise<MyUIMessage[]> {
	const detail = await fetchChatThreadDetail(threadId);
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

export async function streamPersistedChatTurn(options: {
	threadId: string;
	contentText: string;
	existingAttachmentIds?: string[];
	signal?: AbortSignal;
	onEvent: (event: ChatStreamEvent) => void;
}): Promise<void> {
	const body: Record<string, unknown> = { contentText: options.contentText };
	if (
		options.existingAttachmentIds &&
		options.existingAttachmentIds.length > 0
	) {
		body.existingAttachmentIds = options.existingAttachmentIds;
	}

	const requestInit: RequestInit = {
		method: "POST",
		headers: resolveStreamingHeaders(),
		body: JSON.stringify(body),
		...(options.signal ? { signal: options.signal } : {}),
	};

	const response = await fetch(
		`${resolveBaseUrl()}/chat/threads/${options.threadId}/messages/stream`,
		requestInit,
	);

	if (!response.ok) {
		const payload = await response
			.json()
			.catch(() => ({ message: `HTTP ${response.status}` }));
		throw new Error(String(payload.message ?? `HTTP ${response.status}`));
	}

	if (!response.body) {
		throw new Error("Streaming response body is unavailable");
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let rest = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		const chunk = decoder.decode(value, { stream: true });
		const parsed = parseChatSSEBuffer(rest + chunk);
		rest = parsed.rest;
		for (const event of parsed.events) {
			options.onEvent(event);
		}
	}

	const finalChunk = decoder.decode();
	if (finalChunk.length > 0 || rest.length > 0) {
		const parsed = parseChatSSEBuffer(rest + finalChunk);
		for (const event of parsed.events) {
			options.onEvent(event);
		}
	}
}

function resolveBaseUrl(): string {
	const url = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!url) {
		throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
	}
	return url.replace(/\/$/, "");
}

function resolveStreamingHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "text/event-stream",
	};

	if (typeof window === "undefined") {
		return headers;
	}

	const accessToken = localStorage.getItem("access_token");
	if (accessToken) {
		headers.Authorization = `Bearer ${accessToken}`;
	}

	const selectedOrgId = localStorage.getItem(SELECTED_ORG_STORAGE_KEY);
	if (selectedOrgId) {
		headers["X-Organization-Id"] = selectedOrgId;
	}

	return headers;
}

function safeJsonParse(raw: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return {};
	} catch {
		return {};
	}
}

function normalizePayload(
	payload: Record<string, unknown>,
): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(payload)) {
		normalized[
			key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())
		] = value;
	}
	return normalized;
}

function stringOrUndefined(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}
