import { describe, expect, it } from "bun:test";
import { buildChatThreadUrl, resolveChatRouteState } from "./routing";

describe("chat runtime routing", () => {
	it("resolves existing thread route state from query value", () => {
		expect(resolveChatRouteState("thread-123")).toEqual({
			mode: "existing",
			threadId: "thread-123",
		});
	});

	it("resolves explicit new thread route state", () => {
		expect(resolveChatRouteState("new")).toEqual({
			mode: "new",
			threadId: "new",
		});
	});

	it("resolves unavailable state for blank thread ids", () => {
		expect(resolveChatRouteState("   ")).toEqual({
			mode: "unavailable",
			threadId: "",
		});
	});

	it("builds canonical query url for a thread", () => {
		expect(buildChatThreadUrl("thread-42")).toBe("/chat?threadId=thread-42");
		expect(buildChatThreadUrl("new")).toBe("/chat?threadId=new");
	});
});
