"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
	CHAT_THREADS_QUERY_KEY,
	type ChatThreadSummaryDTO,
	reloadPersistedThreadHistory,
} from "@/lib/api/chat";
import { createChatBridgeTransport } from "@/lib/chat-bridge/transport";
import {
	canSubmitPromptMessage,
	shouldShowLoadingShimmer,
} from "@/lib/chat-runtime/chat-utils";
import { buildChatThreadUrl } from "@/lib/chat-runtime/routing";
import { uploadAttachmentsFromPromptMessage } from "@/lib/chat-runtime/upload";
import type { MyUIMessage } from "@/types/ui-message";
import { ChatPromptComposer } from "./chat-prompt-composer";
import { MessageParts } from "./message-parts";

interface ChatScreenProps {
	threadId: string;
	initialMessages: MyUIMessage[];
	loadHistory: boolean;
}

export function ChatScreen({
	threadId,
	initialMessages,
	loadHistory,
}: ChatScreenProps) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [historyError, setHistoryError] = useState<string | null>(null);

	// Memoize transport so useChat doesn't see a new reference on every
	// render (which would reset its internal state mid-stream).
	const transport = useMemo(
		() => createChatBridgeTransport({ threadId }),
		[threadId],
	);

	const { messages, sendMessage, status, error, clearError, setMessages } =
		useChat<MyUIMessage>({
			id: threadId,
			messages: initialMessages,
			transport,
			onFinish: () => {
				// Surgical update: bump lastMessageAt/updatedAt for this thread
				// so the sidebar re-orders it without a full refetch. A blind
				// invalidateQueries here would cause a visible repaint of the
				// sidebar exactly when the stream finishes, perceived as a
				// "page refresh" by the user.
				queryClient.setQueryData<ChatThreadSummaryDTO[]>(
					CHAT_THREADS_QUERY_KEY,
					(old) => {
						if (!old) return old;
						const now = new Date().toISOString();
						return old.map((t) =>
							t.id === threadId
								? { ...t, lastMessageAt: now, updatedAt: now }
								: t,
						);
					},
				);
			},
			onData: (part) => {
				if (part.type === "data-new-thread-created") {
					queryClient.setQueryData<ChatThreadSummaryDTO[]>(
						CHAT_THREADS_QUERY_KEY,
						(old) => {
							const data = (
								part as {
									data: {
										threadId: string;
										title: string | null;
										createdAt: string;
										updatedAt: string;
									};
								}
							).data;
							const next: ChatThreadSummaryDTO = {
								id: data.threadId,
								title: data.title,
								lastMessagePreview: null,
								lastMessageAt: null,
								createdAt: data.createdAt,
								updatedAt: data.updatedAt,
							};
							return old ? [next, ...old] : [next];
						},
					);
				}
			},
		});

	// One-shot hydration for existing threads.
	useEffect(() => {
		if (!loadHistory) return;
		let cancelled = false;
		reloadPersistedThreadHistory(threadId)
			.then((msgs) => {
				if (!cancelled) setMessages(msgs);
			})
			.catch((e) => {
				if (!cancelled)
					setHistoryError(
						e instanceof Error ? e.message : "Unable to load thread history.",
					);
			});
		return () => {
			cancelled = true;
		};
	}, [threadId, loadHistory, setMessages]);

	const handleSubmitMessage = useCallback(
		async (message: PromptInputMessage) => {
			if (!canSubmitPromptMessage(message)) return;
			clearError();
			const attachmentIds = await uploadAttachmentsFromPromptMessage(message);
			const wasEmpty = messages.length === 0;

			// Sync URL with Next's router BEFORE awaiting sendMessage.
			// `sendMessage` resolves at stream END (not start), so doing this
			// after the await would fire router.replace exactly when the
			// assistant response arrives — perceived as a "page refresh".
			// Firing it up front makes the URL update coincide with the user
			// message appearing in the conversation, which is invisible.
			// Safe: threadId and transport are memoized/stable, so the
			// Server Component re-render triggered by router.replace does
			// NOT reset useChat.
			if (wasEmpty) {
				router.replace(buildChatThreadUrl(threadId), { scroll: false });
			}

			await sendMessage(
				{ text: message.text, files: message.files },
				{
					body:
						attachmentIds.length > 0
							? { existingAttachmentIds: attachmentIds }
							: {},
				},
			);
		},
		[clearError, sendMessage, threadId, messages.length, router],
	);

	const isEmptyState = messages.length === 0;
	const visibleError = error?.message ?? historyError;
	const showShimmer = shouldShowLoadingShimmer(status, messages);

	return (
		<div className="flex h-full flex-1 flex-col">
			<AnimatePresence mode="wait" initial={false}>
				{isEmptyState ? (
					<motion.div
						key="empty"
						initial={{ opacity: 0, scale: 0.98 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.98 }}
						transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
						className="mx-auto flex w-full max-w-[70ch] flex-1 flex-col items-center justify-center gap-14 px-6 pb-24"
					>
						<h1 className="text-5xl font-medium tracking-tight text-foreground">
							What can I help with?
						</h1>
						<ChatPromptComposer
							className="w-full"
							errorMessage={error?.message ?? null}
							onSubmitMessage={handleSubmitMessage}
							placeholder="Ask anything"
							status={status}
							textareaClassName="min-h-16 text-lg"
						/>
					</motion.div>
				) : (
					<motion.div
						key="conversation"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
						className="flex min-h-0 flex-1 flex-col"
					>
						<Conversation className="min-h-0 flex-1">
							<ConversationContent className="mx-auto w-full max-w-[70ch] gap-8 px-6 py-6">
								{messages.map((message) => (
									<motion.div
										key={message.id}
										initial={{ opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.2,
											ease: [0.25, 0.1, 0.25, 1],
										}}
									>
										<MessageParts message={message} />
									</motion.div>
								))}

								{showShimmer && (
									<motion.div
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
									>
										<MessageParts.Shimmer />
									</motion.div>
								)}

								{visibleError && (
									<p className="text-destructive text-sm" role="alert">
										{visibleError}
									</p>
								)}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>

						<div className="mx-auto w-full max-w-[70ch] px-6 pb-8 pt-4">
							<ChatPromptComposer
								className="w-full"
								errorMessage={error?.message ?? null}
								onSubmitMessage={handleSubmitMessage}
								placeholder="Send a message"
								status={status}
								textareaClassName="min-h-14"
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
