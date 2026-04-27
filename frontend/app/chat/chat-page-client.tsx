"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInterface } from "@/components/chat-ui/chat-interface";
import {
	buildChatThreadHistoryQueryKey,
	reloadPersistedThreadHistory,
} from "@/lib/api/chat";
import {
	resolveChatRouteState,
	shouldSyncRouteAfterThreadCreated,
} from "@/lib/chat-runtime/page-client-state";
import { syncChatThreadUrlSilently } from "@/lib/chat-runtime/routing";
import { resolveChatThreadScope } from "@/lib/chat-runtime/thread-scope";
import { useAuth } from "@/lib/contexts";
import { useOrganizationStore } from "@/lib/stores/organization-store";

export function ChatPageClient({
	routeThreadId,
	onActiveThreadIdChange,
}: {
	routeThreadId: string | null;
	onActiveThreadIdChange?: (threadId: string) => void;
}) {
	const [localThreadId, setLocalThreadId] = useState(() => crypto.randomUUID());
	const previousRouteThreadIdRef = useRef(routeThreadId);
	const { user } = useAuth();
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);

	const { threadId, shouldLoadPersistedHistory } = resolveChatRouteState(
		routeThreadId,
		localThreadId,
	);

	const chatThreadScope = resolveChatThreadScope({
		selectedOrgId,
		fallbackOrganizationId: user?.organizationId ?? null,
		userId: user?.id ?? null,
		isSuperuser: user?.isSuperuser ?? false,
	});
	const historyQueryKey = buildChatThreadHistoryQueryKey(
		routeThreadId ?? threadId,
		chatThreadScope,
	);
	const historyRequestOptions = chatThreadScope.organizationId
		? { organizationId: chatThreadScope.organizationId }
		: {};

	const {
		data: initialMessages = [],
		isPending: isLoadingHistory,
		error: historyError,
		refetch: refetchHistory,
	} = useQuery({
		queryKey: historyQueryKey,
		enabled: shouldLoadPersistedHistory,
		queryFn: () =>
			reloadPersistedThreadHistory(
				routeThreadId as string,
				historyRequestOptions,
			),
	});

	useEffect(() => {
		const previousRouteThreadId = previousRouteThreadIdRef.current;
		previousRouteThreadIdRef.current = routeThreadId;

		if (routeThreadId === null && previousRouteThreadId !== null) {
			setLocalThreadId(crypto.randomUUID());
		}
	}, [routeThreadId]);

	const handleThreadCreated = useCallback(
		(createdThreadId: string) => {
			if (
				!shouldSyncRouteAfterThreadCreated({
					routeThreadId,
					runtimeThreadId: threadId,
					createdThreadId,
				})
			) {
				return;
			}

			syncChatThreadUrlSilently(createdThreadId);
			onActiveThreadIdChange?.(createdThreadId);
		},
		[onActiveThreadIdChange, routeThreadId, threadId],
	);

	if (shouldLoadPersistedHistory && isLoadingHistory) {
		return (
			<div className="flex flex-1 items-center justify-center px-6">
				<p className="text-muted-foreground text-sm">Loading thread…</p>
			</div>
		);
	}

	if (shouldLoadPersistedHistory && historyError) {
		return (
			<div className="flex flex-1 items-center justify-center px-6">
				<div className="space-y-2 text-center">
					<p className="text-destructive text-sm" role="alert">
						{historyError instanceof Error
							? historyError.message
							: "Unable to load thread history."}
					</p>
					<button
						type="button"
						className="text-sm underline"
						onClick={() => void refetchHistory()}
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<ChatInterface
			threadId={threadId}
			initialMessages={shouldLoadPersistedHistory ? initialMessages : []}
			onThreadCreated={handleThreadCreated}
		/>
	);
}
