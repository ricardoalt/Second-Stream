"use client";

import { useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Attachment,
	AttachmentInfo,
	AttachmentPreview,
	Attachments,
} from "@/components/ai-elements/attachments";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
	createChatThread,
	reloadPersistedThreadHistory,
	uploadChatAttachment,
} from "@/lib/api/chat";
import { createChatBridgeTransport } from "@/lib/chat-bridge/transport";
import type { ChatRouteState } from "@/lib/chat-runtime/routing";
import { buildChatThreadUrl } from "@/lib/chat-runtime/routing";
import type { MyUIMessage } from "@/types/ui-message";
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
	const mediaType =
		part.mediaType || blob.type || "application/octet-stream";

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

	const handleSubmitMessage = useCallback(
		async (message: PromptInputMessage) => {
			if (isPreparingSubmitRef.current) {
				return;
			}

			isPreparingSubmitRef.current = true;
			setIsPreparingSubmit(true);
			setSubmitError(null);
			pendingAttachmentIdsRef.current = [];

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
	const showLandingState = shouldShowMainChatLandingState({
		routeMode: routeState.mode,
		messagesCount: messages.length,
		historyLoading,
	});
	const composerStatus: ChatStatus = isPreparingSubmit ? "submitted" : status;
	const submitFeedbackLabel = resolveMainChatSubmitFeedbackLabel({
		routeMode: routeState.mode,
		messagesCount: messages.length,
		status: composerStatus,
		isPreparingSubmit,
	});

	if (showLandingState) {
		return (
			<div className="mx-auto flex h-full w-full max-w-[70ch] flex-1 flex-col items-center justify-center gap-8 px-6 pb-20">
				<ConversationEmptyState className="gap-3 p-0" description="Start with a question or drop files to give context." title="What can I help with?" />
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
		);
	}

	return (
		<div className="flex h-full flex-1 flex-col">
			<Conversation className="min-h-0 flex-1">
				<ConversationContent className="mx-auto w-full max-w-[70ch] gap-6 px-6 py-6">
					{historyLoading && messages.length === 0 ? (
						<output className="text-muted-foreground text-sm">
							Loading thread messages...
						</output>
					) : null}

					{messages.map((message) => (
						<Message from={message.role} key={message.id}>
							<MessageContent>
								<Attachments className="w-full" variant="list">
									{message.parts
										.filter((part) => part.type === "file")
										.map((part, index) => (
											<Attachment
												data={{
													...part,
													id: `${message.id}-attachment-${index}`,
												}}
												key={`${message.id}-attachment-${index}`}
											>
												<AttachmentPreview />
												<AttachmentInfo showMediaType />
											</Attachment>
										))}
								</Attachments>

								{message.parts.map((part, index) => {
									if (part.type === "text") {
										return (
											<MessageResponse key={`${message.id}-${index}`}>
												{part.text}
											</MessageResponse>
										);
									}

									return null;
								})}
							</MessageContent>
						</Message>
					))}

					{shouldShowMainChatThinking(status) ? (
						<Message from="assistant">
							<MessageContent>
								<p className="text-muted-foreground text-sm">Thinking...</p>
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
