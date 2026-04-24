import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
	mapProjectFollowUpToOfferStage,
	OFFER_FOLLOW_UP_LABELS,
} from "@/components/features/offers/utils";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const { apiClient } = await import("@/lib/api/client");
const { offersAPI } = await import("@/lib/api/offers");

const originalGet = apiClient.get;
const originalUpload = apiClient.uploadFile;
const originalPost = apiClient.post;
const originalPatch = apiClient.patch;
const originalUpdateOfferFollowUpState = offersAPI.updateOfferFollowUpState;
const originalGetOfferDetail = offersAPI.getOfferDetail;

describe("offer detail runtime behavior", () => {
	beforeEach(() => {
		apiClient.get = originalGet;
		apiClient.uploadFile = originalUpload;
		apiClient.post = originalPost;
		apiClient.patch = originalPatch;
		offersAPI.updateOfferFollowUpState = originalUpdateOfferFollowUpState;
		offersAPI.getOfferDetail = originalGetOfferDetail;
	});

	afterEach(() => {
		apiClient.get = originalGet;
		apiClient.uploadFile = originalUpload;
		apiClient.post = originalPost;
		apiClient.patch = originalPatch;
		offersAPI.updateOfferFollowUpState = originalUpdateOfferFollowUpState;
		offersAPI.getOfferDetail = originalGetOfferDetail;
	});

	it("maps backend follow-up states to offer labels", () => {
		expect(mapProjectFollowUpToOfferStage("uploaded")).toBe("requires_data");
		expect(mapProjectFollowUpToOfferStage("waiting_to_send")).toBe(
			"proposal_ready",
		);
		expect(mapProjectFollowUpToOfferStage("waiting_response")).toBe(
			"offer_sent",
		);
		expect(mapProjectFollowUpToOfferStage("under_negotiation")).toBe(
			"in_negotiation",
		);
		expect(mapProjectFollowUpToOfferStage("accepted")).toBe("accepted");
		expect(mapProjectFollowUpToOfferStage("rejected")).toBe("declined");
	});

	it("uses offer-oriented labels while preserving backend state keys", () => {
		expect(OFFER_FOLLOW_UP_LABELS.uploaded).toBe("Offer started");
		expect(OFFER_FOLLOW_UP_LABELS.waiting_to_send).toBe("Ready to send");
		expect(OFFER_FOLLOW_UP_LABELS.waiting_response).toBe("Awaiting response");
		expect(OFFER_FOLLOW_UP_LABELS.rejected).toBe("Declined");
	});

	it("hydrates direct /offers/[projectId] detail from backend offer endpoint", async () => {
		const getSpy = mock(async () => ({
			offerId: "offer-442",
			projectId: "project-442",
			sourceType: "stream" as const,
			contextCard: {
				title: "Stream snapshot" as const,
				description: null,
				fields: [],
			},
			streamSnapshot: {
				materialType: "Plastic film",
				materialName: "LDPE trim",
				composition: "95% LDPE",
				volume: "12 tons/month",
				frequency: "Daily",
			},
			followUpState: "uploaded" as const,
			insights: null,
			offerDocument: null,
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		const detail = await offersAPI.getOfferDetail("offer-442");

		expect(getSpy).toHaveBeenCalledWith("/offers/offer-442");
		expect(detail.offerId).toBe("offer-442");
		expect(detail.projectId).toBe("project-442");
		expect(detail.streamSnapshot.materialType).toBe("Plastic film");
		expect(detail.followUpState).toBe("uploaded");
		expect(detail.insights).toBeNull();
	});

	it("uploads an offer document with replaceable offer_document category", async () => {
		const file = new File(["offer content"], "offer.pdf", {
			type: "application/pdf",
		});
		const uploadSpy = mock(async () => ({ id: "file-1" }));
		apiClient.uploadFile = uploadSpy as typeof apiClient.uploadFile;

		await offersAPI.uploadOfferDocument("offer-442", file);

		expect(uploadSpy).toHaveBeenCalledWith("/offers/offer-442/document", file);
	});

	it("refreshes offer insights from the dedicated backend endpoint", async () => {
		const postSpy = mock(async () => ({
			projectId: "project-442",
			streamSnapshot: {
				materialType: "Plastic film",
				materialName: "LDPE trim",
				composition: "95% LDPE",
				volume: "12 tons/month",
				frequency: "Daily",
			},
			followUpState: "waiting_to_send" as const,
			insights: {
				summary: "Updated summary",
				keyPoints: ["A"],
				risks: [],
				recommendations: ["B"],
				freshness: {
					generatedAt: "2026-04-02T12:00:00.000Z",
					sourceUpdatedAt: "2026-04-02T11:00:00.000Z",
					isStale: false,
				},
			},
			offerDocument: null,
		}));
		apiClient.post = postSpy as typeof apiClient.post;

		const response = await offersAPI.refreshOfferInsights("project-442");

		expect(postSpy).toHaveBeenCalledWith(
			"/projects/project-442/offer/refresh-insights",
		);
		expect(response.insights?.summary).toBe("Updated summary");
	});

	it("wires follow-up transition mutations to the canonical backend endpoint", async () => {
		const patchSpy = mock(async () => ({
			offerId: "offer-442",
			projectId: "project-442",
			followUpState: "waiting_response" as const,
			updatedAt: "2026-03-28T02:00:00.000Z",
		}));
		apiClient.patch = patchSpy as typeof apiClient.patch;

		const response = await offersAPI.updateOfferFollowUpState(
			"offer-442",
			"waiting_response",
		);

		expect(patchSpy).toHaveBeenCalledWith("/offers/offer-442/status", {
			state: "waiting_response",
		});
		expect(response.offerId).toBe("offer-442");
		expect(response.followUpState).toBe("waiting_response");
	});

	it("refreshes detail state after a successful transition mutation", async () => {
		const updateSpy = mock(async () => ({
			offerId: "offer-442",
			projectId: "project-442",
			followUpState: "under_negotiation" as const,
			updatedAt: "2026-03-28T02:01:00.000Z",
		}));
		const refreshedDetail = {
			offerId: "offer-442",
			projectId: "project-442",
			sourceType: "stream" as const,
			contextCard: {
				title: "Stream snapshot" as const,
				description: null,
				fields: [],
			},
			streamSnapshot: {
				materialType: "Plastic film",
				materialName: "LDPE trim",
				composition: "95% LDPE",
				volume: "12 tons/month",
				frequency: "Daily",
			},
			followUpState: "under_negotiation" as const,
			insights: null,
			offerDocument: null,
		};
		const getDetailSpy = mock(async () => refreshedDetail);

		offersAPI.updateOfferFollowUpState =
			updateSpy as typeof offersAPI.updateOfferFollowUpState;
		offersAPI.getOfferDetail = getDetailSpy as typeof offersAPI.getOfferDetail;

		const response = await offersAPI.transitionOfferFollowUpState(
			"offer-442",
			"under_negotiation",
		);

		expect(updateSpy).toHaveBeenCalledWith("offer-442", "under_negotiation");
		expect(getDetailSpy).toHaveBeenCalledWith("offer-442");
		expect(response).toEqual(refreshedDetail);
	});

	it("prefers human-readable display title for detail header", async () => {
		const pageModule = await import("./offer-detail-utils");
		expect(
			pageModule.resolveOfferDetailHeaderTitle({
				displayTitle: "Manual Offer - Q2",
				offerId: "offer-442",
			}),
		).toBe("Manual Offer - Q2");

		expect(
			pageModule.resolveOfferDetailHeaderTitle({
				displayTitle: "  Stream Alpha  ",
				offerId: "offer-443",
			}),
		).toBe("Stream Alpha");
	});

	it("falls back to generic Offer header when display title is missing", async () => {
		const pageModule = await import("./offer-detail-utils");
		expect(
			pageModule.resolveOfferDetailHeaderTitle({
				displayTitle: null,
				offerId: "offer-442",
			}),
		).toBe("Offer");
		expect(
			pageModule.resolveOfferDetailHeaderTitle({
				displayTitle: "   ",
				offerId: "offer-443",
			}),
		).toBe("Offer");
	});
});
