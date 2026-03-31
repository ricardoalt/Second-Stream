import { describe, expect, it } from "bun:test";
import type { DraftCandidate } from "@/lib/types/discovery";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const modalModule = await import("./draft-confirmation-modal");

const pendingCandidate: DraftCandidate = {
	itemId: "item-1",
	runId: "run-1",
	clientId: "company-1",
	locationId: "location-1",
	material: "PET",
	volume: "100 kg/week",
	frequency: "weekly",
	units: "kg",
	locationLabel: "Plant A",
	source: "streams.csv",
	confidence: 0.9,
	status: "pending",
};

describe("DraftConfirmationModal helpers", () => {
	it("marks row busy for active confirm or bulk pending confirm", () => {
		expect(
			modalModule.isCandidateBusy({
				candidate: pendingCandidate,
				confirmingId: "item-1",
				isBulkConfirming: false,
			}),
		).toBe(true);

		expect(
			modalModule.isCandidateBusy({
				candidate: pendingCandidate,
				confirmingId: null,
				isBulkConfirming: true,
			}),
		).toBe(true);

		expect(
			modalModule.isCandidateBusy({
				candidate: { ...pendingCandidate, status: "confirmed" },
				confirmingId: null,
				isBulkConfirming: true,
			}),
		).toBe(false);
	});

	it("returns correct footer label for finalize action", () => {
		expect(modalModule.processFinalizeAllLabel(true)).toBe("Processing…");
		expect(modalModule.processFinalizeAllLabel(false)).toBe(
			"Process & Finalize All",
		);
	});

	it("treats reject action as optional", () => {
		expect(modalModule.canRejectCandidates(undefined)).toBe(false);
		expect(modalModule.canRejectCandidates(() => {})).toBe(true);
	});
});
