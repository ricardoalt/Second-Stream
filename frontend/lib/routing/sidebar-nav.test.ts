import { describe, expect, it } from "bun:test";
import { getSidebarNavItems } from "@/lib/routing/sidebar-nav";

describe("sidebar navigation", () => {
	it("places Leads below Streams and above Clients for field agents", () => {
		const items = getSidebarNavItems("field-agent");
		const labels = items.map((item) => item.label);

		expect(labels.includes("Streams")).toBe(true);
		expect(labels.includes("Leads")).toBe(true);
		expect(labels.includes("Clients")).toBe(true);
		expect(labels.indexOf("Streams")).toBeLessThan(labels.indexOf("Leads"));
		expect(labels.indexOf("Leads")).toBeLessThan(labels.indexOf("Clients"));
	});
});
