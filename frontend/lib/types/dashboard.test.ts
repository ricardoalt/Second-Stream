import { describe, expect, it } from "bun:test";
import { buildConfirmationFlowUrl } from "@/lib/routes";
import type { DraftTarget } from "@/lib/types/dashboard";
import { BUCKET_TABS } from "@/lib/types/dashboard";

describe("Dashboard types", () => {
	describe("BUCKET_TABS", () => {
		it("covers all 5 dashboard buckets", () => {
			expect(BUCKET_TABS).toHaveLength(5);
			const ids = BUCKET_TABS.map((t) => t.id);
			expect(ids).toContain("total");
			expect(ids).toContain("needs_confirmation");
			expect(ids).toContain("missing_information");
			expect(ids).toContain("intelligence_report");
			expect(ids).toContain("proposal");
		});

		it("maps to camelCase DashboardCounts keys", () => {
			const expectedKeys = [
				"total",
				"needsConfirmation",
				"missingInformation",
				"intelligenceReport",
				"proposal",
			];
			const countKeys = BUCKET_TABS.map((t) => t.countKey);
			expect(countKeys).toEqual(expectedKeys);
		});

		it("has label and icon for each tab", () => {
			for (const tab of BUCKET_TABS) {
				expect(tab.label).toBeTruthy();
				expect(tab.icon).toBeTruthy();
			}
		});
	});
});

describe("buildConfirmationFlowUrl", () => {
	const baseTarget: DraftTarget = {
		targetKind: "confirmation_flow",
		runId: "run-abc-123",
		itemId: "item-def-456",
		sourceType: "bulk_import",
		entrypointType: "company",
		entrypointId: "company-xyz-789",
	};

	it("uses row companyId for company-backed drafts", () => {
		const url = buildConfirmationFlowUrl(baseTarget, "my-company-id");
		expect(url).not.toBeNull();
		expect(url).toContain("/companies/my-company-id");
		expect(url).toContain("run_id=run-abc-123");
		expect(url).toContain("source_type=bulk_import");
	});

	it("uses row companyId for location-backed drafts (not entrypointId)", () => {
		const locationTarget: DraftTarget = {
			...baseTarget,
			entrypointType: "location",
			entrypointId: "loc-111", // This is a location UUID
		};
		const url = buildConfirmationFlowUrl(locationTarget, "company-222");
		expect(url).not.toBeNull();
		// Must route to company, not location
		expect(url).toContain("/companies/company-222");
		expect(url).not.toContain("loc-111");
	});

	it("returns null for orphan/unassigned drafts (companyId is null)", () => {
		const url = buildConfirmationFlowUrl(baseTarget, null);
		expect(url).toBeNull();
	});

	it("includes run_id and source_type params", () => {
		const url = buildConfirmationFlowUrl(baseTarget, "my-company-id");
		expect(url).not.toBeNull();
		expect(url).toContain("run_id=run-abc-123");
		expect(url).toContain("source_type=bulk_import");
	});

	it("preserves voice source type", () => {
		const voiceTarget: DraftTarget = {
			...baseTarget,
			sourceType: "voice_interview",
		};
		const url = buildConfirmationFlowUrl(voiceTarget, "my-company-id");
		expect(url).not.toBeNull();
		expect(url).toContain("source_type=voice_interview");
	});

	it("generates a valid URL string when companyId is present", () => {
		const url = buildConfirmationFlowUrl(baseTarget, "my-company-id");
		expect(url).not.toBeNull();
		if (url === null) {
			throw new Error("Expected confirmation flow URL");
		}
		expect(url.startsWith("/")).toBe(true);
		expect(url.includes("?")).toBe(true);
	});
});
