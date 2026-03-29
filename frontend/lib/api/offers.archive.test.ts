import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const { apiClient } = await import("@/lib/api/client");
const { normalizeOfferArchiveState, offersAPI } = await import(
	"@/lib/api/offers"
);

const originalGet = apiClient.get;

describe("offers archive api client", () => {
	beforeEach(() => {
		apiClient.get = originalGet;
	});

	afterEach(() => {
		apiClient.get = originalGet;
	});

	it("normalizes legacy rejected state to declined", () => {
		expect(normalizeOfferArchiveState("accepted")).toBe("accepted");
		expect(normalizeOfferArchiveState("declined")).toBe("declined");
		expect(normalizeOfferArchiveState("rejected")).toBe("declined");
	});

	it("requests archive endpoint with search and status filters", async () => {
		const getSpy = mock(async () => ({
			counts: { total: 1, accepted: 0, declined: 1 },
			items: [
				{
					projectId: "project-1",
					streamName: "Catalyst Stream",
					companyLabel: "Catalyst Co",
					locationLabel: "Catalyst Site",
					proposalFollowUpState: "rejected" as const,
					latestProposalId: "proposal-1",
					latestProposalVersion: "v1.0",
					latestProposalTitle: "Offer",
					valueUsd: 55000,
					lastActivityAt: "2026-03-29T00:00:00.000Z",
					archivedAt: "2026-03-29T00:00:00.000Z",
				},
			],
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		const response = await offersAPI.getArchive({
			search: "  catalyst  ",
			status: "declined",
		});

		expect(getSpy).toHaveBeenCalledWith(
			"/projects/offers/archive?search=catalyst&status=declined",
		);
		expect(response.items[0]?.proposalFollowUpState).toBe("declined");
	});
});
