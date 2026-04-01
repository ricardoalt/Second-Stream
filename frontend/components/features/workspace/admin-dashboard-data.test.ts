import { describe, expect, it } from "bun:test";
import type { OfferPipelineResponseDTO } from "@/lib/api/offers";
import type {
	DashboardListResponse,
	PersistedStreamRow,
} from "@/lib/types/dashboard";
import {
	buildKpiCards,
	buildSupervisionQueue,
	groupStreamsByOwner,
} from "./admin-dashboard-data";

function buildRow(overrides: Partial<PersistedStreamRow>): PersistedStreamRow {
	return {
		kind: "persisted_stream",
		bucket: "missing_information",
		projectId: "project-1",
		streamName: "Recovered Solvent",
		wasteCategoryLabel: null,
		ownerDisplayName: "Jane Roe",
		ownerUserId: "user-1",
		queuePriority: "normal",
		queuePriorityReason: "normal",
		companyId: null,
		companyLabel: "Acme",
		locationLabel: "Plant 1",
		archivedAt: null,
		volumeSummary: null,
		lastActivityAt: "2026-03-30T10:00:00Z",
		pendingConfirmation: false,
		missingRequiredInfo: true,
		missingFields: ["Type of Waste Generated"],
		intelligenceReady: false,
		proposalFollowUpState: null,
		canEditProposalFollowUp: true,
		...overrides,
	};
}

const DASHBOARD_RESPONSE: DashboardListResponse = {
	bucket: "total",
	counts: {
		total: 6,
		needsConfirmation: 2,
		missingInformation: 3,
		intelligenceReport: 1,
		proposal: 2,
	},
	items: [
		buildRow({ projectId: "project-1", ownerUserId: "user-1" }),
		buildRow({
			projectId: "project-2",
			ownerUserId: "user-1",
			streamName: "Acid Stream",
		}),
		buildRow({
			projectId: "project-3",
			ownerUserId: "user-2",
			ownerDisplayName: "Alex Doe",
		}),
	],
	secondaryDraftRows: [],
	total: 3,
	page: 1,
	size: 50,
	pages: 1,
	draftPreview: null,
};

const OFFERS_PIPELINE: OfferPipelineResponseDTO = {
	counts: {
		total: 2,
		uploaded: 0,
		waitingToSend: 1,
		waitingResponse: 0,
		underNegotiation: 1,
	},
	items: [],
};

describe("admin dashboard data mapping", () => {
	it("builds KPI cards from real existing backend metrics only", () => {
		const cards = buildKpiCards(DASHBOARD_RESPONSE, OFFERS_PIPELINE);
		expect(cards.map((card) => card.id)).toEqual([
			"total_streams",
			"needs_confirmation",
			"missing_information",
			"active_negotiation",
		]);
		expect(cards.map((card) => card.value)).toEqual([6, 2, 3, 1]);
	});

	it("groups team oversight by owner user id", () => {
		const groups = groupStreamsByOwner(DASHBOARD_RESPONSE.items);
		expect(groups).toHaveLength(2);
		expect(groups[0]?.ownerUserId).toBe("user-1");
		expect(groups[0]?.streams).toHaveLength(2);
		expect(groups[1]?.ownerUserId).toBe("user-2");
	});

	it("sorts critical supervision queue by backend priority", () => {
		const rows = [
			buildRow({
				projectId: "n",
				queuePriority: "normal",
				queuePriorityReason: "normal",
			}),
			buildRow({
				projectId: "h",
				queuePriority: "high",
				queuePriorityReason: "missing_required_info",
			}),
			buildRow({
				projectId: "c",
				queuePriority: "critical",
				queuePriorityReason: "pending_confirmation",
			}),
		];
		const queue = buildSupervisionQueue(rows);
		expect(queue.map((row) => row.projectId)).toEqual(["c", "h", "n"]);
	});
});
