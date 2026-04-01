import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSidebarNavItems } from "@/lib/routing/sidebar-nav";
import {
	getAdminRedirectPath,
	getPostAuthLandingPath,
} from "@/lib/routing/workspace-guards";

const adminPageSource = readFileSync(
	join(process.cwd(), "app", "admin", "page.tsx"),
	"utf8",
);
const adminTeamPageSource = readFileSync(
	join(process.cwd(), "app", "admin", "team", "page.tsx"),
	"utf8",
);
const adminStreamsPageSource = readFileSync(
	join(process.cwd(), "app", "admin", "streams", "page.tsx"),
	"utf8",
);
const adminClientsPageSource = readFileSync(
	join(process.cwd(), "app", "admin", "clients", "page.tsx"),
	"utf8",
);
const adminOffersPageSource = readFileSync(
	join(process.cwd(), "app", "admin", "offers", "page.tsx"),
	"utf8",
);

const orgAdminPageSource = readFileSync(
	join(process.cwd(), "app", "org-admin", "page.tsx"),
	"utf8",
);

const orgAdminTeamPageSource = readFileSync(
	join(process.cwd(), "app", "org-admin", "team", "page.tsx"),
	"utf8",
);

const orgAdminStreamsPageSource = readFileSync(
	join(process.cwd(), "app", "org-admin", "streams", "page.tsx"),
	"utf8",
);

const orgAdminClientsPageSource = readFileSync(
	join(process.cwd(), "app", "org-admin", "clients", "page.tsx"),
	"utf8",
);

const orgAdminOffersPageSource = readFileSync(
	join(process.cwd(), "app", "org-admin", "offers", "page.tsx"),
	"utf8",
);

const legacyWorkspaceRedirectMappings = [
	{
		filePath: ["app", "admin", "workspace", "page.tsx"],
		expectedRedirect: 'redirect("/dashboard")',
	},
	{
		filePath: ["app", "admin", "workspace", "team", "page.tsx"],
		expectedRedirect: 'redirect("/settings/team")',
	},
	{
		filePath: ["app", "admin", "workspace", "streams", "page.tsx"],
		expectedRedirect: 'redirect("/streams")',
	},
	{
		filePath: ["app", "admin", "workspace", "clients", "page.tsx"],
		expectedRedirect: 'redirect("/clients")',
	},
	{
		filePath: ["app", "admin", "workspace", "offers", "page.tsx"],
		expectedRedirect: 'redirect("/offers")',
	},
] as const;

const dashboardPageSource = readFileSync(
	join(process.cwd(), "app", "(agent)", "dashboard", "page.tsx"),
	"utf8",
);

const adminLayoutSource = readFileSync(
	join(process.cwd(), "app", "admin", "layout.tsx"),
	"utf8",
);

const orgRequiredScreenSource = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"org-context",
		"org-required-screen.tsx",
	),
	"utf8",
);

const legacyRedirectMappings = [
	{
		filePath: ["app", "admin", "organizations", "[id]", "team", "page.tsx"],
		expectedRedirect: 'redirect("/settings/team")',
	},
	{
		filePath: ["app", "admin", "organizations", "[id]", "streams", "page.tsx"],
		expectedRedirect: 'redirect("/streams")',
	},
	{
		filePath: ["app", "admin", "organizations", "[id]", "clients", "page.tsx"],
		expectedRedirect: 'redirect("/clients")',
	},
	{
		filePath: ["app", "admin", "organizations", "[id]", "offers", "page.tsx"],
		expectedRedirect: 'redirect("/offers")',
	},
] as const;

describe("org-admin guard behavior", () => {
	it("keeps legacy /org-admin routes redirected to /admin family", () => {
		expect(orgAdminPageSource.includes('redirect("/dashboard")')).toBe(true);
		expect(orgAdminTeamPageSource.includes('redirect("/settings/team")')).toBe(
			true,
		);
		expect(orgAdminStreamsPageSource.includes('redirect("/streams")')).toBe(
			true,
		);
		expect(orgAdminClientsPageSource.includes('redirect("/clients")')).toBe(
			true,
		);
		expect(orgAdminOffersPageSource.includes('redirect("/offers")')).toBe(true);
	});
});

describe("shared admin guard behavior", () => {
	it("still protects admin platform routes", () => {
		expect(
			getAdminRedirectPath({ role: "admin", isSuperuser: true }),
		).toBeNull();
		expect(
			getAdminRedirectPath({ role: "org_admin", isSuperuser: false }),
		).toBeNull();
	});

	it("redirects non-admin roles from /admin to home", () => {
		expect(
			getAdminRedirectPath({ role: "field_agent", isSuperuser: false }),
		).toBe("/");
	});

	it("routes post-auth landing by role", () => {
		expect(getPostAuthLandingPath({ role: "admin", isSuperuser: true })).toBe(
			"/dashboard",
		);
		expect(
			getPostAuthLandingPath({ role: "org_admin", isSuperuser: false }),
		).toBe("/dashboard");
		expect(
			getPostAuthLandingPath({ role: "field_agent", isSuperuser: false }),
		).toBe("/dashboard");
	});
});

describe("admin entry route", () => {
	it("redirects obsolete /admin workspace entry to shared dashboard", () => {
		expect(adminPageSource.includes('redirect("/dashboard")')).toBe(true);
		expect(adminTeamPageSource.includes('redirect("/settings/team")')).toBe(
			true,
		);
		expect(adminStreamsPageSource.includes('redirect("/streams")')).toBe(true);
		expect(adminClientsPageSource.includes('redirect("/clients")')).toBe(true);
		expect(adminOffersPageSource.includes('redirect("/offers")')).toBe(true);
	});
});

describe("legacy /admin/organizations/[id] redirects", () => {
	it("redirects legacy team/streams/clients/offers paths into shared /admin routes", () => {
		for (const mapping of legacyRedirectMappings) {
			const source = readFileSync(
				join(process.cwd(), ...mapping.filePath),
				"utf8",
			);
			expect(source.includes(mapping.expectedRedirect)).toBe(true);
		}
	});
});

describe("obsolete workspace route family", () => {
	it("redirects /admin/workspace/* to simplified /admin/* routes", () => {
		for (const mapping of legacyWorkspaceRedirectMappings) {
			const source = readFileSync(
				join(process.cwd(), ...mapping.filePath),
				"utf8",
			);
			expect(source.includes(mapping.expectedRedirect)).toBe(true);
		}
	});
});

describe("admin-first dashboard and navigation", () => {
	it("switches /dashboard content by role", () => {
		expect(dashboardPageSource.includes("isOrgAdmin || isSuperAdmin")).toBe(
			true,
		);
		expect(dashboardPageSource.includes("AdminDashboardPageContent")).toBe(
			true,
		);
	});

	it("builds role-aware navigation for shared product routes", () => {
		const fieldAgentNav = getSidebarNavItems("field-agent").map(
			(item) => item.href,
		);
		const orgAdminNav = getSidebarNavItems("org-admin").map(
			(item) => item.href,
		);
		const superadminNav = getSidebarNavItems("superadmin").map(
			(item) => item.href,
		);

		expect(fieldAgentNav).toEqual([
			"/dashboard",
			"/streams",
			"/clients",
			"/offers",
		]);
		expect(orgAdminNav).toEqual([
			"/dashboard",
			"/streams",
			"/clients",
			"/offers",
			"/settings/team",
		]);
		expect(superadminNav).toEqual([
			"/dashboard",
			"/streams",
			"/clients",
			"/offers",
			"/settings/team",
			"/admin/organizations",
		]);
	});

	it("keeps superadmin organizations inside shared product shell", () => {
		expect(adminLayoutSource.includes("AgentShellLayout")).toBe(true);
		expect(adminLayoutSource.includes("AdminSidebar")).toBe(false);
		expect(adminLayoutSource.includes("Admin Console")).toBe(false);
		expect(orgRequiredScreenSource.includes("Admin Console")).toBe(false);
		expect(orgRequiredScreenSource.includes("Organizations")).toBe(true);
	});
});
