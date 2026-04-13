import { describe, expect, it } from "bun:test";
import { buildClientCreateHandoffUrl } from "@/lib/add-client-flow";

describe("add-client lead handoff", () => {
	it("routes all create outcomes to lead detail", () => {
		expect(buildClientCreateHandoffUrl("company-1", "success")).toBe(
			"/leads/company-1?create=success",
		);
		expect(buildClientCreateHandoffUrl("company-1", "partial-contact")).toBe(
			"/leads/company-1?create=partial-contact",
		);
		expect(buildClientCreateHandoffUrl("company-1", "partial-location")).toBe(
			"/leads/company-1?create=partial-location",
		);
	});
});
