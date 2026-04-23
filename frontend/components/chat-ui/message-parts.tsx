"use client";

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
import type { WorkingMemory } from "@/config/working-memory";
import {
	type ClassifiedPart,
	classifyMessagePart,
	extractToolName,
} from "@/lib/chat-runtime/chat-utils";
import type { MyUIMessage } from "@/types/ui-message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "./ai-elements/reasoning";
import { Shimmer } from "./ai-elements/shimmer";
import { Source, SourceContent, SourceTrigger } from "./ai-elements/sources";
import { WorkingMemoryUpdate } from "./ai-elements/working-memory-update";

// ---------------------------------------------------------------------------
// MessageParts — renders the classified parts of a single chat message
// ---------------------------------------------------------------------------

interface MessagePartsProps {
	message: MyUIMessage;
}

export function MessageParts({ message }: MessagePartsProps) {
	return (
		<Message from={message.role}>
			<MessageContent>
				{message.parts.map((part, index) => (
					<PartRenderer
						key={`${message.id}-${index}`}
						classified={classifyMessagePart(part)}
						messageId={message.id}
						index={index}
					/>
				))}
			</MessageContent>
		</Message>
	);
}

// ---------------------------------------------------------------------------
// Shimmer assistant placeholder
// ---------------------------------------------------------------------------

function ShimmerMessage() {
	return (
		<Message from="assistant">
			<MessageContent>
				<Shimmer as="p" className="text-sm">
					Thinking...
				</Shimmer>
			</MessageContent>
		</Message>
	);
}

MessageParts.Shimmer = ShimmerMessage;

// ---------------------------------------------------------------------------
// PartRenderer — renders a single classified message part
// ---------------------------------------------------------------------------

interface PartRendererProps {
	classified: ClassifiedPart;
	messageId: string;
	index: number;
}

function PartRenderer({ classified, messageId, index }: PartRendererProps) {
	switch (classified.kind) {
		case "file":
			return (
				<Attachments
					className="w-full"
					key={`${messageId}-attachment-${index}`}
					variant="list"
				>
					<Attachment
						data={{
							...classified.part,
							id: `${messageId}-attachment-${index}`,
						}}
					>
						<AttachmentPreview />
						<AttachmentInfo showMediaType />
					</Attachment>
				</Attachments>
			);
		case "text":
			return (
				<MessageResponse key={`${messageId}-${index}`}>
					{classified.text}
				</MessageResponse>
			);
		case "reasoning":
			return (
				<Reasoning
					key={`${messageId}-${index}`}
					isStreaming={classified.isStreaming}
				>
					<ReasoningTrigger />
					<ReasoningContent>{classified.text}</ReasoningContent>
				</Reasoning>
			);
		case "source":
			return renderSourcePart(classified.part, messageId, index);
		case "tool-invocation":
			return renderToolInvocationPart(classified.part, messageId, index);
		default:
			return null;
	}
}

// ---------------------------------------------------------------------------
// Source rendering
// ---------------------------------------------------------------------------

function renderSourcePart(
	sp: ClassifiedPart & { kind: "source" } extends { part: infer P } ? P : never,
	messageId: string,
	index: number,
) {
	if (sp.url)
		return (
			<div
				className="not-prose mb-4 flex flex-wrap gap-2"
				key={`${messageId}-${index}`}
			>
				<Source href={sp.url}>
					<SourceTrigger showFavicon label={1} />
					<SourceContent title={sp.title ?? sp.url} description="" />
				</Source>
			</div>
		);
	if (sp.state && sp.state !== "output-available")
		return (
			<div className="flex items-center gap-1.5" key={`${messageId}-${index}`}>
				<Shimmer as="p" className="text-sm">
					Looking up sources...
				</Shimmer>
			</div>
		);
	const entries = Array.isArray(sp.output) ? sp.output : [];
	if (entries.length > 0)
		return (
			<div
				className="not-prose mb-4 flex flex-wrap gap-2"
				key={`${messageId}-${index}`}
			>
				{entries.map(
					(
						s: { url: string; title?: string | null; content?: string },
						si: number,
					) => (
						<Source key={s.url} href={s.url}>
							<SourceTrigger showFavicon label={si + 1} />
							<SourceContent
								title={s.title ?? s.url}
								description={s.content ?? ""}
							/>
						</Source>
					),
				)}
			</div>
		);
	return null;
}

// ---------------------------------------------------------------------------
// Tool invocation rendering
// ---------------------------------------------------------------------------

function renderToolInvocationPart(
	tp: ClassifiedPart & { kind: "tool-invocation" } extends { part: infer P }
		? P
		: never,
	messageId: string,
	index: number,
) {
	const tn = extractToolName(tp);
	if (tn === "webSearch") {
		if (tp.state === "output-available") {
			const results = Array.isArray(tp.output) ? tp.output : [];
			return (
				<div
					className="not-prose mb-4 flex flex-wrap gap-2"
					key={`${messageId}-${index}`}
				>
					{results.map(
						(
							s: { url: string; title?: string | null; content?: string },
							si: number,
						) => (
							<Source key={s.url} href={s.url}>
								<SourceTrigger showFavicon label={si + 1} />
								<SourceContent
									title={s.title ?? s.url}
									description={s.content ?? ""}
								/>
							</Source>
						),
					)}
				</div>
			);
		}
		return (
			<div className="flex items-center gap-1.5" key={`${messageId}-${index}`}>
				<Shimmer as="p" className="text-sm">
					{tp.state === "input-available" &&
					tp.input &&
					typeof tp.input === "object" &&
					"query" in tp.input
						? `Searching for: ${(tp.input as { query: string }).query}`
						: "Searching..."}
				</Shimmer>
			</div>
		);
	}
	if (tn === "updateWorkingMemory") {
		return (
			<WorkingMemoryUpdate
				key={`${messageId}-${index}`}
				state={tp.state}
				{...(tp.state !== "input-streaming" && tp.input
					? {
							input: tp.input as { memory: WorkingMemory },
						}
					: {})}
			/>
		);
	}
	return null;
}
