"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageActions,
	MessageContent,
	MessageResponse,
	MessageToolbar,
} from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { WorkingMemoryUpdate } from "@/components/chat-ui/ai-elements/working-memory-update";
import {
	buildChatThreadsQueryKey,
	type ChatThreadSummaryDTO,
	getChatAttachmentIdFromDownloadUrl,
} from "@/lib/api/chat";
import { createChatBridgeTransport } from "@/lib/chat-bridge/transport";
import {
	canSubmitPromptMessage,
	shouldShowLoadingShimmer,
} from "@/lib/chat-runtime/chat-utils";
import {
	applyConversationTitleFromEvent,
	applyProvisionalThreadFromPrompt,
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
import { ChatAttachmentChip } from "./chat-attachment-chip";
import { ChatEmptyGreeting } from "./chat-empty-greeting";
import { ChatPromptComposer } from "./chat-prompt-composer";
import { CopyButton } from "./copy-button";
import { RegenerateButton } from "./regenerate-button";
import { Button } from "./ui/button";

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
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [retryMessage, setRetryMessage] = useState<PromptInputMessage | null>(
		null,
	);

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

	const {
		messages,
		sendMessage,
		stop,
		regenerate,
		setMessages,
		status,
		error,
		clearError,
	} = useChat<MyUIMessage>({
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
			setSubmitError(null);
			setRetryMessage(null);

			const promptText = message.text.trim();
			const nowIsoString = new Date().toISOString();
			const provisionalTitle =
				deriveProvisionalThreadTitleFromPrompt(promptText);

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
			try {
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
			} catch (submitFailure) {
				setRetryMessage(message);
				setSubmitError(
					submitFailure instanceof Error
						? submitFailure.message
						: "Unable to send this message right now.",
				);
			}
		},
		[chatThreadsQueryKey, clearError, queryClient, sendMessage, threadId],
	);

	const handleRetry = useCallback(async () => {
		setSubmitError(null);
		if (error) {
			clearError();
		}

		if (retryMessage) {
			await handleSubmitMessage(retryMessage);
			return;
		}

		let lastAssistantIndex = -1;
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			if (messages[index]?.role === "assistant") {
				lastAssistantIndex = index;
				break;
			}
		}

		if (lastAssistantIndex >= 0) {
			setMessages(messages.slice(0, lastAssistantIndex));
		}

		regenerate();
	}, [
		clearError,
		error,
		handleSubmitMessage,
		messages,
		regenerate,
		retryMessage,
		setMessages,
	]);

	const isEmptyState = messages.length === 0;
	const isStreamingOrSubmitted =
		status === "submitted" || status === "streaming";
	const showShimmer = shouldShowLoadingShimmer(status, messages);
	const visibleError = submitError ?? error?.message ?? null;
	const canRetry =
		!isStreamingOrSubmitted && (Boolean(retryMessage) || messages.length > 0);

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
						<ChatEmptyGreeting />
						<ChatPromptComposer
							className="w-full"
							draftScopeKey={threadId}
							errorMessage={visibleError}
							onInteract={() => {
								setSubmitError(null);
								if (error) {
									clearError();
								}
							}}
							onSubmitMessage={handleSubmitMessage}
							placeholder="Ask anything"
							status={status}
							textareaClassName="min-h-16 text-lg"
						/>
						{visibleError && canRetry ? (
							<div className="mt-2 flex justify-end">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => void handleRetry()}
								>
									Retry
								</Button>
							</div>
						) : null}
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
															const persistedAttachmentId =
																getChatAttachmentIdFromDownloadUrl(part.url);

															if (isImage && !persistedAttachmentId) {
																return (
																	<div
																		key={`${message.id}-${partIndex}`}
																		className="mb-2"
																	>
																		<Image
																			alt={part.filename ?? "Uploaded image"}
																			className="max-h-80 rounded-lg border object-contain"
																			src={part.url}
																			width={1280}
																			height={960}
																			unoptimized
																		/>
																	</div>
																);
															}

															return (
																<ChatAttachmentChip
																	key={`${message.id}-${partIndex}`}
																	filename={part.filename}
																	mediaType={part.mediaType}
																	url={part.url}
																/>
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
														case "tool-generateDiscoveryReport": {
															if (part.state === "output-available") {
																const bytes = part.output.size_bytes;
																const sizeLabel =
																	bytes >= 1_048_576
																		? `${(bytes / 1_048_576).toFixed(1)} MB`
																		: `${Math.round(bytes / 1024)} KB`;
																return (
																	<a
																		key={`${message.id}-${partIndex}`}
																		href={part.output.download_url}
																		download={part.output.filename}
																		className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent"
																	>
																		<FileText className="size-3.5" />
																		<span>{part.output.filename}</span>
																		<span className="text-muted-foreground">
																			({sizeLabel})
																		</span>
																	</a>
																);
															}
															if (part.state === "output-error") {
																return (
																	<span
																		key={`${message.id}-${partIndex}`}
																		className="text-destructive text-xs"
																	>
																		Failed to generate report
																	</span>
																);
															}
															return (
																<Shimmer
																	key={`${message.id}-${partIndex}`}
																	as="p"
																	className="text-xs"
																>
																	Generating discovery report...
																</Shimmer>
															);
														}
														default:
															return null;
													}
												})}
											</MessageContent>
											{message.role === "assistant" ? (
												<MessageToolbar className="mt-1">
													<MessageActions>
														{message.parts.some(
															(part) => part.type === "text",
														) ? (
															<CopyButton
																text={message.parts
																	.filter((part) => part.type === "text")
																	.map((part) => part.text)
																	.join("\n")}
															/>
														) : null}
														{index === messages.length - 1 &&
														!isStreamingOrSubmitted ? (
															<RegenerateButton
																message={message}
																messages={messages}
																setMessages={setMessages}
																regenerate={regenerate}
															/>
														) : null}
													</MessageActions>
												</MessageToolbar>
											) : null}
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
									<div
										className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
										role="alert"
									>
										<p className="text-destructive text-sm">{visibleError}</p>
										{canRetry ? (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => void handleRetry()}
											>
												Retry
											</Button>
										) : null}
									</div>
								) : null}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>

						<div className="mx-auto w-full max-w-[70ch] px-6 pb-8 pt-4">
							{isStreamingOrSubmitted ? (
								<div className="mb-2 flex justify-end">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={stop}
									>
										Stop
									</Button>
								</div>
							) : null}
							<ChatPromptComposer
								className="w-full"
								draftScopeKey={threadId}
								errorMessage={visibleError}
								onInteract={() => {
									setSubmitError(null);
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
