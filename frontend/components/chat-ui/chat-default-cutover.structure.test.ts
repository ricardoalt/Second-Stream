import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("chat default cutover structure", () => {
	it("uses official ai-elements imports in main chat path", () => {
		const chatScreenSource = read("frontend/components/chat-ui/chat-screen.tsx");
		const composerSource = read(
			"frontend/components/chat-ui/chat-prompt-composer.tsx",
		);

		expect(chatScreenSource).toContain("@/components/ai-elements/");
		expect(composerSource).toContain("@/components/ai-elements/prompt-input");
		expect(chatScreenSource).toContain("ConversationEmptyState");
		expect(chatScreenSource).toContain("<Attachments");
		expect(chatScreenSource).toContain("variant=\"list\"");
		expect(chatScreenSource).not.toContain("./ai-elements/");
		expect(composerSource).not.toContain("./ai-elements/");
		expect(chatScreenSource).not.toContain("Start a new chat by sending your first message");
	});

	it("removes temporary bridge route from primary path", () => {
		expect(existsSync(join(ROOT, "frontend/app/chat/bridge/page.tsx"))).toBe(
			false,
		);
		expect(
			existsSync(
				join(ROOT, "frontend/components/chat-ui/chat-bridge-screen.tsx"),
			),
		).toBe(false);
	});
});
