import type { UIMessage } from "ai";
import type { MyUIMessage } from "@/types/ui-message";

// ---------------------------------------------------------------------------
// ClassifiedPart — discriminated union for message part rendering
// ---------------------------------------------------------------------------

export type ClassifiedPart =
	| { kind: "text"; text: string }
	| { kind: "file"; part: UIMessage["parts"][number] & { type: "file" } }
	| { kind: "reasoning"; text: string; isStreaming: boolean }
	| {
			kind: "source";
			part: UIMessage["parts"][number] & {
				type: "source-document";
				sourceId?: string;
				url?: string;
				mediaType?: string;
				title?: string;
				filename?: string;
				providerMetadata?: unknown;
				state?: string;
				output?: unknown;
			};
	  }
	| {
			kind: "tool-invocation";
			part: UIMessage["parts"][number] & {
				type: string;
				toolCallId: string;
				toolName?: string;
				state: string;
				input?: unknown;
				output?: unknown;
				errorText?: string;
			};
	  }
	| { kind: "unknown" };

// ---------------------------------------------------------------------------
// extractToolName
// ---------------------------------------------------------------------------

/**
 * Extracts the tool name from a tool-invocation part.
 *
 * In AI SDK v6, tool-invocation parts have a `toolName` property
 * or the tool name embedded in the `type` field prefix.
 */
export function extractToolName(
	part: UIMessage["parts"][number] & { toolName?: string; type?: string },
): string {
	if ("toolName" in part && typeof part.toolName === "string") {
		return part.toolName;
	}
	const partType = part.type ?? "";
	if (partType.startsWith("tool-")) {
		return partType.slice(5);
	}
	return "";
}

// ---------------------------------------------------------------------------
// classifyMessagePart
// ---------------------------------------------------------------------------

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
				part: part as ClassifiedPart & { kind: "source" } extends {
					part: infer P;
				}
					? P
					: never,
			};
		default:
			if (part.type.startsWith("tool-") || part.type === "tool-invocation") {
				return {
					kind: "tool-invocation",
					part: part as ClassifiedPart & { kind: "tool-invocation" } extends {
						part: infer P;
					}
						? P
						: never,
				};
			}
			return { kind: "unknown" };
	}
}

// ---------------------------------------------------------------------------
// canSubmitPromptMessage
// ---------------------------------------------------------------------------

/**
 * Determines whether a prompt input message can be submitted.
 * A message is submittable if it has non-empty text OR at least one file attachment.
 */
export function canSubmitPromptMessage(message: {
	text: string;
	files?: unknown[];
}): boolean {
	const trimmed = message.text.trim();
	if (trimmed.length > 0) {
		return true;
	}
	// Files without text are valid (e.g., image upload only)
	if (message.files && message.files.length > 0) {
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
	status: string,
	messages: MyUIMessage[],
): boolean {
	if (status === "submitted") return true;

	if (status === "streaming") {
		const lastAssistant = findLast(
			messages,
			(m: MyUIMessage) => m.role === "assistant",
		);
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
		if (predicate(arr[i]!)) return arr[i];
	}
	return undefined;
}
