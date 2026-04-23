export function buildChatThreadUrl(threadId: string): string {
	return `/chat?threadId=${encodeURIComponent(threadId.trim())}`;
}
