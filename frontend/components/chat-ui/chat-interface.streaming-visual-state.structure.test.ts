import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("chat-interface estados visuales controlados por AI SDK", () => {
	it("calcula empty state y shimmer desde status/messages", () => {
		const source = read("components/chat-ui/chat-interface.tsx");

		expect(source).toContain(
			'const isEmptyState = messages.length === 0 && status === "ready"',
		);
		expect(source).toContain(
			"const showShimmer = shouldShowLoadingShimmer(status, messages)",
		);
		expect(source).toContain(
			"const isComposerBusy = isSubmittingMessage || isStreamingOrSubmitted",
		);
	});
});
