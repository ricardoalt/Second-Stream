"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Attachment,
	AttachmentInfo,
	AttachmentPreview,
	Attachments,
} from "@/components/ai-elements/attachments";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { WorkingMemory } from "@/config/working-memory";
import {
	createChatThread,
	reloadPersistedThreadHistory,
	uploadChatAttachment,
} from "@/lib/api/chat";
import { createChatBridgeTransport } from "@/lib/chat-bridge/transport";
import type { ChatRouteState } from "@/lib/chat-runtime/routing";
import { buildChatThreadUrl } from "@/lib/chat-runtime/routing";
import type { MyUIMessage } from "@/types/ui-message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "./ai-elements/reasoning";
import { Shimmer } from "./ai-elements/shimmer";
import { Source, SourceContent, SourceTrigger } from "./ai-elements/sources";
import { WorkingMemoryUpdate } from "./ai-elements/working-memory-update";
import { ChatPromptComposer } from "./chat-prompt-composer";

interface ChatScreenProps {
	routeState: ChatRouteState;
}

export function canUseMainChatTransport(threadId: string): boolean {
	const value = threadId.trim();
	return value.length > 0 && value !== "new";
}

export function shouldShowMainChatThinking(status: ChatStatus): boolean {
	return status === "submitted" || status === "streaming";
}

export function shouldShowMainChatLandingState(options: {
	routeMode: ChatRouteState["mode"];
	messagesCount: number;
	historyLoading: boolean;
}): boolean {
	return (
		options.routeMode === "new" &&
		options.messagesCount === 0 &&
		!options.historyLoading
	);
}

export type ClassifiedPart =
	| { kind: "text"; text: string }
	| { kind: "file"; part: UIMessage["parts"][number] & { type: "file" } }
	| { kind: "reasoning"; text: string; isStreaming: boolean }
	| {
			kind: "source";
			part: UIMessage["parts"][number] & { type: "source-document" };
	  }
	| {
			kind: "tool-invocation";
			part: UIMessage["parts"][number] & { type: "tool-invocation" };
	  }
	| { kind: "unknown" };

export function classifyMessagePart(
	part: UIMessage["parts"][number],
): ClassifiedPart {
	switch (part.type) {
		case "text":
			return { kind: "text", text: part.text };
		case "file":
			return {
				kind: "file",
				part: part as UIMessage["parts"][number] & { type: "file" },
			};
		case "reasoning":
			return {
				kind: "reasoning",
				text: part.text,
				isStreaming: part.state === "streaming",
			};
		case "source-document":
			return {
				kind: "source",
				part: part as UIMessage["parts"][number] & { type: "source-document" },
			};
		case "tool-invocation":
			return {
				kind: "tool-invocation",
				part: part as UIMessage["parts"][number] & { type: "tool-invocation" },
			};
		default:
			return { kind: "unknown" };
	}
}

export function resolveMainChatSubmitFeedbackLabel(options: {
	routeMode: ChatRouteState["mode"];
	messagesCount: number;
	status: ChatStatus;
	isPreparingSubmit: boolean;
}): string | null {
	if (
		options.isPreparingSubmit &&
		options.routeMode === "new" &&
		options.messagesCount === 0
	) {
		return "Creating your chat...";
	}

	if (
		(options.status === "submitted" || options.status === "streaming") &&
		options.routeMode === "new" &&
		options.messagesCount === 0
	) {
		return "Sending your first message...";
	}

	return null;
}

export async function submitMainChatTurn(options: {
	routeMode: ChatRouteState["mode"];
	currentThreadId: string;
	message: PromptInputMessage;
	sendMessage: (message: { text: string }) => Promise<void>;
	createThread: (title?: string) => Promise<{ id: string }>;
	uploadAttachment?: (file: File) => Promise<string>;
	resolveUploadFile?: (
		part: PromptInputMessage["files"][number],
	) => Promise<File>;
	onAttachmentsPrepared?: (attachmentIds: string[]) => void;
	onThreadCreated: (threadId: string) => void;
	onAccepted: () => void;
}): Promise<{ threadId: string } | null> {
	if (options.routeMode === "unavailable") {
		throw new Error(
			"Thread unavailable. Pick a valid thread from the sidebar.",
		);
	}

	const text = options.message.text.trim();
	if (text.length === 0) {
		return null;
	}

	let nextThreadId = options.currentThreadId;
	if (options.routeMode === "new") {
		const createdThread = await options.createThread(text.slice(0, 80));
		nextThreadId = createdThread.id;
		options.onThreadCreated(nextThreadId);
	}

	const attachmentIds = await uploadMainChatAttachments({
		files: options.message.files ?? [],
		uploadAttachment: options.uploadAttachment,
		resolveUploadFile:
			options.resolveUploadFile ?? resolveUploadFileFromPromptPart,
	});
	options.onAttachmentsPrepared?.(attachmentIds);

	await options.sendMessage({ text });
	options.onAccepted();

	return { threadId: nextThreadId };
}

export async function resolveUploadFileFromPromptPart(
	part: PromptInputMessage["files"][number],
): Promise<File> {
	const response = await fetch(part.url);
	if (!response.ok) {
		throw new Error(`Unable to read attachment ${part.filename ?? "file"}.`);
	}

	const blob = await response.blob();
	const filename = part.filename ?? "attachment";
	const mediaType = part.mediaType || blob.type || "application/octet-stream";

	return new File([blob], filename, { type: mediaType });
}

export async function uploadMainChatAttachments(options: {
	files: PromptInputMessage["files"];
	uploadAttachment?: (file: File) => Promise<string>;
	resolveUploadFile: (
		part: PromptInputMessage["files"][number],
	) => Promise<File>;
}): Promise<string[]> {
	if (options.files.length === 0) {
		return [];
	}

	if (!options.uploadAttachment) {
		throw new Error("Attachment upload is not configured.");
	}

	const attachmentIds: string[] = [];
	for (const part of options.files) {
		const file = await options.resolveUploadFile(part);
		attachmentIds.push(await options.uploadAttachment(file));
	}

	return attachmentIds;
}

export function buildOptimisticUserMessage(text: string): MyUIMessage {
	const trimmed = text.trim();
	return {
		id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
		role: "user",
		parts: [{ type: "text", text: trimmed }],
	};
}

export function resolveVisibleMessages(
	chatMessages: MyUIMessage[],
	optimisticMessage: MyUIMessage | null,
): MyUIMessage[] {
	if (!optimisticMessage) {
		return chatMessages;
	}

	// If chat already has a user message whose text content matches
	// the optimistic message's text, the real message has arrived —
	// skip the optimistic duplicate.
	const optimisticText = optimisticMessage.parts
		.filter((p): p is { type: "text"; text: string } => p.type === "text")
		.map((p) => p.text)
		.join("")
		.trim();

	const chatAlreadyHasContent = chatMessages.some((msg) => {
		if (msg.role !== "user") return false;
		const msgText = msg.parts
			.filter((p): p is { type: "text"; text: string } => p.type === "text")
			.map((p) => p.text)
			.join("")
			.trim();
		return msgText === optimisticText;
	});

	if (chatAlreadyHasContent) {
		return chatMessages;
	}

	return [...chatMessages, optimisticMessage];
}

export function ChatScreen({ routeState }: ChatScreenProps) {
	const router = useRouter();
	const [activeThreadId, setActiveThreadId] = useState(routeState.threadId);
	const activeThreadIdRef = useRef(routeState.threadId);
	const pendingAttachmentIdsRef = useRef<string[]>([]);
	const [historyError, setHistoryError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [isPreparingSubmit, setIsPreparingSubmit] = useState(false);
	const isPreparingSubmitRef = useRef(false);
	const [optimisticUserMessage, setOptimisticUserMessage] = useState<MyUIMessage | null>(null);

	useEffect(() => {
		setActiveThreadId(routeState.threadId);
		activeThreadIdRef.current = routeState.threadId;
	}, [routeState.threadId]);

	const canUseChat =
		routeState.mode !== "unavailable" &&
		canUseMainChatTransport(activeThreadId);

	const transport = useMemo(
		() =>
			createChatBridgeTransport({
				threadId: activeThreadId,
				getThreadId: () => activeThreadIdRef.current,
				getAttachmentIds: () => pendingAttachmentIdsRef.current,
			}),
		[activeThreadId],
	);

	const { messages, sendMessage, status, error, setMessages } =
		useChat<MyUIMessage>({
			id: `main-chat-${activeThreadId}`,
			transport,
		});

	useEffect(() => {
		if (!canUseChat) {
			setMessages([]);
			setHistoryLoading(false);
			setHistoryError(null);
			return;
		}

		let cancelled = false;
		setHistoryLoading(true);
		setHistoryError(null);

		void reloadPersistedThreadHistory(activeThreadId)
			.then((persistedMessages) => {
				if (cancelled) {
					return;
				}
				setMessages(persistedMessages);
			})
			.catch((loadError: unknown) => {
				if (cancelled) {
					return;
				}

				setHistoryError(
					loadError instanceof Error
						? loadError.message
						: "Unable to load thread history.",
				);
			})
			.finally(() => {
				if (!cancelled) {
					setHistoryLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [activeThreadId, canUseChat, setMessages]);

	// Clear optimistic message once useChat delivers real messages that
	// supersede it. resolveVisibleMessages handles deduplication, but we
	// clear the state to avoid keeping stale optimistic data around.
	useEffect(() => {
		if (
			optimisticUserMessage &&
			messages.length > 0 &&
			messages.some((msg) => {
				if (msg.role !== "user") return false;
				const msgText = msg.parts
					.filter((p): p is { type: "text"; text: string } => p.type === "text")
					.map((p) => p.text)
					.join("")
					.trim();
				const optimisticText = optimisticUserMessage.parts
					.filter((p): p is { type: "text"; text: string } => p.type === "text")
					.map((p) => p.text)
					.join("")
					.trim();
				return msgText === optimisticText;
			})
		) {
			setOptimisticUserMessage(null);
		}
	}, [messages, optimisticUserMessage]);

	const handleSubmitMessage = useCallback(
		async (message: PromptInputMessage) => {
			if (isPreparingSubmitRef.current) {
				return;
			}

			isPreparingSubmitRef.current = true;
			setIsPreparingSubmit(true);
			setSubmitError(null);
			pendingAttachmentIdsRef.current = [];

			// Show the user's message immediately before the async round-trip
			// to create/upload/send. Cleared once useChat delivers the real
			// message back from the backend.
			const optimistic = buildOptimisticUserMessage(message.text);
			setOptimisticUserMessage(optimistic);

			try {
				await submitMainChatTurn({
					routeMode: routeState.mode,
					currentThreadId: activeThreadId,
					message,
					sendMessage,
					createThread: createChatThread,
					uploadAttachment: uploadChatAttachment,
					onAttachmentsPrepared: (attachmentIds) => {
						pendingAttachmentIdsRef.current = attachmentIds;
					},
					onThreadCreated: (threadId) => {
						activeThreadIdRef.current = threadId;
						setActiveThreadId(threadId);
						router.replace(buildChatThreadUrl(threadId));
					},
					onAccepted: () => {
						pendingAttachmentIdsRef.current = [];
						setSubmitError(null);
					},
				});
			} catch (submissionError) {
				setOptimisticUserMessage(null);
				setSubmitError(
					submissionError instanceof Error
						? submissionError.message
						: "Unable to send message.",
				);
				throw submissionError;
			} finally {
				setIsPreparingSubmit(false);
				isPreparingSubmitRef.current = false;
			}
		},
		[activeThreadId, routeState.mode, router, sendMessage],
	);

	if (routeState.mode === "unavailable") {
		return (
			<div className="flex h-full w-full items-center justify-center px-6">
				<output className="max-w-xl rounded-md border p-4 text-sm">
					Thread unavailable. Pick a valid thread from the sidebar.
				</output>
			</div>
		);
	}

	const visibleError = submitError ?? error?.message ?? historyError;
	const visibleMessages = resolveVisibleMessages(messages, optimisticUserMessage);
	const showLandingState = shouldShowMainChatLandingState({
		routeMode: routeState.mode,
		messagesCount: visibleMessages.length,
		historyLoading,
	});
	const composerStatus: ChatStatus = isPreparingSubmit ? "submitted" : status;
	const submitFeedbackLabel = resolveMainChatSubmitFeedbackLabel({
		routeMode: routeState.mode,
		messagesCount: visibleMessages.length,
		status: composerStatus,
		isPreparingSubmit,
	});

	if (showLandingState) {
		return (
			<div className="flex h-full flex-1 flex-col">
				<Conversation className="min-h-0 flex-1">
					<ConversationContent className="mx-auto flex w-full max-w-[70ch] flex-1 flex-col items-center justify-center gap-6 px-6 py-6">
						<ConversationEmptyState
							className="gap-3 p-0"
							description="Start with a question or drop files to give context."
							title="What can I help with?"
						/>
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				<div className="mx-auto w-full max-w-[70ch] px-6 pb-8 pt-4">
					<ChatPromptComposer
						className="w-full"
						errorMessage={submitError ?? error?.message ?? null}
						hintMessage={submitFeedbackLabel}
						onInteract={() => setSubmitError(null)}
						onSubmitMessage={handleSubmitMessage}
						placeholder="Ask anything"
						status={composerStatus}
						textareaClassName="min-h-16 text-base"
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-1 flex-col">
			<Conversation className="min-h-0 flex-1">
				<ConversationContent className="mx-auto w-full max-w-[70ch] gap-6 px-6 py-6">
					{historyLoading && visibleMessages.length === 0 ? (
						<output className="text-muted-foreground text-sm">
							Loading thread messages...
						</output>
					) : null}

					{visibleMessages.map((message) => (
						<Message from={message.role} key={message.id}>
							<MessageContent>
								{message.parts.map((part, index) => {
									const classified = classifyMessagePart(part);

									switch (classified.kind) {
										case "file":
											return (
												<Attachments
													className="w-full"
													key={`${message.id}-attachment-${index}`}
													variant="list"
												>
													<Attachment
														data={{
															...classified.part,
															id: `${message.id}-attachment-${index}`,
														}}
													>
														<AttachmentPreview />
														<AttachmentInfo showMediaType />
													</Attachment>
												</Attachments>
											);
										case "text":
											return (
												<MessageResponse key={`${message.id}-${index}`}>
													{classified.text}
												</MessageResponse>
											);
										case "reasoning":
											return (
												<Reasoning
													key={`${message.id}-${index}`}
													isStreaming={classified.isStreaming}
												>
													<ReasoningTrigger />
													<ReasoningContent>{classified.text}</ReasoningContent>
												</Reasoning>
											);
										case "source": {
											const sourcePart = classified.part;
											if (sourcePart.state !== "output-available") {
												return (
													<div
														className="flex items-center gap-1.5"
														key={`${message.id}-${index}`}
													>
														<Shimmer as="p" className="text-sm">
															Looking up sources...
														</Shimmer>
													</div>
												);
											}

											const outputEntries = Array.isArray(sourcePart.output)
												? sourcePart.output
												: [];
											return (
												<div
													className="not-prose mb-4 flex flex-wrap gap-2"
													key={`${message.id}-${index}`}
												>
													{outputEntries.map(
														(
															source: {
																url: string;
																title?: string | null;
																content?: string;
															},
															sourceIndex: number,
														) => (
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
														),
													)}
												</div>
											);
										}
										case "tool-invocation": {
											const toolPart = classified.part;
											const toolName = toolPart.toolName;
											if (toolName === "webSearch") {
												if (toolPart.state === "output-available") {
													const results = Array.isArray(toolPart.output)
														? toolPart.output
														: [];
													return (
														<div
															className="not-prose mb-4 flex flex-wrap gap-2"
															key={`${message.id}-${index}`}
														>
															{results.map(
																(
																	source: {
																		url: string;
																		title?: string | null;
																		content?: string;
																	},
																	sourceIndex: number,
																) => (
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
																),
															)}
														</div>
													);
												}
												return (
													<div
														className="flex items-center gap-1.5"
														key={`${message.id}-${index}`}
													>
														<Shimmer as="p" className="text-sm">
															{toolPart.state === "input-available" &&
															toolPart.input &&
															typeof toolPart.input === "object" &&
															"query" in toolPart.input
																? `Searching for: ${(toolPart.input as { query: string }).query}`
																: "Searching..."}
														</Shimmer>
													</div>
												);
											}
											if (toolName === "updateWorkingMemory") {
												return (
													<WorkingMemoryUpdate
														key={`${message.id}-${index}`}
														state={toolPart.state}
														{...(toolPart.state !== "input-streaming" &&
														toolPart.input
															? {
																	input: toolPart.input as {
																		memory: WorkingMemory;
																	},
																}
															: {})}
													/>
												);
											}
											return null;
										}
										default:
											return null;
									}
								})}
							</MessageContent>
						</Message>
					))}

					{shouldShowMainChatThinking(status) ? (
						<Message from="assistant">
							<MessageContent>
								<Shimmer as="p" className="text-sm">
									Thinking...
								</Shimmer>
							</MessageContent>
						</Message>
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
					errorMessage={submitError ?? error?.message ?? null}
					hintMessage={submitFeedbackLabel}
					onInteract={() => setSubmitError(null)}
					onSubmitMessage={handleSubmitMessage}
					placeholder="Send a message"
					status={composerStatus}
					textareaClassName="min-h-14"
				/>
			</div>
		</div>
	);
}
