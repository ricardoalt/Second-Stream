"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Conversation,
	ConversationContent,
	ConversationDownload,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
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
	AgentStatusDataPart,
	ConversationTitleDataPart,
	MyUIMessage,
	NewThreadCreatedDataPart,
} from "@/types/ui-message";
import {
	DATA_AGENT_STATUS_PART,
	DATA_CONVERSATION_TITLE_PART,
	DATA_NEW_THREAD_CREATED_PART,
} from "@/types/ui-message";
import { ChatEmptyGreeting } from "./chat-empty-greeting";
import { ChatPromptComposer } from "./chat-prompt-composer";
import { MessagePartsRenderer } from "./message-parts-renderer";
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
	const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
	const [retryMessage, setRetryMessage] = useState<PromptInputMessage | null>(
		null,
	);
	const [agentStatus, setAgentStatus] = useState<{
		phase: string;
		label: string;
	} | null>(null);
	const isSubmittingMessageRef = useRef(false);

	// Track how many messages existed on mount so new messages get stagger
	// animation while historical messages render instantly on load.
	const existingCountRef = useRef(initialMessages.length);

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
		// Disabled until durable cross-worker resume exists in backend infra.
		resume: false,
		experimental_throttle: 50,
		transport,
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
				return;
			}

			if (part.type === DATA_AGENT_STATUS_PART) {
				const statusPart = part as AgentStatusDataPart;
				if (statusPart.data.phase === "idle") {
					setAgentStatus(null);
				} else {
					setAgentStatus(statusPart.data);
				}
				return;
			}
		},
		onFinish: () => {
			setAgentStatus(null);
			void queryClient.refetchQueries({
				queryKey: chatThreadsQueryKey,
				exact: true,
			});
		},
	});
	const statusRef = useRef(status);

	const releaseSubmitLock = useCallback(() => {
		isSubmittingMessageRef.current = false;
		setIsSubmittingMessage(false);
	}, []);

	useEffect(() => {
		statusRef.current = status;
	}, [status]);

	const handleSubmitMessage = useCallback(
		async (message: PromptInputMessage, onAccepted: () => void) => {
			const isChatBusy =
				statusRef.current === "submitted" || statusRef.current === "streaming";
			if (isSubmittingMessageRef.current || isChatBusy) {
				return;
			}

			if (!canSubmitPromptMessage(message)) {
				return;
			}

			isSubmittingMessageRef.current = true;
			setIsSubmittingMessage(true);
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
				onAccepted();
				statusRef.current = "submitted";

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
				releaseSubmitLock();
			}
		},
		[
			chatThreadsQueryKey,
			clearError,
			queryClient,
			releaseSubmitLock,
			sendMessage,
			threadId,
		],
	);

	const handleRetry = useCallback(async () => {
		setSubmitError(null);
		if (error) {
			clearError();
		}

		if (retryMessage) {
			await handleSubmitMessage(retryMessage, () => undefined);
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

	const isEmptyState = messages.length === 0 && status === "ready";
	const isStreamingOrSubmitted =
		status === "submitted" || status === "streaming";
	const isComposerBusy = isSubmittingMessage || isStreamingOrSubmitted;
	const showShimmer = shouldShowLoadingShimmer(status, messages);
	const visibleError = submitError ?? error?.message ?? null;
	const canRetry =
		!isStreamingOrSubmitted && (Boolean(retryMessage) || messages.length > 0);

	const conversationFilename = useMemo(
		() =>
			`secondstream-${threadId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.md`,
		[threadId],
	);

	useEffect(() => {
		if (visibleError) {
			toast.error(visibleError, { id: "chat-error" });
		}
	}, [visibleError]);

	useEffect(() => {
		if (
			isSubmittingMessageRef.current &&
			status !== "submitted" &&
			status !== "streaming"
		) {
			releaseSubmitLock();
		}
	}, [releaseSubmitLock, status]);

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
							busy={isComposerBusy}
							draftScopeKey={threadId}
							errorMessage={visibleError}
							onInteract={() => {
								setSubmitError(null);
								if (error) {
									clearError();
								}
							}}
							onStop={stop}
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
											// Historical messages on load: no delay.
											// New messages during the session: stagger.
											delay:
												index >= existingCountRef.current
													? Math.min(index * 0.04, 0.2)
													: 0,
											ease: [0.25, 0.1, 0.25, 1],
										}}
									>
										<MessagePartsRenderer
											message={message}
											isLastMessage={index === messages.length - 1}
											isStreamingOrSubmitted={isStreamingOrSubmitted}
											messages={messages}
											setMessages={setMessages}
											regenerate={regenerate}
											agentStatus={agentStatus}
										/>
									</motion.div>
								))}

								{showShimmer ? (
									<motion.div
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
									>
										<Shimmer as="p" className="text-sm">
											Thinking...
										</Shimmer>
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
							<ConversationDownload
								aria-label="Download conversation"
								messages={messages}
								filename={conversationFilename}
							/>
						</Conversation>

						<div className="mx-auto w-full max-w-[70ch] px-6 pb-8 pt-4">
							<ChatPromptComposer
								className="w-full"
								busy={isComposerBusy}
								draftScopeKey={threadId}
								errorMessage={visibleError}
								onInteract={() => {
									setSubmitError(null);
									if (error) {
										clearError();
									}
								}}
								onStop={stop}
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
