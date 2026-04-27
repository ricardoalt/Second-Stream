import type { ChatStatus } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { MyUIMessage } from "@/types/ui-message";

export const canSubmitPromptMessage = (
	message: PromptInputMessage,
): boolean => {
	return Boolean(message.text?.trim());
};

export function shouldShowLoadingShimmer(
	status: ChatStatus,
	messages: MyUIMessage[],
): boolean {
	if (status === "submitted") {
		return true;
	}

	if (status === "streaming") {
		const lastAssistant = findLast(
			messages,
			(message) => message.role === "assistant",
		);
		if (!lastAssistant) {
			return true;
		}

		const hasContent = lastAssistant.parts.some(
			(part) =>
				(part.type === "text" || part.type === "reasoning") &&
				part.text.length > 0,
		);
		const hasToolActivity = lastAssistant.parts.some((part) =>
			part.type.startsWith("tool-"),
		);

		return !(hasContent || hasToolActivity);
	}

	return false;
}

function findLast<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
	for (let index = arr.length - 1; index >= 0; index--) {
		const item = arr[index];
		if (item !== undefined && predicate(item)) {
			return item;
		}
	}

	return undefined;
}
