import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OffersStagePipeline } from "./offers-stage-pipeline";

describe("offers stage pipeline navigation", () => {
	it("uses canonical offerId links even when projectId is null", () => {
		const markup = renderToStaticMarkup(
			<OffersStagePipeline
				stages={[
					{
						stage: "requires_data",
						offers: [
							{
								offerId: "offer-manual-1",
								projectId: null,
								reference: "No version",
								clientName: "Acme",
								streamName: "Manual Offer",
								stage: "requires_data",
								valueUsd: 0,
								updatedAt: "Apr 16, 2026",
							},
						],
					},
					{ stage: "proposal_ready", offers: [] },
					{ stage: "offer_sent", offers: [] },
					{ stage: "in_negotiation", offers: [] },
				]}
			/>,
		);

		expect(markup.includes('href="/offers/offer-manual-1"')).toBe(true);
		expect(markup.includes('href="/offers/null"')).toBe(false);
	});
});
