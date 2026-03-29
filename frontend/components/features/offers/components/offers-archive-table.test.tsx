import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { OfferArchiveRowDTO } from "@/lib/api/offers";
import { OffersArchiveTable } from "./offers-archive-table";

const rows: OfferArchiveRowDTO[] = [
	{
		projectId: "project-1",
		streamName: "Catalyst Stream",
		companyLabel: "Catalyst Co",
		locationLabel: "Catalyst Site",
		proposalFollowUpState: "declined",
		latestProposalId: "proposal-1",
		latestProposalVersion: "v1.0",
		latestProposalTitle: "Offer",
		valueUsd: 125000,
		lastActivityAt: "2026-03-29T10:00:00.000Z",
		archivedAt: "2026-03-29T10:00:00.000Z",
	},
];

describe("offers archive table", () => {
	it("renders API-backed archive rows without export action", () => {
		const markup = renderToStaticMarkup(<OffersArchiveTable offers={rows} />);

		expect(markup.includes("Catalyst Stream")).toBe(true);
		expect(markup.includes("Declined")).toBe(true);
		expect(markup.includes("v1.0")).toBe(true);
		expect(markup.includes("Export")).toBe(false);
	});
});
