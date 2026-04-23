import { describe, expect, it } from "bun:test";
import { buildChatThreadUrl } from "./routing";

describe("chat runtime routing", () => {
	it("builds canonical query url for a thread", () => {
		expect(buildChatThreadUrl("thread-42")).toBe("/chat?threadId=thread-42");
	});

	it("builds url for a new thread id", () => {
		expect(buildChatThreadUrl("abc-123")).toBe("/chat?threadId=abc-123");
	});

	it("encodes special characters in thread id", () => {
		expect(buildChatThreadUrl("thread with spaces")).toBe(
			"/chat?threadId=thread%20with%20spaces",
		);
	});

	it("trims whitespace from thread id", () => {
		expect(buildChatThreadUrl("  thread-1  ")).toBe("/chat?threadId=thread-1");
	});
});
