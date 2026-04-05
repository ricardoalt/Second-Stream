import { describe, expect, it } from "bun:test";
import { OFFER_STAGE_LABELS } from "@/components/features/offers/mock-data";

describe("offer stage labels", () => {
	it("uses Offer started for the initial requires_data stage", () => {
		expect(OFFER_STAGE_LABELS.requires_data).toBe("Offer started");
	});
});
