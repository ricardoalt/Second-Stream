import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const { apiClient } = await import("@/lib/api/client");
const { offersAPI } = await import("@/lib/api/offers");

const originalUpload = apiClient.uploadFile;

describe("offers manual create api client", () => {
	beforeEach(() => {
		apiClient.uploadFile = originalUpload;
	});

	afterEach(() => {
		apiClient.uploadFile = originalUpload;
	});

	it("submits manual offer multipart payload to canonical endpoint", async () => {
		const uploadSpy = mock(async () => ({
			offerId: "offer-manual-1",
			projectId: null,
			sourceType: "manual" as const,
			contextCard: {
				title: "Offer context" as const,
				description: null,
				fields: [],
			},
			streamSnapshot: {
				materialType: null,
				materialName: null,
				composition: null,
				volume: null,
				frequency: null,
			},
			followUpState: "uploaded" as const,
			insights: null,
			offerDocument: null,
		}));
		apiClient.uploadFile = uploadSpy as typeof apiClient.uploadFile;

		const file = new File(["offer"], "manual-offer.pdf", {
			type: "application/pdf",
		});

		await offersAPI.createManualOffer({
			client: "Acme Recycling",
			location: "Monterrey",
			title: "Q2 Bale Contract",
			initialStatus: "waiting_to_send",
			file,
		});

		expect(uploadSpy).toHaveBeenCalledWith("/offers", file, {
			client: "Acme Recycling",
			location: "Monterrey",
			title: "Q2 Bale Contract",
			initial_status: "waiting_to_send",
		});
	});
});
