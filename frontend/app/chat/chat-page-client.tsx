"use client";

import { useEffect, useState } from "react";
import { ChatScreen } from "@/components/chat-ui/chat-screen";

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
	const [threadId, setThreadId] = useState(
		() => initialThreadId ?? crypto.randomUUID(),
	);
	const [loadHistory, setLoadHistory] = useState(initialThreadId !== null);

	useEffect(() => {
		if (initialThreadId === null) {
			// Server sees no threadId. Two cases:
			//  (a) User clicked "New chat" → we need a fresh session.
			//  (b) We just mounted on /chat → already initialized above.
			// Distinguishing: if current threadId matches the URL after
			// first-send router.replace, initialThreadId would be that
			// UUID (not null). So `null` here always means genuine new
			// chat navigation. Reset unconditionally.
			if (loadHistory || !threadId) {
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
		// else: initialThreadId === threadId (our own replaceState after
		// first-send). No-op, keep useChat state alive.
	}, [initialThreadId, threadId, loadHistory]);

	return (
		<ChatScreen
			threadId={threadId}
			initialMessages={[]}
			loadHistory={loadHistory}
		/>
	);
}
