"use client";

import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/chat-ui/app-sidebar";
import { ChatPageClient } from "./chat-page-client";

export function ChatShell({
	routeThreadId,
}: {
	routeThreadId: string | null;
}) {
	const [activeThreadId, setActiveThreadId] = useState<string | undefined>(
		routeThreadId ?? undefined,
	);

	useEffect(() => {
		setActiveThreadId(routeThreadId ?? undefined);
	}, [routeThreadId]);

	const handleThreadActivated = useCallback((threadId: string) => {
		setActiveThreadId(threadId);
	}, []);

	return (
		<div className="flex h-screen w-full bg-background">
			<AppSidebar
				{...(activeThreadId !== undefined ? { activeThreadId } : {})}
				onThreadSelect={handleThreadActivated}
			/>
			<div className="flex flex-1 flex-col h-full overflow-hidden">
				<ChatPageClient
					routeThreadId={routeThreadId}
					onActiveThreadIdChange={handleThreadActivated}
				/>
			</div>
		</div>
	);
}
