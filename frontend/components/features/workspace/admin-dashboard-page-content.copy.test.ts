import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"workspace",
		"admin-dashboard-page-content.tsx",
	),
	"utf8",
);

describe("admin dashboard page copy", () => {
	it("labels uploaded follow-up state as Offer started", () => {
		expect(source.includes('return "Offer started"')).toBe(true);
		expect(source.includes('return "Intake"')).toBe(false);
	});
});
