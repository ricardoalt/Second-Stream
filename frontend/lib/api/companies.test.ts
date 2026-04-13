import { describe, expect, it } from "bun:test";

function buildCompaniesListUrl(
	archived?: "active" | "archived" | "all",
	accountStatus?: "all" | "lead" | "active",
): string {
	const params = new URLSearchParams();
	if (archived) {
		params.set("archived", archived);
	}
	if (accountStatus) {
		params.set("account_status", accountStatus);
	}
	const query = params.toString();
	return query.length > 0 ? `/companies?${query}` : "/companies";
}

describe("companies api query contract", () => {
	it("builds url with explicit account_status filter", () => {
		expect(buildCompaniesListUrl("active", "lead")).toBe(
			"/companies?archived=active&account_status=lead",
		);
	});

	it("omits query params when no filters provided", () => {
		expect(buildCompaniesListUrl()).toBe("/companies");
	});
});
