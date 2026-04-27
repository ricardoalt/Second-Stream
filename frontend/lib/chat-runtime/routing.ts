export function buildChatThreadUrl(threadId: string): string {
	return `/chat/${encodeURIComponent(threadId.trim())}`;
}

export function syncChatThreadUrlSilently(threadId: string): void {
	if (typeof window === "undefined") {
		return;
	}

	const nextPath = buildChatThreadUrl(threadId);

	if (window.location.pathname === nextPath) {
		return;
	}

	window.history.replaceState(window.history.state, "", nextPath);
}
