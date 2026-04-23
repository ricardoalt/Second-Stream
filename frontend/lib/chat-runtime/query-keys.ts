export const CHAT_THREADS_QUERY_KEY = ["chat-threads"] as const;
export const CHAT_THREAD_HISTORY_QUERY_KEY = ["chat-thread-history"] as const;

export type ChatThreadsQueryScope = {
	organizationId?: string | null;
	userId?: string | null;
};

const NO_ORGANIZATION_SCOPE = "no-org";
const NO_USER_SCOPE = "no-user";

export function buildChatThreadsQueryKey(scope: ChatThreadsQueryScope) {
	return [
		...CHAT_THREADS_QUERY_KEY,
		scope.organizationId ?? NO_ORGANIZATION_SCOPE,
		scope.userId ?? NO_USER_SCOPE,
	] as const;
}

export function buildChatThreadHistoryQueryKey(
	threadId: string,
	scope: ChatThreadsQueryScope,
) {
	return [
		...CHAT_THREAD_HISTORY_QUERY_KEY,
		threadId,
		scope.organizationId ?? NO_ORGANIZATION_SCOPE,
		scope.userId ?? NO_USER_SCOPE,
	] as const;
}
