import { describe, expect, it } from "bun:test";
import type { UIMessage } from "ai";

async function loadChatUtils() {
	return import("@/lib/chat-runtime/chat-utils");
}

describe("chat-utils pure functions", () => {
	describe("canSubmitPromptMessage", () => {
		it("returns true for a message with non-empty text", async () => {
			const { canSubmitPromptMessage } = await loadChatUtils();
			expect(canSubmitPromptMessage({ text: "Hello" })).toBe(true);
		});

		it("returns false for a message with only whitespace", async () => {
			const { canSubmitPromptMessage } = await loadChatUtils();
			expect(canSubmitPromptMessage({ text: "   " })).toBe(false);
		});

		it("returns false for an empty text message without files", async () => {
			const { canSubmitPromptMessage } = await loadChatUtils();
			expect(canSubmitPromptMessage({ text: "" })).toBe(false);
		});

		it("returns true for a message with no text but has files", async () => {
			const { canSubmitPromptMessage } = await loadChatUtils();
			expect(
				canSubmitPromptMessage({
					text: "",
					files: [
						{
							type: "file",
							filename: "doc.pdf",
							mediaType: "application/pdf",
							url: "data:application/pdf;base64,AA==",
						},
					],
				}),
			).toBe(true);
		});

		it("returns false for empty text and empty files", async () => {
			const { canSubmitPromptMessage } = await loadChatUtils();
			expect(canSubmitPromptMessage({ text: "", files: [] })).toBe(false);
		});
	});

	describe("shouldShowLoadingShimmer", () => {
		it("shows shimmer when status is submitted", async () => {
			const { shouldShowLoadingShimmer } = await loadChatUtils();
			expect(shouldShowLoadingShimmer("submitted", [])).toBe(true);
		});

		it("shows shimmer when streaming with no assistant message", async () => {
			const { shouldShowLoadingShimmer } = await loadChatUtils();
			expect(shouldShowLoadingShimmer("streaming", [])).toBe(true);
		});

		it("shows shimmer when streaming and last assistant has no content", async () => {
			const { shouldShowLoadingShimmer } = await loadChatUtils();
			const messages = [
				{
					id: "1",
					role: "user" as const,
					parts: [{ type: "text" as const, text: "hello" }],
				},
				{
					id: "2",
					role: "assistant" as const,
					parts: [{ type: "text" as const, text: "" }],
				},
			];
			expect(shouldShowLoadingShimmer("streaming", messages)).toBe(true);
		});

		it("hides shimmer when streaming and last assistant has content", async () => {
			const { shouldShowLoadingShimmer } = await loadChatUtils();
			const messages = [
				{
					id: "1",
					role: "user" as const,
					parts: [{ type: "text" as const, text: "hello" }],
				},
				{
					id: "2",
					role: "assistant" as const,
					parts: [{ type: "text" as const, text: "response" }],
				},
			];
			expect(shouldShowLoadingShimmer("streaming", messages)).toBe(false);
		});

		it("hides shimmer when status is ready", async () => {
			const { shouldShowLoadingShimmer } = await loadChatUtils();
			expect(shouldShowLoadingShimmer("ready", [])).toBe(false);
		});

		it("hides shimmer when status is error", async () => {
			const { shouldShowLoadingShimmer } = await loadChatUtils();
			expect(shouldShowLoadingShimmer("error", [])).toBe(false);
		});

		it("shows shimmer when streaming and last message is assistant with only reasoning content", async () => {
			const { shouldShowLoadingShimmer } = await loadChatUtils();
			const messages = [
				{
					id: "1",
					role: "user" as const,
					parts: [{ type: "text" as const, text: "hello" }],
				},
				{
					id: "2",
					role: "assistant" as const,
					parts: [
						{
							type: "reasoning" as const,
							text: "thinking...",
							state: "streaming" as const,
						},
					],
				},
			];
			expect(shouldShowLoadingShimmer("streaming", messages)).toBe(false);
		});
	});

	describe("extractToolName", () => {
		it("returns toolName when present on the part", async () => {
			const { extractToolName } = await loadChatUtils();
			const part = {
				type: "tool-invocation",
				toolCallId: "call-1",
				toolName: "webSearch",
				state: "call",
			};
			expect(extractToolName(part)).toBe("webSearch");
		});

		it("extracts tool name from tool- prefixed type when toolName is absent", async () => {
			const { extractToolName } = await loadChatUtils();
			const part = {
				type: "tool-webSearch",
				toolCallId: "call-2",
				state: "call",
			};
			expect(extractToolName(part)).toBe("webSearch");
		});

		it("returns empty string for type without tool- prefix and no toolName", async () => {
			const { extractToolName } = await loadChatUtils();
			const part = {
				type: "text",
				text: "hello",
			};
			expect(extractToolName(part)).toBe("");
		});

		it("prefers explicit toolName over type prefix", async () => {
			const { extractToolName } = await loadChatUtils();
			const part = {
				type: "tool-other",
				toolCallId: "call-3",
				toolName: "explicitName",
				state: "call",
			};
			expect(extractToolName(part)).toBe("explicitName");
		});
	});

	describe("classifyMessagePart", () => {
		it("classifies text parts", async () => {
			const { classifyMessagePart } = await loadChatUtils();
			const result = classifyMessagePart({ type: "text", text: "Hello" });
			expect(result).toEqual({ kind: "text", text: "Hello" });
		});

		it("classifies file parts", async () => {
			const { classifyMessagePart } = await loadChatUtils();
			const result = classifyMessagePart({
				type: "file",
				filename: "photo.png",
				mediaType: "image/png",
				url: "https://example.com/photo.png",
			});
			expect(result.kind).toBe("file");
			if (result.kind === "file") {
				expect(result.part.filename).toBe("photo.png");
				expect(result.part.mediaType).toBe("image/png");
			}
		});

		it("classifies reasoning parts with streaming state", async () => {
			const { classifyMessagePart } = await loadChatUtils();
			const result = classifyMessagePart({
				type: "reasoning",
				text: "Let me think...",
				state: "streaming",
			});
			expect(result).toEqual({
				kind: "reasoning",
				text: "Let me think...",
				isStreaming: true,
			});
		});

		it("classifies reasoning parts with completed state", async () => {
			const { classifyMessagePart } = await loadChatUtils();
			const result = classifyMessagePart({
				type: "reasoning",
				text: "I considered several options.",
				state: "complete",
			});
			expect(result).toEqual({
				kind: "reasoning",
				text: "I considered several options.",
				isStreaming: false,
			});
		});

		it("classifies source-document parts", async () => {
			const { classifyMessagePart } = await loadChatUtils();
			const result = classifyMessagePart({
				type: "source-document",
				url: "https://example.com",
				title: "Example",
				content: "Details here",
			});
			expect(result.kind).toBe("source");
		});

		it("classifies tool-invocation parts", async () => {
			const { classifyMessagePart } = await loadChatUtils();
			const result = classifyMessagePart({
				type: "tool-invocation",
				toolCallId: "call-1",
				toolName: "webSearch",
				state: "call",
			});
			expect(result.kind).toBe("tool-invocation");
		});

		it("classifies tool- prefixed type parts as tool-invocation", async () => {
			const { classifyMessagePart } = await loadChatUtils();
			const result = classifyMessagePart({
				type: "tool-webSearch",
				toolCallId: "call-2",
				state: "call",
			});
			expect(result.kind).toBe("tool-invocation");
		});

		it("returns unknown for unrecognized part types", async () => {
			const { classifyMessagePart } = await loadChatUtils();
			const result = classifyMessagePart({
				type: "custom-unknown-type",
			} as never);
			expect(result).toEqual({ kind: "unknown" });
		});
	});
});
