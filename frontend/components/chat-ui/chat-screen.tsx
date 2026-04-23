"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
	mergeHydratedHistoryWithLocalMessages,
	shouldHydrateHistory,
	upsertThreadSummary,
} from "@/lib/chat-runtime/thread-screen-state";
import { uploadAttachmentsFromPromptMessage } from "@/lib/chat-runtime/upload";
import type { MyUIMessage } from "@/types/ui-message";
import { ChatPromptComposer } from "./chat-prompt-composer";
import { MessageParts } from "./message-parts";

interface ChatScreenProps {
	threadId: string;
	initialMessages: MyUIMessage[];
	loadHistory: boolean;
	onFirstMessage?: () => void;
}

export function ChatScreen({
	threadId,
	initialMessages,
	loadHistory,
	onFirstMessage,
}: ChatScreenProps) {
	const queryClient = useQueryClient();
	const [historyError, setHistoryError] = useState<string | null>(null);
	const [isHydratingHistory, setIsHydratingHistory] = useState(false);
	const hydratedThreadIdRef = useRef<string | null>(null);
	const lastSeenThreadIdRef = useRef<string | null>(threadId);

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
				queryClient.invalidateQueries({ queryKey: CHAT_THREADS_QUERY_KEY });
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
							return upsertThreadSummary(old, next);
						},
					);
				}
			},
		});

	// One-shot hydration for persisted threads only when idle.
	useEffect(() => {
		if (lastSeenThreadIdRef.current !== threadId) {
			lastSeenThreadIdRef.current = threadId;
			hydratedThreadIdRef.current = null;
			setHistoryError(null);
			setIsHydratingHistory(false);
		}

		const shouldHydrate = shouldHydrateHistory({
			loadHistory,
			status,
			currentMessageCount: messages.length,
			hasHydratedThread: hydratedThreadIdRef.current === threadId,
			isHydratingHistory,
		});
		if (!shouldHydrate) {
			if (!loadHistory) setIsHydratingHistory(false);
			return;
		}

		let cancelled = false;
		setIsHydratingHistory(true);

		reloadPersistedThreadHistory(threadId)
			.then((msgs) => {
				if (cancelled) return;
				setMessages((current) =>
					mergeHydratedHistoryWithLocalMessages({
						hydratedMessages: msgs,
						localMessages: current,
					}),
				);
				hydratedThreadIdRef.current = threadId;
				setHistoryError(null);
			})
			.catch((e) => {
				if (!cancelled)
					setHistoryError(
						e instanceof Error ? e.message : "Unable to load thread history.",
					);
			})
			.finally(() => {
				if (!cancelled) setIsHydratingHistory(false);
			});
		return () => {
			cancelled = true;
		};
	}, [
		isHydratingHistory,
		loadHistory,
		messages.length,
		setMessages,
		status,
		threadId,
	]);

	const handleSubmitMessage = useCallback(
		async (message: PromptInputMessage) => {
			if (!canSubmitPromptMessage(message)) return;
			clearError();
			const attachmentIds = await uploadAttachmentsFromPromptMessage(message);
			const wasEmpty = messages.length === 0;
			if (wasEmpty) onFirstMessage?.();

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
		[clearError, sendMessage, messages.length, onFirstMessage],
	);

	const isEmptyState = messages.length === 0 && !isHydratingHistory;
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
