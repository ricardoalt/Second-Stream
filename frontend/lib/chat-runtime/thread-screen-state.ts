import type { ChatThreadSummaryDTO } from "@/lib/api/chat";
import type { MyUIMessage } from "@/types/ui-message";

export function upsertThreadSummary(
	threads: ChatThreadSummaryDTO[] | undefined,
	thread: ChatThreadSummaryDTO,
): ChatThreadSummaryDTO[] {
	const current = threads ?? [];
	return [thread, ...current.filter((item) => item.id !== thread.id)];
}

export function shouldHydrateHistory(params: {
	loadHistory: boolean;
	status: "submitted" | "streaming" | "ready" | "error";
	currentMessageCount: number;
	hasHydratedThread: boolean;
	isHydratingHistory: boolean;
}): boolean {
	if (!params.loadHistory) return false;
	if (params.isHydratingHistory) return false;
	if (params.hasHydratedThread) return false;
	if (params.status !== "ready") return false;
	return params.currentMessageCount === 0;
}

export function mergeHydratedHistoryWithLocalMessages(params: {
	hydratedMessages: MyUIMessage[];
	localMessages: MyUIMessage[];
}): MyUIMessage[] {
	const { hydratedMessages, localMessages } = params;

	if (localMessages.length === 0) return hydratedMessages;
	if (hydratedMessages.length === 0) return localMessages;

	const localById = new Map(
		localMessages.map((message) => [message.id, message]),
	);
	const hydratedIds = new Set(hydratedMessages.map((message) => message.id));

	const mergedHistory = hydratedMessages.map(
		(message) => localById.get(message.id) ?? message,
	);

	const localOnlyMessages = localMessages.filter(
		(message) => !hydratedIds.has(message.id),
	);

	return [...mergedHistory, ...localOnlyMessages];
}
