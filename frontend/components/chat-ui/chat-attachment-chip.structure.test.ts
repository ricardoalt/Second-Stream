import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("chat attachment chip persisted behavior", () => {
	it("disables direct media preview for persisted attachments", () => {
		const source = read("components/chat-ui/chat-attachment-chip.tsx");

		expect(source).toContain(
			"const isPersistedAttachment = attachmentId !== null",
		);
		expect(source).toContain(
			"<AttachmentPreview allowMediaPreview={!isPersistedAttachment} />",
		);
	});

	it("opens persisted attachments through authenticated blob flow", () => {
		const source = read("components/chat-ui/chat-attachment-chip.tsx");

		expect(source).toContain("downloadChatAttachment(attachmentId)");
		expect(source).toContain('window.open("", "_blank")');
		expect(source).not.toContain("href={url}");
	});
});
