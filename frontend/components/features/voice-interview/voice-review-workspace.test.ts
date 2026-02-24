import { describe, expect, it } from "bun:test";
import { shouldDisableFinalizeAction } from "./voice-review-guards";

describe("shouldDisableFinalizeAction", () => {
	it("disables when groups exist and none selected", () => {
		expect(
			shouldDisableFinalizeAction({
				groupsCount: 2,
				selectedResolvedCount: 0,
				finalizing: false,
			}),
		).toBe(true);
	});

	it("allows empty extraction path when groups are zero", () => {
		expect(
			shouldDisableFinalizeAction({
				groupsCount: 0,
				selectedResolvedCount: 0,
				finalizing: false,
			}),
		).toBe(false);
	});
});
