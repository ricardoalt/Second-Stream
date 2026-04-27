import { describe, expect, it } from "bun:test";
import { buildChatThreadUrl, syncChatThreadUrlSilently } from "./routing";

describe("chat runtime routing", () => {
	it("builds canonical path url for a thread", () => {
		expect(buildChatThreadUrl("thread-42")).toBe("/chat/thread-42");
	});

	it("builds url for a new thread id", () => {
		expect(buildChatThreadUrl("abc-123")).toBe("/chat/abc-123");
	});

	it("encodes special characters in thread id", () => {
		expect(buildChatThreadUrl("thread with spaces")).toBe(
			"/chat/thread%20with%20spaces",
		);
	});

	it("trims whitespace from thread id", () => {
		expect(buildChatThreadUrl("  thread-1  ")).toBe("/chat/thread-1");
	});

	it("does nothing when window is unavailable", () => {
		expect(() => syncChatThreadUrlSilently("thread-1")).not.toThrow();
	});
});
