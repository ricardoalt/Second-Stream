import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const offersPageSource = readFileSync(
	join(process.cwd(), "app", "(agent)", "offers", "page.tsx"),
	"utf8",
);

describe("offers page copy", () => {
	it("uses Offer started in the stage filter", () => {
		expect(offersPageSource.includes('Offer started')).toBe(true);
		expect(offersPageSource.includes('Requires data')).toBe(false);
	});
});
