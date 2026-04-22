import type { ChatStatus } from "ai";
import type { AttachmentUploadState } from "@/lib/chat-attachment-utils";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { MyUIMessage } from "@/types/ui-message";

export const canSubmitPromptMessage = (
	message: PromptInputMessage,
): boolean => {
	const hasText = Boolean(message.text?.trim());
	const hasAttachments = Boolean(message.files?.length);
	return hasText || hasAttachments;
};

export function nextClearedUploadStates(
	states: AttachmentUploadState[],
): AttachmentUploadState[] {
	if (states.length === 0) {
		return states;
	}

	return [];
}

export function shouldReloadThreadHistory(options: {
	threadId: string;
	lastLoadedThreadId: string | null;
	isSendInFlight: boolean;
}): boolean {
	if (options.threadId === "new") {
		return false;
	}

	if (options.isSendInFlight) {
		return false;
	}

	return options.threadId !== options.lastLoadedThreadId;
}

export function nextMessagesAfterHistoryReloadFailure(
	currentMessages: MyUIMessage[],
): MyUIMessage[] {
	if (currentMessages.length === 0) {
		return currentMessages;
	}

	return [];
}

export function rollbackMessagesAfterSendFailure(options: {
	threadId: string;
	baselineBeforeOptimisticAppend: MyUIMessage[];
	currentMessages: MyUIMessage[];
}): MyUIMessage[] {
	if (options.threadId === "new") {
		return options.baselineBeforeOptimisticAppend;
	}

	return options.currentMessages;
}

/**
 * Returns true when a loading shimmer should be displayed for the assistant.
 *
 * Covers two cases:
 *  1. status is "submitted" (request sent, no stream open yet)
 *  2. status is "streaming" but the last assistant message has no text or
 *     reasoning parts with actual content (stream is open, first token
 *     hasn't arrived yet)
 */
export function shouldShowLoadingShimmer(
	status: ChatStatus,
	messages: MyUIMessage[],
	options?: { awaitingFirstChunk?: boolean },
): boolean {
	if (status === "submitted") return true;

	if (status === "streaming") {
		if (options?.awaitingFirstChunk) {
			return true;
		}

		const lastAssistant = findLast(messages, (m) => m.role === "assistant");
		if (!lastAssistant) return true;

		const hasContent = lastAssistant.parts.some(
			(part) =>
				(part.type === "text" || part.type === "reasoning") &&
				part.text.length > 0,
		);

		return !hasContent;
	}

	return false;
}

function findLast<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
	for (let i = arr.length - 1; i >= 0; i--) {
		const item = arr[i];
		if (item !== undefined && predicate(item)) return item;
	}
	return undefined;
}
