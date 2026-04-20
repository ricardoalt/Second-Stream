"use client";

import { GitBranchIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useCallback, useState } from "react";
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
	MessageAction,
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

// Thread type for branching
interface Thread {
	id: string;
	title: string | null;
	resourceId: string;
	createdAt: string;
	updatedAt: string;
}

// Storage helpers
const getStoredMessages = (threadId: string): MyUIMessage[] => {
	if (typeof window === "undefined") return [];
	const stored = localStorage.getItem(`secondstream_chat_messages_${threadId}`);
	return stored ? JSON.parse(stored) : [];
};

const setStoredMessages = (threadId: string, messages: MyUIMessage[]) => {
	if (typeof window === "undefined") return;
	localStorage.setItem(
		`secondstream_chat_messages_${threadId}`,
		JSON.stringify(messages),
	);
};

const getStoredThreads = (): Thread[] => {
	if (typeof window === "undefined") return [];
	const stored = localStorage.getItem("secondstream_chat_threads");
	return stored ? JSON.parse(stored) : [];
};

const setStoredThreads = (threads: Thread[]) => {
	if (typeof window === "undefined") return;
	localStorage.setItem("secondstream_chat_threads", JSON.stringify(threads));
};

interface ChatInterfaceProps {
	initialMessages?: MyUIMessage[];
	threadId: string;
	onMessagesChange?: (messages: MyUIMessage[]) => void;
}

export function ChatInterface({
	initialMessages = [],
	threadId,
	onMessagesChange,
}: ChatInterfaceProps) {
	const router = useRouter();
	const [messages, setMessages] = useState<MyUIMessage[]>(() => {
		if (threadId === "new") return initialMessages;
		return getStoredMessages(threadId);
	});
	const [status, setStatus] = useState<"ready" | "streaming" | "submitted">(
		"ready",
	);
	const [error, setError] = useState<Error | null>(null);

	const isEmptyState = messages.length === 0;

	const clearError = useCallback(() => setError(null), []);

	const regenerate = useCallback(
		({ messageId }: { messageId: string }) => {
			// Find the assistant message to regenerate
			const messageIndex = messages.findIndex((m) => m.id === messageId);
			if (messageIndex === -1 || messages[messageIndex].role !== "assistant")
				return;

			// Remove this and all subsequent messages
			const previousMessages = messages.slice(0, messageIndex);
			setMessages(previousMessages);
			setStoredMessages(threadId, previousMessages);

			// Trigger new response (simulate by finding the previous user message)
			const lastUserMessage = previousMessages
				.slice()
				.reverse()
				.find((m) => m.role === "user");

			if (lastUserMessage) {
				// Simulate AI response
				setStatus("streaming");
				setTimeout(() => {
					const responses = [
						"I understand. Let me help you with that.",
						"That's an interesting question. Here's what I think...",
						"I can assist with that. Let me analyze the information.",
						"Thanks for sharing. Based on what you've told me...",
						"I'll help you explore this. Here are my thoughts...",
					];
					const randomResponse =
						responses[Math.floor(Math.random() * responses.length)];

					const aiMessage: MyUIMessage = {
						id: nanoid(),
						role: "assistant",
						content: randomResponse,
						parts: [{ type: "text", text: randomResponse }],
						createdAt: new Date().toISOString(),
					};

					const newMessages = [...previousMessages, aiMessage];
					setMessages(newMessages);
					setStoredMessages(threadId, newMessages);
					setStatus("ready");
					onMessagesChange?.(newMessages);
				}, 1500);
			}
		},
		[messages, threadId, onMessagesChange],
	);

	const handleBranch = useCallback(
		(upToMessageId: string) => {
			// Get source messages up to this point
			const messageIndex = messages.findIndex((m) => m.id === upToMessageId);
			if (messageIndex === -1) return;

			const branchedMessages = messages.slice(0, messageIndex + 1);

			// Create new thread
			const newThread: Thread = {
				id: nanoid(),
				title: `Branch from ${threadId.slice(0, 8)}...`,
				resourceId: "user-id",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			const threads = getStoredThreads();
			setStoredThreads([newThread, ...threads]);

			// Save branched messages
			setStoredMessages(newThread.id, branchedMessages);

			// Navigate to new thread
			router.push(`/chat/${newThread.id}`);
		},
		[messages, threadId, router],
	);

	const sendMessage = useCallback(
		async (message: PromptInputMessage) => {
			setStatus("submitted");

			// Create user message
			const userMessage: MyUIMessage = {
				id: nanoid(),
				role: "user",
				content: message.text,
				parts: [
					{ type: "text", text: message.text },
					...(message.files?.map((f) => ({
						type: "file" as const,
						filename: f.filename,
						mediaType: f.mediaType,
						url: f.url,
					})) || []),
				],
				createdAt: new Date().toISOString(),
			};

			const updatedMessages = [...messages, userMessage];
			setMessages(updatedMessages);
			setStoredMessages(threadId, updatedMessages);
			onMessagesChange?.(updatedMessages);

			// Simulate streaming response
			setStatus("streaming");

			const responses = [
				"I understand. Let me help you with that.",
				"That's an interesting question. Here's what I think...",
				"I can assist with that. Let me analyze the information.",
				"Thanks for sharing. Based on what you've told me...",
				"I'll help you explore this. Here are my thoughts...",
			];
			const randomResponse =
				responses[Math.floor(Math.random() * responses.length)];

			// Simulate delay
			await new Promise((resolve) => setTimeout(resolve, 1500));

			const aiMessage: MyUIMessage = {
				id: nanoid(),
				role: "assistant",
				content: randomResponse,
				parts: [{ type: "text", text: randomResponse }],
				createdAt: new Date().toISOString(),
			};

			const finalMessages = [...updatedMessages, aiMessage];
			setMessages(finalMessages);
			setStoredMessages(threadId, finalMessages);
			setStatus("ready");
			onMessagesChange?.(finalMessages);

			// Update thread title if first message
			if (messages.length === 0) {
				const threads = getStoredThreads();
				const updatedThreads = threads.map((t) =>
					t.id === threadId
						? {
								...t,
								title:
									message.text.slice(0, 50) +
									(message.text.length > 50 ? "..." : ""),
							}
						: t,
				);
				setStoredThreads(updatedThreads);

				// Notify other components
				window.dispatchEvent(
					new StorageEvent("storage", { key: "secondstream_chat_threads" }),
				);
			}
		},
		[messages, threadId, onMessagesChange],
	);

	const handleSubmitMessage = useCallback(
		async (message: PromptInputMessage): Promise<void> => {
			if (!canSubmitPromptMessage(message)) {
				return;
			}

			clearError();
			await sendMessage(message);
		},
		[clearError, sendMessage],
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
												{message.role === "assistant" && (
													<MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
														<CopyButton
															text={message.parts
																?.filter((p) => p.type === "text")
																.map((p) => p.text)
																.join("\n")}
														/>
														<MessageAction
															tooltip="Branch from here"
															onClick={() => {
																handleBranch(message.id);
															}}
														>
															<GitBranchIcon className="size-3" />
														</MessageAction>
														<MessageAction
															tooltip="Regenerate"
															onClick={() => {
																regenerate({ messageId: message.id });
															}}
														>
															<RefreshCcwIcon className="size-3" />
														</MessageAction>
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
