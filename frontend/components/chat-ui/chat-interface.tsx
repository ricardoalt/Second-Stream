"use client";

import { GlobeIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { nanoid } from "nanoid";
import Image from "next/image";
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	createChatThread,
	reloadPersistedThreadHistory,
	streamPersistedChatTurn,
	uploadChatAttachment,
} from "@/lib/api/chat";
import {
	type AttachmentUploadState,
	initializeUploadStates,
	updateUploadState,
} from "@/lib/chat-attachment-utils";
import {
	streamAndReloadPersistedTurn,
	uploadDraftAttachmentsForSend,
} from "@/lib/chat-send-flow";
import {
	canSubmitPromptMessage,
	shouldShowLoadingShimmer,
} from "@/lib/chat-utils";
import type { MyUIMessage } from "@/types/ui-message";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "./ai-elements/conversation";
import {
	Message,
	MessageActions,
	MessageContent,
	MessageResponse,
} from "./ai-elements/message";
import type { PromptInputMessage } from "./ai-elements/prompt-input";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "./ai-elements/reasoning";
import { Shimmer } from "./ai-elements/shimmer";
import { Source, SourceContent, SourceTrigger } from "./ai-elements/sources";
import { WorkingMemoryUpdate } from "./ai-elements/working-memory-update";
import { ChatPromptComposer } from "./chat-prompt-composer";
import { CopyButton } from "./copy-button";

export { runDraftAttachmentSendFlow } from "@/lib/chat-send-flow";

interface ChatInterfaceProps {
	initialMessages?: MyUIMessage[];
	threadId: string;
	onMessagesChange?: (messages: MyUIMessage[]) => void;
	onThreadCreated?: (threadId: string) => void;
}

export function ChatInterface({
	initialMessages = [],
	threadId,
	onMessagesChange,
	onThreadCreated,
}: ChatInterfaceProps) {
	const [messages, setMessages] = useState<MyUIMessage[]>(initialMessages);
	const [status, setStatus] = useState<"ready" | "streaming" | "submitted">(
		"ready",
	);
	const [error, setError] = useState<Error | null>(null);
	const [attachmentUploadStates, setAttachmentUploadStates] = useState<
		AttachmentUploadState[]
	>([]);

	const isEmptyState = messages.length === 0;
	const isUploading = attachmentUploadStates.some(
		(s) => s.status === "uploading",
	);
	const composerStatus = isUploading ? "submitted" : status;

	const clearError = useCallback(() => {
		setError(null);
		setAttachmentUploadStates([]);
	}, []);

	useEffect(() => {
		let cancelled = false;

		const loadThreadHistory = async () => {
			if (threadId === "new") {
				setMessages(initialMessages);
				setStatus("ready");
				return;
			}

			setStatus("submitted");
			try {
				const persistedMessages = await reloadPersistedThreadHistory(threadId);
				if (cancelled) return;
				setMessages(persistedMessages);
				onMessagesChange?.(persistedMessages);
				setStatus("ready");
			} catch {
				if (cancelled) return;
				setMessages([]);
				setStatus("ready");
			}
		};

		void loadThreadHistory();

		return () => {
			cancelled = true;
		};
	}, [initialMessages, onMessagesChange, threadId]);

	const sendMessage = useCallback(
		async (message: PromptInputMessage) => {
			const fileCount = message.files?.length ?? 0;
			let existingAttachmentIds: string[] = [];

			if (fileCount > 0) {
				setAttachmentUploadStates(initializeUploadStates(fileCount));
				const uploadResult = await uploadDraftAttachmentsForSend({
					files: message.files ?? [],
					uploadAttachment: uploadChatAttachment,
					onUploadStateChange: (index, state) => {
						setAttachmentUploadStates((previous) =>
							updateUploadState(previous, index, state),
						);
					},
				});

				if (uploadResult.status === "error") {
					setError(uploadResult.error);
					setStatus("ready");
					return;
				}

				existingAttachmentIds = uploadResult.attachmentIds;
			}

			setAttachmentUploadStates([]);

			setStatus("submitted");
			let resolvedThreadId = threadId;

			if (threadId === "new") {
				const candidateTitle = message.text.trim().slice(0, 80);
				const createdThread = await createChatThread(
					candidateTitle.length > 0 ? candidateTitle : undefined,
				);
				resolvedThreadId = createdThread.id;
				onThreadCreated?.(resolvedThreadId);
			}

			// Create user message
			const userMessage: MyUIMessage = {
				id: nanoid(),
				role: "user",
				parts: [
					{ type: "text", text: message.text },
					...(message.files?.map(
						(f) =>
							({
								type: "file",
								filename: f.filename,
								mediaType: f.mediaType,
								url: f.url,
							}) as MyUIMessage["parts"][number],
					) || []),
				],
			};

			setMessages((previousMessages) => {
				const updatedMessages = [...previousMessages, userMessage];
				onMessagesChange?.(updatedMessages);
				return updatedMessages;
			});

			setStatus("streaming");
			const assistantMessageDraftId = nanoid();
			setMessages((previousMessages) => [
				...previousMessages,
				{
					id: assistantMessageDraftId,
					role: "assistant",
					content: "",
					parts: [{ type: "text", text: "" }],
				},
			]);

			const persistedMessages = await streamAndReloadPersistedTurn({
				threadId: resolvedThreadId,
				contentText: message.text,
				attachmentIds: existingAttachmentIds,
				streamTurn: streamPersistedChatTurn,
				reloadHistory: reloadPersistedThreadHistory,
				onStreamEvent: (event) => {
					if (event.event === "delta") {
						setMessages((previousMessages) =>
							previousMessages.map((chatMessage) => {
								if (chatMessage.id !== assistantMessageDraftId) {
									return chatMessage;
								}

								const currentTextPart = chatMessage.parts.find(
									(part) => part.type === "text",
								);
								const currentText =
									currentTextPart?.type === "text" ? currentTextPart.text : "";
								const nextText = currentText + event.delta;
								return {
									...chatMessage,
									parts: [{ type: "text", text: nextText }],
								};
							}),
						);
					}
				},
			});
			setMessages(persistedMessages);
			onMessagesChange?.(persistedMessages);
			setStatus("ready");
		},
		[onMessagesChange, onThreadCreated, threadId],
	);

	const handleSubmitMessage = useCallback(
		async (message: PromptInputMessage): Promise<void> => {
			if (!canSubmitPromptMessage(message)) {
				return;
			}

			clearError();
			try {
				await sendMessage(message);
			} catch (sendError) {
				setError(
					sendError instanceof Error
						? sendError
						: new Error("Unable to complete this chat turn."),
				);
				setStatus("ready");
				if (threadId !== "new") {
					const persistedMessages = await reloadPersistedThreadHistory(
						threadId,
					).catch(() => null);
					if (persistedMessages) {
						setMessages(persistedMessages);
						onMessagesChange?.(persistedMessages);
					}
				}
			}
		},
		[clearError, onMessagesChange, sendMessage, threadId],
	);

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
						<h1 className="text-foreground text-5xl font-medium tracking-tight">
							What can I help with?
						</h1>
						<ChatPromptComposer
							className="w-full"
							errorMessage={error?.message ?? null}
							onInteract={() => {
								if (error) {
									clearError();
								}
							}}
							onSubmitMessage={handleSubmitMessage}
							placeholder="Ask anything"
							status={composerStatus}
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
								{messages.map(
									(message, index): React.JSX.Element => (
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
													{message.parts?.map((part, i) => {
														switch (part.type) {
															case "file": {
																const isImage =
																	part.mediaType?.startsWith("image/");

																if (isImage) {
																	return (
																		<div
																			key={`${message.id}-${i}`}
																			className="mb-2"
																		>
																			<Image
																				alt={part.filename ?? "Uploaded image"}
																				className="max-h-80 rounded-lg border object-contain"
																				src={part.url}
																				unoptimized
																				width={512}
																				height={512}
																			/>
																		</div>
																	);
																}

																return (
																	<div
																		key={`${message.id}-${i}`}
																		className="mb-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
																	>
																		<span className="font-medium">
																			Attachment:
																		</span>
																		<span>
																			{part.filename ?? part.mediaType}
																		</span>
																	</div>
																);
															}
															case "reasoning":
																return (
																	<Reasoning
																		key={`${message.id}-${i}`}
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
																	<MessageResponse key={`${message.id}-${i}`}>
																		{part.text}
																	</MessageResponse>
																);
															case "tool-webSearch":
																return part.state === "output-available" ? (
																	<div
																		key={`${message.id}-${i}`}
																		className="not-prose mb-4 flex flex-wrap gap-2"
																	>
																		{part.output?.map((source, index) => (
																			<Source
																				key={source.url}
																				href={source.url}
																			>
																				<SourceTrigger
																					showFavicon
																					label={index + 1}
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
																		key={`${message.id}-${i}`}
																		className="flex items-center gap-1.5"
																	>
																		<GlobeIcon className="text-muted-foreground size-3.5" />
																		<Shimmer as="p" className="text-sm">
																			{`Searching for: ${part.state === "input-available" ? part.input?.query : "..."}`}
																		</Shimmer>
																	</div>
																);
															case "tool-updateWorkingMemory":
																return (
																	<WorkingMemoryUpdate
																		key={`${message.id}-${i}`}
																		state={part.state}
																		{...(part.state !== "input-streaming" &&
																		part.input
																			? { input: part.input }
																			: {})}
																	/>
																);
															default:
																return null;
														}
													})}
												</MessageContent>
												{message.role === "assistant" && (
													<MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
														<CopyButton
															text={message.parts
																?.filter((p) => p.type === "text")
																.map((p) => p.text)
																.join("\n")}
														/>
													</MessageActions>
												)}
											</Message>
										</motion.div>
									),
								)}

								{shouldShowLoadingShimmer(status, messages) && (
									<motion.div
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.15,
											ease: [0.25, 0.1, 0.25, 1],
										}}
									>
										<Message from="assistant">
											<MessageContent>
												<Shimmer as="p" className="text-sm">
													Thinking...
												</Shimmer>
											</MessageContent>
										</Message>
									</motion.div>
								)}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>

						<div className="mx-auto w-full max-w-[70ch] px-6 pb-8 pt-4">
							<ChatPromptComposer
								className="w-full"
								errorMessage={error?.message ?? null}
								onInteract={() => {
									if (error) {
										clearError();
									}
								}}
								onSubmitMessage={handleSubmitMessage}
								placeholder="Say something..."
								status={composerStatus}
								textareaClassName="min-h-14"
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
