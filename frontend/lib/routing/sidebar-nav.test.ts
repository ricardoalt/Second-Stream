import { describe, expect, it } from "bun:test";
import { getSidebarNavItems } from "@/lib/routing/sidebar-nav";

describe("sidebar navigation", () => {
	it("includes Leads above Clients for field agents", () => {
		const items = getSidebarNavItems("field-agent");
		const labels = items.map((item) => item.label);

		expect(labels.includes("Leads")).toBe(true);
		expect(labels.includes("Clients")).toBe(true);
		expect(labels.indexOf("Leads")).toBeLessThan(labels.indexOf("Clients"));
	});
});
