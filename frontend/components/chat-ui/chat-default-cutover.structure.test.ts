import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("chat baseline simplificado", () => {
	it("usa ChatInterface baseline con useChat + onData + onFinish", () => {
		const source = read("components/chat-ui/chat-interface.tsx");

		expect(source).toContain("useChat<MyUIMessage>");
		expect(source).toContain("id: threadId");
		expect(source).toContain("transport");
		expect(source).toContain("onData");
		expect(source).toContain("onFinish");
		expect(source).toContain("DATA_NEW_THREAD_CREATED_PART");
		expect(source).toContain("DATA_CONVERSATION_TITLE_PART");
	});

	it("el route boundary hace sincronización de URL sólo tras evento confirmado", () => {
		const source = read("app/chat/chat-page-client.tsx");

		expect(source).toContain("shouldSyncRouteAfterThreadCreated");
		expect(source).toContain("syncChatThreadUrlSilently(createdThreadId)");
		expect(source).not.toContain("router.replace(");
		expect(source).not.toContain("first-turn-routing");
	});

	it("elimina wrappers viejos de runtime/presentación", () => {
		expect(existsSync(join(ROOT, "components/chat-ui/message-parts.tsx"))).toBe(
			false,
		);
		expect(
			existsSync(join(ROOT, "lib/chat-runtime/first-turn-routing.ts")),
		).toBe(false);
		expect(
			existsSync(join(ROOT, "lib/chat-runtime/thread-screen-state.ts")),
		).toBe(false);

		const chatInterface = read("components/chat-ui/chat-interface.tsx");
		expect(chatInterface).not.toContain("thread-screen-state");
		expect(chatInterface).not.toContain("first-turn-routing");
	});
});
