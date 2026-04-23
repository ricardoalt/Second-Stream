import type { ChatThreadSummaryDTO } from "@/lib/api/chat";
import type {
	ConversationTitleDataPart,
	NewThreadCreatedDataPart,
} from "@/types/ui-message";

const EMPTY_CHAT_TITLE = "New chat";
const MAX_PROVISIONAL_TITLE_LENGTH = 80;
const MAX_PREVIEW_LENGTH = 280;

function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export function deriveProvisionalThreadTitleFromPrompt(prompt: string): string {
	const normalizedPrompt = normalizeWhitespace(prompt);
	if (!normalizedPrompt) {
		return EMPTY_CHAT_TITLE;
	}

	if (normalizedPrompt.length <= MAX_PROVISIONAL_TITLE_LENGTH) {
		return normalizedPrompt;
	}

	return `${normalizedPrompt.slice(0, MAX_PROVISIONAL_TITLE_LENGTH - 1)}…`;
}

export function applyProvisionalThreadFromPrompt(
	threads: ChatThreadSummaryDTO[] | undefined,
	threadId: string,
	prompt: string,
	nowIsoString: string = new Date().toISOString(),
): ChatThreadSummaryDTO[] {
	const nextTitle = deriveProvisionalThreadTitleFromPrompt(prompt);
	const normalizedPrompt = normalizeWhitespace(prompt);
	const nextPreview = normalizedPrompt.slice(0, MAX_PREVIEW_LENGTH) || null;

	return (threads ?? []).map((thread) =>
		thread.id === threadId
			? {
					...thread,
					title:
						thread.title?.trim() && thread.title !== EMPTY_CHAT_TITLE
							? thread.title
							: nextTitle,
					lastMessagePreview: nextPreview,
					lastMessageAt: nowIsoString,
					updatedAt: nowIsoString,
			  }
			: thread,
	);
}

export function upsertThreadFromEvent(
	threads: ChatThreadSummaryDTO[] | undefined,
	part: NewThreadCreatedDataPart,
): ChatThreadSummaryDTO[] {
	const existingThread = (threads ?? []).find(
		(thread) => thread.id === part.data.threadId,
	);
	const title =
		part.data.title?.trim() || existingThread?.title?.trim() || EMPTY_CHAT_TITLE;
	const nextThread: ChatThreadSummaryDTO = {
		id: part.data.threadId,
		title,
		lastMessagePreview: existingThread?.lastMessagePreview ?? null,
		lastMessageAt: existingThread?.lastMessageAt ?? null,
		createdAt: part.data.createdAt || existingThread?.createdAt,
		updatedAt: part.data.updatedAt || existingThread?.updatedAt,
	};

	const current = threads ?? [];
	return [nextThread, ...current.filter((thread) => thread.id !== nextThread.id)];
}

export function applyConversationTitleFromEvent(
	threads: ChatThreadSummaryDTO[] | undefined,
	part: ConversationTitleDataPart,
): ChatThreadSummaryDTO[] {
	const nextTitle = part.data.title.trim();
	if (!nextTitle) {
		return threads ?? [];
	}

	return (threads ?? []).map((thread) =>
		thread.id === part.data.threadId
			? {
					...thread,
					title: nextTitle,
					updatedAt: new Date().toISOString(),
			  }
			: thread,
	);
}
