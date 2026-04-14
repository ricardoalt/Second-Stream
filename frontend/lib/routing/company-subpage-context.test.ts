import { describe, expect, it } from "bun:test";
import {
	getCompanySubpageBreadcrumbs,
	getCompanySubpageRoute,
} from "@/lib/routing/company-subpage-context";

describe("company subpage context", () => {
	it("builds lead-scoped routes for shared subpages", () => {
		expect(getCompanySubpageRoute("lead", "company-42", "contacts")).toBe(
			"/leads/company-42/contacts",
		);
		expect(getCompanySubpageRoute("lead", "company-42", "locations")).toBe(
			"/leads/company-42/locations",
		);
	});

	it("builds client-scoped breadcrumbs with fallback company label", () => {
		expect(
			getCompanySubpageBreadcrumbs({
				lifecycle: "client",
				companyId: "company-99",
				section: "locations",
			}),
		).toEqual([
			{ label: "Clients", href: "/clients" },
			{ label: "Client", href: "/clients/company-99" },
			{ label: "Locations" },
		]);
	});

	it("builds lead-scoped breadcrumbs with explicit company name", () => {
		expect(
			getCompanySubpageBreadcrumbs({
				lifecycle: "lead",
				companyId: "company-11",
				companyName: "Acme Recycling",
				section: "contacts",
			}),
		).toEqual([
			{ label: "Leads", href: "/leads" },
			{ label: "Acme Recycling", href: "/leads/company-11" },
			{ label: "Contacts" },
		]);
	});
});
