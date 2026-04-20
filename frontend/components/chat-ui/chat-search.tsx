"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { groupByDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./ui/command";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";

// Mock Thread type
interface Thread {
	id: string;
	title: string | null;
	createdAt: string;
	updatedAt: string;
}

// Load threads from localStorage
const getStoredThreads = (): Thread[] => {
	if (typeof window === "undefined") return [];
	const stored = localStorage.getItem("secondstream_chat_threads");
	return stored ? JSON.parse(stored) : [];
};

export type ChatSearchProps = ComponentProps<typeof Dialog>;

export function ChatSearch({ onOpenChange, ...props }: ChatSearchProps) {
	const router = useRouter();
	const [threads, setThreads] = useState<Thread[]>([]);

	useEffect(() => {
		setThreads(getStoredThreads());
	}, []);

	const groupedThreads = groupByDate(threads, (t) => t.updatedAt);

	const handleSelect = (threadId: string) => {
		onOpenChange?.(false);
		router.push(`/chat/${threadId}`);
	};

	return (
		<Dialog onOpenChange={onOpenChange} {...props}>
			<DialogContent
				aria-describedby={undefined}
				className={cn(
					"outline! border-none! p-0 outline-border! outline-solid!",
				)}
			>
				<DialogTitle className="sr-only">Search chats</DialogTitle>
				<Command className="**:data-[slot=command-input-wrapper]:h-auto">
					<CommandInput
						placeholder="Search chats..."
						className="h-auto py-3.5"
					/>
					<CommandList>
						<CommandEmpty>No chats found.</CommandEmpty>
						{groupedThreads.map((group) => (
							<CommandGroup key={group.label} heading={group.label}>
								{group.items.map((thread) => (
									<CommandItem
										key={thread.id}
										value={thread.title ?? thread.id}
										onSelect={() => handleSelect(thread.id)}
									>
										{thread.title ?? "Untitled chat"}
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</DialogContent>
		</Dialog>
	);
}

export type ChatSearchTriggerProps = ComponentProps<typeof DialogTrigger>;

export const ChatSearchTrigger = (props: ChatSearchTriggerProps) => (
	<DialogTrigger {...props} />
);
