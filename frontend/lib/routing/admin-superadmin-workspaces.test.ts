import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	getAdminRedirectPath,
	getOrgAdminRedirectPath,
	getSuperAdminEntryPath,
} from "@/lib/routing/workspace-guards";

const orgAdminTeamPageSource = readFileSync(
	join(process.cwd(), "app", "org-admin", "team", "page.tsx"),
	"utf8",
);

const adminWorkspaceTeamPageSource = readFileSync(
	join(process.cwd(), "app", "admin", "workspace", "team", "page.tsx"),
	"utf8",
);

const orgAdminDashboardPageSource = readFileSync(
	join(process.cwd(), "app", "org-admin", "page.tsx"),
	"utf8",
);

const adminWorkspaceLayoutSource = readFileSync(
	join(process.cwd(), "app", "admin", "workspace", "layout.tsx"),
	"utf8",
);

const adminEntryPageSource = readFileSync(
	join(process.cwd(), "app", "admin", "page.tsx"),
	"utf8",
);

const dashboardPageSource = readFileSync(
	join(process.cwd(), "app", "(agent)", "dashboard", "page.tsx"),
	"utf8",
);

const adminSidebarSource = readFileSync(
	join(process.cwd(), "components", "features", "admin", "admin-sidebar.tsx"),
	"utf8",
);

const legacyRedirectPrefix = "redirect(`/admin/organizations/";

const legacyRedirectMappings = [
	{
		filePath: ["app", "admin", "organizations", "[id]", "team", "page.tsx"],
	},
	{
		filePath: ["app", "admin", "organizations", "[id]", "streams", "page.tsx"],
	},
	{
		filePath: ["app", "admin", "organizations", "[id]", "clients", "page.tsx"],
	},
	{
		filePath: ["app", "admin", "organizations", "[id]", "offers", "page.tsx"],
	},
] as const;

describe("org-admin guard behavior", () => {
	it("allows org admins to stay in /org-admin", () => {
		expect(
			getOrgAdminRedirectPath({ role: "org_admin", isSuperuser: false }),
		).toBeNull();
	});

	it("redirects superadmins away from /org-admin to /admin", () => {
		expect(getOrgAdminRedirectPath({ role: "admin", isSuperuser: true })).toBe(
			"/admin",
		);
	});

	it("redirects non-org-admin users away from /org-admin to home", () => {
		expect(
			getOrgAdminRedirectPath({ role: "sales_rep", isSuperuser: false }),
		).toBe("/");
	});
});

describe("superadmin guard behavior", () => {
	it("keeps superadmins in /admin", () => {
		expect(getAdminRedirectPath(true)).toBeNull();
	});

	it("redirects non-superadmins from /admin to home", () => {
		expect(getAdminRedirectPath(false)).toBe("/");
	});

	it("routes superadmin entry by selected org context", () => {
		expect(getSuperAdminEntryPath("org-123")).toBe("/admin/workspace");
		expect(getSuperAdminEntryPath(null)).toBe("/admin/organizations");
	});
});

describe("admin entry route", () => {
	it("uses selected-org aware superadmin entry redirect", () => {
		expect(adminEntryPageSource.includes("getSuperAdminEntryPath")).toBe(true);
		expect(adminEntryPageSource.includes("selectedOrgId")).toBe(true);
		expect(adminEntryPageSource.includes("/admin/organizations")).toBe(false);
	});
});

describe("legacy /admin/organizations/[id] redirects", () => {
	it("keeps legacy team/streams/clients/offers paths in org-management detail", () => {
		for (const mapping of legacyRedirectMappings) {
			const source = readFileSync(
				join(process.cwd(), ...mapping.filePath),
				"utf8",
			);
			expect(source.includes(legacyRedirectPrefix)).toBe(true);
			expect(source.includes("/workspace/")).toBe(false);
		}
	});
});

describe("selector-driven admin workspace routes", () => {
	it("keeps admin workspace family under /admin/workspace/*", () => {
		expect(adminWorkspaceLayoutSource.includes('"/admin/workspace"')).toBe(
			true,
		);
		expect(adminWorkspaceLayoutSource.includes("selectedOrgId")).toBe(true);
		expect(
			adminWorkspaceLayoutSource.includes("Select an organization first"),
		).toBe(true);
	});
});

describe("shared page leakage checks", () => {
	it("keeps org-admin team route free of URL-scoped superadmin org prop", () => {
		expect(orgAdminTeamPageSource.includes("organizationId=")).toBe(false);
		expect(
			orgAdminTeamPageSource.includes("WorkspaceTeamMembersPageContent"),
		).toBe(true);
	});

	it("uses selected org store for superadmin team route", () => {
		expect(
			adminWorkspaceTeamPageSource.includes(
				"useOrganizationStore((state) => state.selectedOrgId)",
			),
		).toBe(true);
	});
});

describe("admin-first dashboard and navigation", () => {
	it("uses dedicated admin dashboard component for org-admin page", () => {
		expect(
			orgAdminDashboardPageSource.includes("AdminDashboardPageContent"),
		).toBe(true);
		expect(
			orgAdminDashboardPageSource.includes("WorkspaceDashboardPageContent"),
		).toBe(false);
	});

	it("keeps field-agent dashboard free of superadmin workspace alert", () => {
		expect(dashboardPageSource.includes("Superadmin mode")).toBe(false);
		expect(dashboardPageSource.includes("Open selected org workspace")).toBe(
			false,
		);
	});

	it("shows workspace links in admin sidebar when org context exists", () => {
		expect(adminSidebarSource.includes("WORKSPACE_NAV_ITEMS")).toBe(true);
		expect(adminSidebarSource.includes("selectedOrgId ? (")).toBe(true);
		expect(adminSidebarSource.includes('href: "/admin/workspace/team"')).toBe(
			true,
		);
	});
});
