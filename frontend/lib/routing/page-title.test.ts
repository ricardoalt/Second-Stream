import { describe, expect, it } from "bun:test";
import { getTopBarTitle } from "@/lib/routing/page-title";

describe("getTopBarTitle", () => {
	it("returns lead-scoped titles for lead subpages", () => {
		expect(getTopBarTitle("/leads/company-7/contacts")).toBe("Lead Contacts");
		expect(getTopBarTitle("/leads/company-7/locations")).toBe("Lead Locations");
	});

	it("returns client-scoped titles for client subpages", () => {
		expect(getTopBarTitle("/clients/company-7/contacts")).toBe(
			"Company Contacts",
		);
		expect(getTopBarTitle("/clients/company-7/locations")).toBe(
			"Company Locations",
		);
	});

	it("keeps profile fallbacks for detail routes", () => {
		expect(getTopBarTitle("/leads/company-7")).toBe("Lead Profile");
		expect(getTopBarTitle("/clients/company-7")).toBe("Client Profile");
	});
});
