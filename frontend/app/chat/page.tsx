"use client";

/**
 * Chat Page Example
 *
 * Demo page using the copied ChatInterface and AppSidebar components.
 * Backend-persisted chat with SSE streaming.
 */

import { useState } from "react";
import {
	AppSidebar,
	ChatInterface,
	SidebarProvider,
} from "@/components/chat-ui";

export default function ChatPage() {
	const [activeThreadId, setActiveThreadId] = useState<string>("new");

	const handleNewChat = () => {
		setActiveThreadId("new");
	};

	const handleThreadSelect = (threadId: string) => {
		setActiveThreadId(threadId);
	};

	return (
		<SidebarProvider defaultOpen={true}>
			<div className="flex h-screen w-full bg-background">
				<AppSidebar
					activeThreadId={activeThreadId}
					onThreadSelect={handleThreadSelect}
					onNewChat={handleNewChat}
				/>
				<div className="flex flex-1 flex-col h-full overflow-hidden">
					<ChatInterface
						threadId={activeThreadId}
						onThreadCreated={setActiveThreadId}
					/>
				</div>
			</div>
		</SidebarProvider>
	);
}
