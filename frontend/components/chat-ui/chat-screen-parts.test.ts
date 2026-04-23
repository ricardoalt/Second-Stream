import { describe, expect, it } from "bun:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

import {
	type ClassifiedPart,
	classifyMessagePart,
} from "@/components/chat-ui/chat-screen";

describe("classifyMessagePart", () => {
	it("classifies text parts", () => {
		const result = classifyMessagePart({ type: "text", text: "Hello" });
		expect(result).toEqual({
			kind: "text",
			text: "Hello",
		});
	});

	it("classifies file parts as attachment context", () => {
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
			expect(result.part.url).toBe("https://example.com/photo.png");
		}
	});

	it("classifies reasoning parts with streaming state", () => {
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

	it("classifies reasoning parts with completed state", () => {
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

	it("classifies source-document parts", () => {
		const result = classifyMessagePart({
			type: "source-document",
			url: "https://example.com",
			title: "Example",
			content: "Details here",
		});
		expect(result.kind).toBe("source");
	});

	it("classifies tool-invocation parts", () => {
		const result = classifyMessagePart({
			type: "tool-invocation",
			toolCallId: "call-1",
			toolName: "webSearch",
			state: "call",
			args: { query: "test" },
		});
		expect(result.kind).toBe("tool-invocation");
	});

	it("returns unknown for unrecognized part types", () => {
		const result = classifyMessagePart({
			type: "custom-unknown-type",
			// Using unknown type to test fallback
		} as never);
		expect(result).toEqual({ kind: "unknown" });
	});
});
