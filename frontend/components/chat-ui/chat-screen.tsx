"use client";

import {
	ChatInterface,
	type ChatInterfaceProps,
} from "@/components/chat-ui/chat-interface";

export type ChatScreenProps = ChatInterfaceProps;

export function ChatScreen(props: ChatScreenProps) {
	return <ChatInterface {...props} />;
}
