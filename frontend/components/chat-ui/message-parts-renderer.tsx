"use client";

import { memo } from "react";
import {
	Message,
	MessageActions,
	MessageContent,
	MessageResponse,
	MessageToolbar,
} from "@/components/ai-elements/message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import type { MyUIMessage } from "@/types/ui-message";
import { WorkingMemoryUpdate } from "./ai-elements/working-memory-update";
import { ChatAttachmentChip } from "./chat-attachment-chip";
import { CopyButton } from "./copy-button";
import {
	PDF_DOC_CONFIGS,
	PdfDocumentCard,
	type PdfToolKey,
} from "./pdf-document-card";
import { RegenerateButton } from "./regenerate-button";

function renderWebSearchPart(part: MyUIMessage["parts"][number]) {
	if (part.type !== "tool-webSearch") return null;

	if (part.state === "output-error") {
		return <span className="text-destructive text-xs">Web search failed</span>;
	}

	if (part.state === "output-available") {
		if (!part.output?.length) {
			return (
				<span className="text-muted-foreground text-xs">
					No web results found
				</span>
			);
		}

		return (
			<div className="not-prose flex flex-col gap-2">
				{part.output.map((result, index) => (
					<a
						className="block rounded-md border bg-card px-3 py-2 text-xs transition-colors hover:bg-accent"
						href={result.url}
						key={`${result.url}-${index}`}
						rel="noreferrer"
						target="_blank"
					>
						<p className="font-medium">{result.title || result.url}</p>
						<p className="mt-1 line-clamp-2 text-muted-foreground">
							{result.content}
						</p>
					</a>
				))}
			</div>
		);
	}

	return (
		<Shimmer as="p" className="text-xs">
			Searching the web...
		</Shimmer>
	);
}

function renderPdfToolPart(
	part: Extract<
		MyUIMessage["parts"][number],
		{
			type:
				| "tool-generateIdeationBrief"
				| "tool-generateAnalyticalRead"
				| "tool-generatePlaybook";
		}
	>,
) {
	const toolKey = part.type.replace("tool-", "") as PdfToolKey;
	const config = PDF_DOC_CONFIGS[toolKey];

	if (part.state === "output-available") {
		return (
			<PdfDocumentCard
				Icon={config.Icon}
				label={config.label}
				shimmerText={config.shimmerText}
				state={part.state}
				output={part.output}
			/>
		);
	}

	return (
		<Tool
			className="max-w-sm border-border/70 bg-card/60 shadow-none"
			defaultOpen={part.state !== "input-streaming"}
		>
			<ToolHeader title={config.label} type={part.type} state={part.state} />
			<ToolContent className="pt-0">
				<PdfDocumentCard
					Icon={config.Icon}
					label={config.label}
					shimmerText={config.shimmerText}
					state={part.state}
				/>
			</ToolContent>
		</Tool>
	);
}

type MessagePartsRendererProps = {
	message: MyUIMessage;
	isLastMessage: boolean;
	isStreamingOrSubmitted: boolean;
	messages: MyUIMessage[];
	setMessages: (messages: MyUIMessage[]) => void;
	regenerate: () => void;
};

function MessagePartsRendererInner({
	message,
	isLastMessage,
	isStreamingOrSubmitted,
	messages,
	setMessages,
	regenerate,
}: MessagePartsRendererProps) {
	return (
		<Message from={message.role}>
			<MessageContent>
				{message.parts.map((part, partIndex) => {
					const webSearchNode = renderWebSearchPart(part);
					if (webSearchNode) {
						return (
							<div key={`${message.id}-${partIndex}`}>{webSearchNode}</div>
						);
					}

					switch (part.type) {
						case "file": {
							const compactAttachment =
								(message.role === "user" && isStreamingOrSubmitted) ||
								part.url.startsWith("data:");
							return (
								<ChatAttachmentChip
									key={`${message.id}-${partIndex}`}
									filename={part.filename}
									mediaType={part.mediaType}
									url={part.url}
									compact={compactAttachment}
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
									<ReasoningContent>{part.text}</ReasoningContent>
								</Reasoning>
							);
						case "text":
							return (
								<MessageResponse key={`${message.id}-${partIndex}`}>
									{part.text}
								</MessageResponse>
							);
						case "tool-generateIdeationBrief":
						case "tool-generateAnalyticalRead":
						case "tool-generatePlaybook":
							return (
								<div key={`${message.id}-${partIndex}`}>
									{renderPdfToolPart(part)}
								</div>
							);
						case "tool-updateWorkingMemory":
							return (
								<WorkingMemoryUpdate
									key={`${message.id}-${partIndex}`}
									input={part.input}
									state={part.state}
								/>
							);
						default:
							return null;
					}
				})}
			</MessageContent>
			{message.role === "assistant" ? (
				<MessageToolbar className="mt-1">
					<MessageActions>
						{message.parts.some((part) => part.type === "text") ? (
							<CopyButton
								text={message.parts
									.filter((part) => part.type === "text")
									.map((part) => part.text)
									.join("\n")}
							/>
						) : null}
						{isLastMessage && !isStreamingOrSubmitted ? (
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
	);
}

// Memoized: re-renders only when the last part changes (streaming) or the
// message gains/loses last-message status (toolbar changes).
// Last message is NEVER skipped — its text part streams on every token.
export const MessagePartsRenderer = memo(
	MessagePartsRendererInner,
	(prev, next) =>
		!next.isLastMessage &&
		prev.message.id === next.message.id &&
		prev.message.parts.length === next.message.parts.length &&
		prev.isLastMessage === next.isLastMessage &&
		prev.isStreamingOrSubmitted === next.isStreamingOrSubmitted,
);
