import { describe, expect, it } from "bun:test";
import { getLocationsSectionMeta } from "./edit-client-modal.layout";

describe("getLocationsSectionMeta", () => {
	it("returns compact mode for long location lists", () => {
		expect(getLocationsSectionMeta(6)).toEqual({
			countLabel: "6 locations",
			emptyMessage: "No locations registered.",
			isCompact: true,
		});
	});

	it("returns non-compact mode for short lists", () => {
		expect(getLocationsSectionMeta(2)).toEqual({
			countLabel: "2 locations",
			emptyMessage: "No locations registered.",
			isCompact: false,
		});
	});

	it("handles singular and empty counts", () => {
		expect(getLocationsSectionMeta(1).countLabel).toBe("1 location");
		expect(getLocationsSectionMeta(0).countLabel).toBe("0 locations");
	});
});
