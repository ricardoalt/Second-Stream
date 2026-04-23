export function buildChatThreadUrl(threadId: string): string {
	return `/chat/${encodeURIComponent(threadId.trim())}`;
}
