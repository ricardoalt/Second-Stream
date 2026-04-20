"use client";

/**
 * Chat Page Example
 *
 * Demo page using the copied ChatInterface and AppSidebar components.
 * Uses localStorage for persistence - NOT connected to backend.
 */

import { useState, useEffect } from "react";
import { ChatInterface, AppSidebar, SidebarProvider } from "@/components/chat-ui";
import type { MyUIMessage } from "@/types/ui-message";

export default function ChatPage() {
	const [activeThreadId, setActiveThreadId] = useState<string>("new");
	const [messages, setMessages] = useState<MyUIMessage[]>([]);

	// Load messages when thread changes
	useEffect(() => {
		if (activeThreadId === "new") {
			setMessages([]);
		} else {
			const stored = localStorage.getItem(`secondstream_chat_messages_${activeThreadId}`);
			setMessages(stored ? JSON.parse(stored) : []);
		}
	}, [activeThreadId]);

	const handleNewChat = () => {
		setActiveThreadId("new");
		setMessages([]);
	};

	const handleThreadSelect = (threadId: string) => {
		setActiveThreadId(threadId);
	};

	const handleMessagesChange = (newMessages: MyUIMessage[]) => {
		setMessages(newMessages);
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
						initialMessages={messages}
						onMessagesChange={handleMessagesChange}
					/>
				</div>
			</div>
		</SidebarProvider>
	);
}
