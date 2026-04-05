import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"streams",
		"stream-detail-page-content.tsx",
	),
	"utf8",
);

describe("stream detail page copy", () => {
	it("uses discovery workspace breadcrumb/copy instead of missing information", () => {
		expect(source.includes("Waste Streams &rsaquo; Discovery Workspace &rsaquo;")).toBe(
			true,
		);
		expect(source.includes("Discovery workspace")).toBe(true);
		expect(source.includes("Waste Streams &rsaquo; Missing Information &rsaquo;")).toBe(
			false,
		);
		expect(source.includes("Complete Stream Information")).toBe(false);
	});
});
