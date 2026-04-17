import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const streamDetailModule = await import("./stream-detail-page-content");
const streamDetailSource = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"streams",
		"stream-detail-page-content.tsx",
	),
	"utf8",
);

describe("stream detail offer handoff", () => {
	it("preserves degraded-success handoff in Offer detail href", () => {
		expect(
			streamDetailModule.buildOfferDetailHandoffHref({
				offerId: "offer-123",
				insightsRefreshFailed: true,
			}),
		).toBe("/offers/offer-123?insightsRefreshFailed=1");

		expect(
			streamDetailModule.buildOfferDetailHandoffHref({
				offerId: "offer-123",
				insightsRefreshFailed: false,
			}),
		).toBe("/offers/offer-123");
	});

	it("prefers canonical Project.name for stream title", () => {
		expect(
			streamDetailModule.resolveStreamDetailTitle({
				projectName: "Canonical Stream Name",
				materialName: "Legacy workspace material",
			}),
		).toBe("Canonical Stream Name");
	});

	it("falls back to workspace material_name only when project name missing", () => {
		expect(
			streamDetailModule.resolveStreamDetailTitle({
				projectName: null,
				materialName: "Workspace material",
			}),
		).toBe("Workspace material");
	});

	it("uses Untitled stream when both title sources are empty", () => {
		expect(
			streamDetailModule.resolveStreamDetailTitle({
				projectName: "   ",
				materialName: "",
			}),
		).toBe("Untitled stream");
	});

	it("uses workspace hydrate/store as canonical title source without extra project fetch", () => {
		expect(streamDetailSource.includes("projectsAPI.getProject")).toBe(false);
		expect(streamDetailSource.includes("projectName: state.projectName")).toBe(
			true,
		);
	});
});
