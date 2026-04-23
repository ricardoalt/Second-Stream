import { DefaultChatTransport } from "ai";
import { SELECTED_ORG_STORAGE_KEY } from "@/lib/constants/storage";
import type { MyUIMessage } from "@/types/ui-message";

interface BridgeHeaderOptions {
	accessToken: string | null;
	organizationId: string | null;
}

interface PrepareBridgeSendRequestOptions {
	baseUrl: string;
	threadId: string;
	accessToken: string | null;
	organizationId: string | null;
	messages: MyUIMessage[];
	existingAttachmentIds?: string[];
	headers?: HeadersInit;
}

interface CreateChatBridgeTransportOptions {
	threadId: string;
	getThreadId?: () => string;
	getAttachmentIds?: () => string[];
	baseUrl?: string;
	getAccessToken?: () => string | null;
	getOrganizationId?: () => string | null;
}

export function resolveLatestUserText(messages: MyUIMessage[]): string {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (!message) {
			continue;
		}

		if (message.role !== "user") {
			continue;
		}

		const textPart = message.parts.find((part) => part.type === "text");
		if (textPart && textPart.text.trim().length > 0) {
			return textPart.text;
		}
	}

	return "";
}

export function buildBridgeHeaders(
	options: BridgeHeaderOptions,
): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: "text/event-stream",
		"x-vercel-ai-ui-message-stream": "v1",
	};

	if (options.accessToken) {
		headers.Authorization = `Bearer ${options.accessToken}`;
	}

	if (options.organizationId) {
		headers["X-Organization-Id"] = options.organizationId;
	}

	return headers;
}

export function prepareBridgeSendRequest(
	options: PrepareBridgeSendRequestOptions,
): {
	api: string;
	body: { contentText: string; existingAttachmentIds?: string[] };
	headers: Record<string, string>;
} {
	const streamHeaders = buildBridgeHeaders({
		accessToken: options.accessToken,
		organizationId: options.organizationId,
	});

	const body: { contentText: string; existingAttachmentIds?: string[] } = {
		contentText: resolveLatestUserText(options.messages),
	};

	if ((options.existingAttachmentIds?.length ?? 0) > 0) {
		body.existingAttachmentIds = options.existingAttachmentIds;
	}

	return {
		api: `${options.baseUrl}/chat/threads/${options.threadId}/messages/stream`,
		body,
		headers: {
			...normalizeHeaders(options.headers),
			...streamHeaders,
		},
	};
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
	if (!headers) {
		return {};
	}

	if (headers instanceof Headers) {
		return Object.fromEntries(headers.entries());
	}

	if (Array.isArray(headers)) {
		return Object.fromEntries(headers);
	}

	return { ...headers };
}

export function createChatBridgeTransport(
	options: CreateChatBridgeTransportOptions,
): DefaultChatTransport<MyUIMessage> {
	const resolvedBaseUrl = (options.baseUrl ?? resolveApiBaseUrl()).replace(
		/\/$/,
		"",
	);

	return new DefaultChatTransport<MyUIMessage>({
		api: `${resolvedBaseUrl}/chat/threads/${options.threadId}/messages/stream`,
		prepareSendMessagesRequest: ({ headers, messages }) => {
			const resolvedThreadId =
				options.getThreadId?.().trim() || options.threadId.trim();

			const prepared = prepareBridgeSendRequest({
				baseUrl: resolvedBaseUrl,
				threadId: resolvedThreadId,
				accessToken: (options.getAccessToken ?? getAccessTokenFromStorage)(),
				organizationId: (
					options.getOrganizationId ?? getOrganizationIdFromStorage
				)(),
				existingAttachmentIds:
					options.getAttachmentIds?.().filter((id) => id.trim().length > 0) ??
					[],
				messages,
				headers,
			});

			return {
				api: prepared.api,
				headers: prepared.headers,
				body: prepared.body,
			};
		},
	});
}

function resolveApiBaseUrl(): string {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!apiBaseUrl) {
		throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
	}

	return apiBaseUrl;
}

function getAccessTokenFromStorage(): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	return localStorage.getItem("access_token");
}

function getOrganizationIdFromStorage(): string | null {
	if (typeof window === "undefined") {
		return null;
	}

	return localStorage.getItem(SELECTED_ORG_STORAGE_KEY);
}
