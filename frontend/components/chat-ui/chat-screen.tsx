"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Attachment,
	AttachmentInfo,
	AttachmentPreview,
	AttachmentRemove,
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

export function resolveChatSessionKey(
	routeState: ChatRouteState,
): string {
	if (routeState.mode === "existing") {
		return `main-chat-${routeState.threadId}`;
	}

	if (routeState.mode === "new") {
		return "main-chat-new";
	}

	return "main-chat-unavailable";
}

export function shouldSkipHistoryReload(options: {
	chatStatus: ChatStatus;
	firstTurnActive: boolean;
}): boolean {
	if (options.firstTurnActive) {
		return true;
	}

	if (options.chatStatus === "submitted" || options.chatStatus === "streaming") {
		return true;
	}

	return false;
}

/**
 * Returns true when a loading shimmer should be displayed for the assistant.
 *
 * Covers two cases:
 *  1. status is "submitted" (request sent, no stream open yet)
 *  2. status is "streaming" but the last assistant message has no text or
 *     reasoning parts with actual content (stream is open, first token
 *     hasn't arrived yet)
 */
export function shouldShowLoadingShimmer(
	status: ChatStatus,
	messages: MyUIMessage[],
): boolean {
	if (status === "submitted") return true;

	if (status === "streaming") {
		const lastAssistant = findLast(messages, (m) => m.role === "assistant");
		if (!lastAssistant) return true;

		const hasContent = lastAssistant.parts.some(
			(part) =>
				(part.type === "text" || part.type === "reasoning") &&
				(part as { text: string }).text.length > 0,
		);

		return !hasContent;
	}

	return false;
}

function findLast<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
	for (let i = arr.length - 1; i >= 0; i -= 1) {
		if (predicate(arr[i])) return arr[i];
	}
	return undefined;
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

	// Stable key for useChat that preserves stream continuity during
	// first-turn thread creation. When a thread is created from "new" mode,
	// the key stays stable so useChat does not re-key and destroy the
	// in-flight stream. For existing threads the key is thread-specific
	// so navigating between threads correctly resets chat state.
	const [chatSessionKey, setChatSessionKey] = useState(
		() => resolveChatSessionKey(routeState),
	);

	// Tracks the thread ID created during a first-turn submission.
	// Set in onThreadCreated, cleared after the stream completes.
	// Prevents: (1) useChat re-key, (2) history reload overwriting stream,
	// (3) router.replace triggering premature routeState update.
	const firstTurnThreadIdRef = useRef<string | null>(null);

	useEffect(() => {
		// If the incoming route matches the thread we just created in a
		// first-turn flow, the route is catching up after the deferred
		// router.replace.  Don't re-key useChat — just sync activeThreadId.
		if (firstTurnThreadIdRef.current === routeState.threadId) {
			setActiveThreadId(routeState.threadId);
			activeThreadIdRef.current = routeState.threadId;
			return;
		}

		// Genuine route change (sidebar navigation, new chat button, etc.)
		// — update both the session key and active thread ID.
		setChatSessionKey(resolveChatSessionKey(routeState));
		setActiveThreadId(routeState.threadId);
		activeThreadIdRef.current = routeState.threadId;
	}, [routeState.threadId, routeState.mode]);

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
			id: chatSessionKey,
			transport,
		});

	// After a first-turn stream completes (or errors), sync the server
	// route so sidebar highlighting and refresh behave correctly.
	useEffect(() => {
		const firstTurnId = firstTurnThreadIdRef.current;
		if (firstTurnId && (status === "ready" || status === "error")) {
			firstTurnThreadIdRef.current = null;
			// Now that the stream is done, the route can safely sync.
			// router.replace triggers a server re-render → routeState
			// change → the effect above runs, sees no firstTurn match,
			// and (re-)confirms chatSessionKey with the real thread ID.
			router.replace(buildChatThreadUrl(firstTurnId));
		}
	}, [status, router]);

	useEffect(() => {
		if (!canUseChat) {
			setMessages([]);
			setHistoryLoading(false);
			setHistoryError(null);
			return;
		}

		// Skip history reload while a stream or first-turn creation
		// is active — reloading would overwrite the live stream with
		// stale backend data and cause the blank-state flash.
		if (shouldSkipHistoryReload({
			chatStatus: status,
			firstTurnActive: firstTurnThreadIdRef.current !== null,
		})) {
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
	}, [activeThreadId, canUseChat, setMessages, status]);

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
						// Mark first-turn creation so the history-reload
						// effect and route-sync effect know not to
						// overwrite the live stream.
						firstTurnThreadIdRef.current = threadId;
						activeThreadIdRef.current = threadId;
						setActiveThreadId(threadId);
						// Update URL for bookmarking without triggering a
						// server re-render that would change routeState and
						// re-key useChat mid-stream.  After the stream
						// completes, the post-stream effect calls
						// router.replace to sync server state.
						window.history.replaceState(
							null,
							"",
							buildChatThreadUrl(threadId),
						);
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
	const isEmptyState =
		routeState.mode === "new" &&
		visibleMessages.length === 0 &&
		!historyLoading;
	const composerStatus: ChatStatus = isPreparingSubmit ? "submitted" : status;
	const submitFeedbackLabel = resolveMainChatSubmitFeedbackLabel({
		routeMode: routeState.mode,
		messagesCount: visibleMessages.length,
		status: composerStatus,
		isPreparingSubmit,
	});

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
							errorMessage={submitError ?? error?.message ?? null}
							hintMessage={submitFeedbackLabel}
							onInteract={() => setSubmitError(null)}
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
								{historyLoading && visibleMessages.length === 0 ? (
									<output className="text-muted-foreground text-sm">
										Loading thread messages...
									</output>
								) : null}

								{visibleMessages.map((message) => (
									<motion.div
										key={message.id}
										initial={{ opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.2,
											ease: [0.25, 0.1, 0.25, 1],
										}}
									>
										<Message from={message.role}>
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
																	<ReasoningContent>
																		{classified.text}
																	</ReasoningContent>
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

															const outputEntries = Array.isArray(
																sourcePart.output,
															)
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
																			<Source
																				key={source.url}
																				href={source.url}
																			>
																				<SourceTrigger
																					showFavicon
																					label={sourceIndex + 1}
																				/>
																				<SourceContent
																					title={
																						source.title ?? source.url
																					}
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
																	const results = Array.isArray(
																		toolPart.output,
																	)
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
																					<Source
																						key={source.url}
																						href={source.url}
																					>
																						<SourceTrigger
																							showFavicon
																							label={sourceIndex + 1}
																						/>
																						<SourceContent
																							title={
																								source.title ??
																								source.url
																							}
																							description={
																								source.content
																							}
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
									</motion.div>
								))}

								{shouldShowLoadingShimmer(status, messages) && (
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
								)}

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
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
