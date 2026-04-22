"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import type { ChatThreadSummaryDTO } from "@/lib/api/chat";
import { buildChatThreadUrl } from "@/lib/chat-runtime/routing";
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

export type ChatSearchProps = ComponentProps<typeof Dialog> & {
	threads?: ChatThreadSummaryDTO[];
};

export function ChatSearch({
	onOpenChange,
	threads = [],
	...props
}: ChatSearchProps) {
	const router = useRouter();

	const groupedThreads = groupByDate(threads, (t) => t.updatedAt);

	const handleSelect = (threadId: string) => {
		if (onOpenChange) {
			(onOpenChange as (...args: unknown[]) => void)(false);
		}
		router.push(buildChatThreadUrl(threadId));
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
