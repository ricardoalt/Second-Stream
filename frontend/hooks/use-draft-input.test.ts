import { describe, expect, it } from "bun:test";
import { buildDraftStorageKey } from "@/hooks/use-draft-input";

describe("draft input storage key", () => {
	it("scopes drafts per thread to avoid cross-thread bleed", () => {
		const threadA = buildDraftStorageKey("thread-a");
		const threadB = buildDraftStorageKey("thread-b");

		expect(threadA).not.toBe(threadB);
		expect(threadA).toBe("draft-composer:thread-a");
		expect(threadB).toBe("draft-composer:thread-b");
	});
});
