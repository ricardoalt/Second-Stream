import { describe, expect, it, mock } from "bun:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const offersPageModule = await import("./page");

describe("offers page manual create validation", () => {
	it("returns validation errors for each required field when empty", () => {
		const errors = offersPageModule.validateManualOfferForm({
			companyId: "",
			locationId: "",
			title: "",
			initialStatus: "uploaded",
			file: null,
		});

		expect(errors.companyId).toBe("Client is required.");
		expect(errors.locationId).toBe("Location is required.");
		expect(errors.title).toBe("Offer title is required.");
		expect(errors.file).toBe("Offer document is required.");
	});

	it("treats missing selections and whitespace-only title as invalid", () => {
		const errors = offersPageModule.validateManualOfferForm({
			companyId: "",
			locationId: "",
			title: "   ",
			initialStatus: "uploaded",
			file: new File(["offer"], "offer.pdf", { type: "application/pdf" }),
		});

		expect(errors.companyId).toBe("Client is required.");
		expect(errors.locationId).toBe("Location is required.");
		expect(errors.title).toBe("Offer title is required.");
		expect(errors.file).toBeUndefined();
	});

	it("accepts a complete payload with selected client/location ids, title, status, and file", () => {
		const errors = offersPageModule.validateManualOfferForm({
			companyId: "company-1",
			locationId: "location-1",
			title: "Manual Offer",
			initialStatus: "waiting_response",
			file: new File(["offer"], "offer.pdf", { type: "application/pdf" }),
		});

		expect(errors.companyId).toBeUndefined();
		expect(errors.locationId).toBeUndefined();
		expect(errors.title).toBeUndefined();
		expect(errors.file).toBeUndefined();
	});

	it("resolves selected company and location labels for API payload", () => {
		const payload = offersPageModule.resolveManualOfferCreatePayload({
			values: {
				companyId: "company-1",
				locationId: "location-1",
				title: "Manual Offer",
				initialStatus: "uploaded",
				file: new File(["offer"], "offer.pdf", { type: "application/pdf" }),
			},
			companies: [{ id: "company-1", name: "Acme Recycling" }],
			locations: [
				{ id: "location-1", companyId: "company-1", name: "Monterrey Plant" },
			],
		});

		expect(payload.client).toBe("Acme Recycling");
		expect(payload.location).toBe("Monterrey Plant");
		expect(payload.title).toBe("Manual Offer");
	});

	it("creates manual offer and refreshes the pipeline list", async () => {
		const values = {
			companyId: "company-1",
			locationId: "location-1",
			title: "Manual Offer",
			initialStatus: "waiting_to_send" as const,
			file: new File(["offer"], "offer.pdf", { type: "application/pdf" }),
		};
		const createManualOffer = mock(async () => ({ offerId: "offer-manual-1" }));
		const invalidateCache = mock(() => {});
		const revalidatePipeline = mock(async () => ({
			counts: {
				total: 1,
				uploaded: 0,
				waitingToSend: 1,
				waitingResponse: 0,
				underNegotiation: 0,
			},
			items: [
				{
					offerId: "offer-manual-1",
					projectId: null,
					streamName: "Manual Offer",
					companyLabel: "Acme Recycling",
					locationLabel: "Plant 1",
					proposalFollowUpState: "waiting_to_send" as const,
					latestProposalId: null,
					latestProposalVersion: null,
					latestProposalTitle: null,
					valueUsd: null,
					lastActivityAt: "2026-04-16T00:00:00.000Z",
				},
			],
		}));

		const mapped = await offersPageModule.createManualOfferAndRefreshPipeline({
			values,
			companies: [{ id: "company-1", name: "Acme Recycling" }],
			locations: [
				{ id: "location-1", companyId: "company-1", name: "Plant 1" },
			],
			createManualOffer,
			invalidateCache,
			revalidatePipeline,
		});

		expect(createManualOffer).toHaveBeenCalledWith({
			client: "Acme Recycling",
			location: "Plant 1",
			title: "Manual Offer",
			initialStatus: "waiting_to_send",
			file: values.file,
		});
		expect(invalidateCache).toHaveBeenCalledWith("offers:pipeline");
		expect(revalidatePipeline).toHaveBeenCalled();
		expect(mapped).toHaveLength(1);
		expect(mapped[0]?.offerId).toBe("offer-manual-1");
		expect(mapped[0]?.projectId).toBeNull();
	});

	it("does not revalidate pipeline when file is missing at submit helper layer", async () => {
		const createManualOffer = mock(async () => ({ offerId: "offer-manual-1" }));
		const invalidateCache = mock(() => {});
		const revalidatePipeline = mock(async () => ({ counts: {}, items: [] }));

		await expect(
			offersPageModule.createManualOfferAndRefreshPipeline({
				values: {
					companyId: "company-1",
					locationId: "location-1",
					title: "Manual Offer",
					initialStatus: "uploaded",
					file: null,
				},
				companies: [{ id: "company-1", name: "Acme" }],
				locations: [
					{ id: "location-1", companyId: "company-1", name: "Plant 1" },
				],
				createManualOffer,
				invalidateCache,
				revalidatePipeline,
			}),
		).rejects.toThrow("Offer document is required.");

		expect(createManualOffer).not.toHaveBeenCalled();
		expect(invalidateCache).not.toHaveBeenCalled();
		expect(revalidatePipeline).not.toHaveBeenCalled();
	});

	it("fails when selected location does not belong to selected client", async () => {
		await expect(
			offersPageModule.createManualOfferAndRefreshPipeline({
				values: {
					companyId: "company-1",
					locationId: "location-2",
					title: "Manual Offer",
					initialStatus: "uploaded",
					file: new File(["offer"], "offer.pdf", {
						type: "application/pdf",
					}),
				},
				companies: [{ id: "company-1", name: "Acme" }],
				locations: [
					{ id: "location-2", companyId: "company-2", name: "Wrong Plant" },
				],
				createManualOffer: mock(async () => ({ offerId: "offer-manual-1" })),
				invalidateCache: mock(() => {}),
				revalidatePipeline: mock(async () => ({ counts: {}, items: [] })),
			}),
		).rejects.toThrow("Selected location is invalid.");
	});
});
