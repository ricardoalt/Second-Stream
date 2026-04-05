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
});
