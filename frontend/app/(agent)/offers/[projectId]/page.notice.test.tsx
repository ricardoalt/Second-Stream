import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const offerDetailPageModule = await import("./page");

describe("offer detail handoff degraded-success notice", () => {
	it("shows notice only when insightsRefreshFailed query param equals 1", () => {
		expect(
			offerDetailPageModule.shouldShowInsightsRefreshFailedNotice("1"),
		).toBe(true);
		expect(
			offerDetailPageModule.shouldShowInsightsRefreshFailedNotice("0"),
		).toBe(false);
		expect(
			offerDetailPageModule.shouldShowInsightsRefreshFailedNotice(null),
		).toBe(false);
	});

	it("removes insightsRefreshFailed from href while preserving path, hash, and other params", () => {
		expect(
			offerDetailPageModule.removeInsightsRefreshFailedFromHref(
				"https://secondstream.test/offers/project-123?insightsRefreshFailed=1",
			),
		).toBe("/offers/project-123");

		expect(
			offerDetailPageModule.removeInsightsRefreshFailedFromHref(
				"https://secondstream.test/offers/project-123?foo=bar&insightsRefreshFailed=1#section-a",
			),
		).toBe("/offers/project-123?foo=bar#section-a");
	});

	it("returns null when cleanup is not needed", () => {
		expect(
			offerDetailPageModule.removeInsightsRefreshFailedFromHref(
				"https://secondstream.test/offers/project-123?foo=bar",
			),
		).toBeNull();
	});

	it("renders clear degraded-success copy in the notice", () => {
		const Notice = offerDetailPageModule.OfferInsightsRefreshFailedNotice;
		const markup = renderToStaticMarkup(<Notice />);

		expect(markup).toContain("Discovery completed with delayed insights");
		expect(markup).toContain("Discovery completed and this Offer is open");
		expect(markup).toContain("insights could not be generated yet");
		expect(markup).toContain("refresh insights when ready");
	});
});
