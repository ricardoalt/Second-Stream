import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("chat-shell new chat reset", () => {
	it("usa chatInstanceKey para forzar remount en New Chat", () => {
		const source = read("app/chat/chat-shell.tsx");

		expect(source).toContain(
			"const [chatInstanceKey, setChatInstanceKey] = useState(0)",
		);
		expect(source).toContain(
			"setChatInstanceKey((currentKey) => currentKey + 1)",
		);
		expect(source).toContain("key={chatInstanceKey}");
	});
});
