"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatScreen } from "@/components/chat-ui/chat-screen";
import { buildChatThreadUrl } from "@/lib/chat-runtime/routing";

/**
 * Bridges the Server Component URL state (`initialThreadId` from
 * `searchParams.threadId`) to a stable client-side threadId for useChat.
 *
 * Behavior:
 * - Fresh mount on `/chat` (no threadId): mint a client-side UUID and
 *   hold it across renders. No history load.
 * - Fresh mount on `/chat?threadId=X`: adopt X and load history.
 * - Navigation from `/chat?threadId=X` → `/chat`: mint a fresh UUID
 *   and reset to an empty session.
 * - Navigation between existing threads (`X` → `Y`): adopt Y and load
 *   history for Y.
 * - URL sync after first send (we called `router.replace` from
 *   `ChatScreen` with our own UUID): `initialThreadId` now matches
 *   `threadId` → no reset, stream preserved.
 */
export function ChatPageClient({
	initialThreadId,
}: {
	initialThreadId: string | null;
}) {
	const router = useRouter();
	const [threadId, setThreadId] = useState(
		() => initialThreadId ?? crypto.randomUUID(),
	);
	const [loadHistory, setLoadHistory] = useState(initialThreadId !== null);
	const previousInitialThreadIdRef = useRef<string | null>(initialThreadId);

	useEffect(() => {
		const previousInitialThreadId = previousInitialThreadIdRef.current;
		previousInitialThreadIdRef.current = initialThreadId;

		if (initialThreadId === null) {
			// Only reset on explicit route change from persisted thread -> /chat.
			if (previousInitialThreadId !== null) {
				setThreadId(crypto.randomUUID());
				setLoadHistory(false);
			}
			return;
		}

		if (initialThreadId !== threadId) {
			// User navigated to a different thread (sidebar click).
			setThreadId(initialThreadId);
			setLoadHistory(true);
		}
		// else: initialThreadId === threadId (our own replace after
		// first-send). No-op, keep useChat state alive.
	}, [initialThreadId, threadId]);

	const handleFirstMessage = useCallback(() => {
		if (initialThreadId !== null) return;
		router.replace(buildChatThreadUrl(threadId), { scroll: false });
	}, [initialThreadId, router, threadId]);

	return (
		<ChatScreen
			threadId={threadId}
			initialMessages={[]}
			loadHistory={loadHistory}
			onFirstMessage={handleFirstMessage}
		/>
	);
}
