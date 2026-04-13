import { describe, expect, it } from "bun:test";
import { resolveCompanyDetailRedirect } from "@/lib/routing/company-detail-redirect";

describe("resolveCompanyDetailRedirect", () => {
	it("redirects active companies from lead detail to client detail", () => {
		expect(
			resolveCompanyDetailRedirect({
				companyId: "company-1",
				accountStatus: "active",
				origin: "lead",
			}),
		).toBe("/clients/company-1");
	});

	it("redirects lead companies from client detail to lead detail", () => {
		expect(
			resolveCompanyDetailRedirect({
				companyId: "company-1",
				accountStatus: "lead",
				origin: "client",
			}),
		).toBe("/leads/company-1");
	});

	it("does not redirect when status matches page origin", () => {
		expect(
			resolveCompanyDetailRedirect({
				companyId: "company-1",
				accountStatus: "lead",
				origin: "lead",
			}),
		).toBeNull();

		expect(
			resolveCompanyDetailRedirect({
				companyId: "company-1",
				accountStatus: "active",
				origin: "client",
			}),
		).toBeNull();
	});
});
