"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo } from "react";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { WorkingMemoryUpdate } from "@/components/chat-ui/ai-elements/working-memory-update";
import {
	buildChatThreadsQueryKey,
	type ChatThreadSummaryDTO,
} from "@/lib/api/chat";
import { createChatBridgeTransport } from "@/lib/chat-bridge/transport";
import {
	canSubmitPromptMessage,
	shouldShowLoadingShimmer,
} from "@/lib/chat-runtime/chat-utils";
import {
	applyProvisionalThreadFromPrompt,
	applyConversationTitleFromEvent,
	deriveProvisionalThreadTitleFromPrompt,
	upsertThreadFromEvent,
} from "@/lib/chat-runtime/sidebar-events";
import { resolveChatThreadScope } from "@/lib/chat-runtime/thread-scope";
import { uploadAttachmentsFromPromptMessage } from "@/lib/chat-runtime/upload";
import { useAuth } from "@/lib/contexts";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import type {
	ConversationTitleDataPart,
	MyUIMessage,
	NewThreadCreatedDataPart,
} from "@/types/ui-message";
import {
	DATA_CONVERSATION_TITLE_PART,
	DATA_NEW_THREAD_CREATED_PART,
} from "@/types/ui-message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "./ai-elements/reasoning";
import { Shimmer } from "./ai-elements/shimmer";
import { Source, SourceContent, SourceTrigger } from "./ai-elements/sources";
import { ChatPromptComposer } from "./chat-prompt-composer";

export interface ChatInterfaceProps {
	threadId: string;
	initialMessages: MyUIMessage[];
	onThreadCreated?: (threadId: string) => void;
}

export function ChatInterface({
	threadId,
	initialMessages,
	onThreadCreated,
}: ChatInterfaceProps) {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);

	const chatThreadScope = useMemo(
		() =>
			resolveChatThreadScope({
				selectedOrgId,
				fallbackOrganizationId: user?.organizationId ?? null,
				userId: user?.id ?? null,
				isSuperuser: user?.isSuperuser ?? false,
			}),
		[selectedOrgId, user?.id, user?.isSuperuser, user?.organizationId],
	);

	const chatThreadsQueryKey = useMemo(
		() => buildChatThreadsQueryKey(chatThreadScope),
		[chatThreadScope],
	);

	const transport = useMemo(
		() =>
			createChatBridgeTransport({
				threadId,
				getOrganizationId: () => chatThreadScope.organizationId ?? null,
			}),
		[chatThreadScope.organizationId, threadId],
	);

	const { messages, sendMessage, status, error, clearError } =
		useChat<MyUIMessage>({
			id: threadId,
			messages: initialMessages,
			transport,
			onFinish: () => {
				void queryClient.refetchQueries({
					queryKey: chatThreadsQueryKey,
					exact: true,
				});
			},
			onData: (part) => {
				if (part.type === DATA_NEW_THREAD_CREATED_PART) {
					const eventPart = part as NewThreadCreatedDataPart;
					if (eventPart.data.threadId !== threadId) {
						return;
					}

					queryClient.setQueryData<ChatThreadSummaryDTO[]>(
						chatThreadsQueryKey,
						(old) => upsertThreadFromEvent(old, eventPart),
					);

					onThreadCreated?.(eventPart.data.threadId);
					return;
				}

				if (part.type === DATA_CONVERSATION_TITLE_PART) {
					const eventPart = part as ConversationTitleDataPart;
					queryClient.setQueryData<ChatThreadSummaryDTO[]>(
						chatThreadsQueryKey,
						(old) => applyConversationTitleFromEvent(old, eventPart),
					);
				}
			},
		});

	const handleSubmitMessage = useCallback(
		async (message: PromptInputMessage) => {
			if (!canSubmitPromptMessage(message)) {
				return;
			}

			const promptText = message.text.trim();
			const nowIsoString = new Date().toISOString();
			const provisionalTitle = deriveProvisionalThreadTitleFromPrompt(promptText);

			queryClient.setQueryData<ChatThreadSummaryDTO[]>(
				chatThreadsQueryKey,
				(old) => {
					const existing = old ?? [];
					if (!existing.some((thread) => thread.id === threadId)) {
						return [
							{
								id: threadId,
								title: provisionalTitle,
								lastMessagePreview: promptText.slice(0, 280),
								lastMessageAt: nowIsoString,
								createdAt: nowIsoString,
								updatedAt: nowIsoString,
							},
							...existing,
						];
					}

					return applyProvisionalThreadFromPrompt(
						existing,
						threadId,
						promptText,
						nowIsoString,
					);
				},
			);

			clearError();
			const attachmentIds = await uploadAttachmentsFromPromptMessage(message);

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
		[
			chatThreadsQueryKey,
			clearError,
			queryClient,
			sendMessage,
			threadId,
		],
	);

	const isEmptyState = messages.length === 0;
	const showShimmer = shouldShowLoadingShimmer(status, messages);
	const visibleError = error?.message ?? null;

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
							draftScopeKey={threadId}
							errorMessage={visibleError}
							onInteract={() => {
								if (error) {
									clearError();
								}
							}}
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
								{messages.map((message, index) => (
									<motion.div
										key={message.id}
										initial={{ opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.2,
											delay: Math.min(index * 0.04, 0.2),
											ease: [0.25, 0.1, 0.25, 1],
										}}
									>
										<Message from={message.role}>
											<MessageContent>
												{message.parts.map((part, partIndex) => {
													switch (part.type) {
														case "file": {
															const isImage =
																part.mediaType.startsWith("image/");

															if (isImage) {
																return (
																	<div
																		key={`${message.id}-${partIndex}`}
																		className="mb-2"
																	>
																		<img
																			alt={part.filename ?? "Uploaded image"}
																			className="max-h-80 rounded-lg border object-contain"
																			src={part.url}
																		/>
																	</div>
																);
															}

															return (
																<div
																	key={`${message.id}-${partIndex}`}
																	className="mb-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
																>
																	<span className="font-medium">
																		Attachment:
																	</span>
																	<span>{part.filename ?? part.mediaType}</span>
																</div>
															);
														}
														case "reasoning":
															return (
																<Reasoning
																	key={`${message.id}-${partIndex}`}
																	isStreaming={part.state === "streaming"}
																>
																	<ReasoningTrigger />
																	<ReasoningContent>
																		{part.text}
																	</ReasoningContent>
																</Reasoning>
															);
														case "text":
															return (
																<MessageResponse
																	key={`${message.id}-${partIndex}`}
																>
																	{part.text}
																</MessageResponse>
															);
														case "tool-webSearch":
															return part.state === "output-available" ? (
																<div
																	key={`${message.id}-${partIndex}`}
																	className="not-prose mb-4 flex flex-wrap gap-2"
																>
																	{part.output.map((source, sourceIndex) => (
																		<Source key={source.url} href={source.url}>
																			<SourceTrigger
																				showFavicon
																				label={sourceIndex + 1}
																			/>
																			<SourceContent
																				title={source.title ?? source.url}
																				description={source.content}
																			/>
																		</Source>
																	))}
																</div>
															) : (
																<div
																	key={`${message.id}-${partIndex}`}
																	className="flex items-center gap-1.5"
																>
																	<Shimmer as="p" className="text-sm">
																		{`Searching for: ${part.state === "input-available" ? part.input.query : "..."}`}
																	</Shimmer>
																</div>
															);
														case "tool-updateWorkingMemory":
															return (
																<WorkingMemoryUpdate
																	key={`${message.id}-${partIndex}`}
																	state={part.state}
																	input={
																		part.state !== "input-streaming"
																			? part.input
																			: undefined
																	}
																/>
															);
														default:
															return null;
													}
												})}
											</MessageContent>
										</Message>
									</motion.div>
								))}

								{showShimmer ? (
									<motion.div
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
									>
										<Message from="assistant">
											<MessageContent>
												<Shimmer as="p" className="text-sm">
													Thinking...
												</Shimmer>
											</MessageContent>
										</Message>
									</motion.div>
								) : null}

								{visibleError ? (
									<p className="text-destructive text-sm" role="alert">
										{visibleError}
									</p>
								) : null}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>

						<div className="mx-auto w-full max-w-[70ch] px-6 pb-8 pt-4">
							<ChatPromptComposer
								className="w-full"
								draftScopeKey={threadId}
								errorMessage={visibleError}
								onInteract={() => {
									if (error) {
										clearError();
									}
								}}
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
