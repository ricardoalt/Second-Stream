export type ChatRouteState = {
	mode: "new" | "existing" | "unavailable";
	threadId: string;
};

export function resolveChatRouteState(
	rawThreadId: string | null | undefined,
): ChatRouteState {
	if (rawThreadId == null) {
		return { mode: "new", threadId: "new" };
	}

	const threadId = rawThreadId.trim();

	if (threadId.length === 0) {
		return { mode: "unavailable", threadId: "" };
	}

	if (threadId === "new") {
		return { mode: "new", threadId };
	}

	return { mode: "existing", threadId };
}

export function buildChatThreadUrl(threadId: string): string {
	return `/chat?threadId=${encodeURIComponent(threadId.trim())}`;
}
