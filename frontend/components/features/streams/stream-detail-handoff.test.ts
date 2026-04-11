import { describe, expect, it } from "bun:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const streamDetailModule = await import("./stream-detail-page-content");

describe("stream detail offer handoff", () => {
	it("preserves degraded-success handoff in Offer detail href", () => {
		expect(
			streamDetailModule.buildOfferDetailHandoffHref({
				projectId: "project-123",
				insightsRefreshFailed: true,
			}),
		).toBe("/offers/project-123?insightsRefreshFailed=1");

		expect(
			streamDetailModule.buildOfferDetailHandoffHref({
				projectId: "project-123",
				insightsRefreshFailed: false,
			}),
		).toBe("/offers/project-123");
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
});
