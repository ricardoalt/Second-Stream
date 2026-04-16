import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	formatStreamStatus,
	getAllStreamsPrimaryActionLabel,
	getFollowUpOpenHref,
	getSelectedFollowUpItem,
	mapDraftRowToDraftCandidate,
	mapEditorStateToDraftCandidate,
	resolveOpenDraftState,
	summarizeRejectAllDraftsResults,
} from "@/components/features/streams/runtime-helpers";
import {
	applyDraftFieldUpdate,
	type DraftEditorState,
	resolveDraftPrimaryActionMode,
	validateDraft,
} from "@/components/features/streams/streams-drafts-table";
import type { StreamRow } from "@/components/features/streams/types";
import { adaptDraftItem } from "@/lib/adapters/streams-adapter";
import { validateCandidateForConfirmation } from "@/lib/discovery-confirmation-utils";
import type { DashboardCounts, DraftItemRow } from "@/lib/types/dashboard";
import { computeFollowUpPriority } from "@/lib/utils/compute-follow-up-priority";
import { computeWasteStreamsKpis } from "@/lib/utils/compute-waste-streams-kpis";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const baseStream: StreamRow = {
	id: "STR-1",
	name: "Spent Solvent",
	client: "Acme Chemical",
	location: "Houston, TX",
	agent: "Alex",
	wasteType: "Solvent",
	volume: "20",
	units: "tons/mo",
	lastUpdated: "Now",
	phase: 1,
	status: "active",
};

describe("/streams runtime hardening", () => {
	it("keeps KPI semantics tab-invariant and excludes drafts from Active Streams", () => {
		const dataset: StreamRow[] = [
			baseStream,
			{ ...baseStream, id: "STR-2", status: "missing_info" },
			{ ...baseStream, id: "STR-3", status: "ready_for_offer" },
			{ ...baseStream, id: "STR-4", status: "draft" },
		];

		const allTabKpis = computeWasteStreamsKpis(dataset);
		const draftsTabKpis = computeWasteStreamsKpis(dataset);
		const missingInfoTabKpis = computeWasteStreamsKpis(dataset);

		expect(allTabKpis).toEqual(draftsTabKpis);
		expect(allTabKpis).toEqual(missingInfoTabKpis);
		expect(allTabKpis.activeStreams).toBe(3);
	});

	it("maps dashboard counts to truthful KPI availability", () => {
		const counts: DashboardCounts = {
			total: 12,
			needsConfirmation: 3,
			missingInformation: 4,
			intelligenceReport: 2,
			proposal: 1,
		};

		expect(computeWasteStreamsKpis(counts)).toEqual({
			activeStreams: 12,
			criticalAlerts: 4,
			monthlyVolume: null,
			openOffers: null,
			unavailableReasons: {
				monthlyVolume: "pending_backend_contract",
				openOffers: "pending_backend_contract",
			},
		});
	});

	it("returns explicit row action labels for draft vs non-draft rows", () => {
		expect(
			getAllStreamsPrimaryActionLabel({ ...baseStream, status: "draft" }),
		).toBe("Open Draft");
		expect(
			getAllStreamsPrimaryActionLabel({
				...baseStream,
				status: "missing_info",
			}),
		).toBe("Open");
	});

	it("renders assign/reassign inline in Agent column instead of Actions menu", () => {
		const tableSource = readFileSync(
			join(
				process.cwd(),
				"components",
				"features",
				"streams",
				"streams-all-table.tsx",
			),
			"utf8",
		);

		expect(tableSource.includes("<DropdownMenu")).toBe(false);
		expect(
			tableSource.includes("Owner badge - only visible for org admins"),
		).toBe(false);
		expect(tableSource.includes("Agent")).toBe(true);
		expect(tableSource.includes("Creator default")).toBe(true);
		expect(tableSource.includes("Assign agent")).toBe(true);
		expect(tableSource.includes("Reassign")).toBe(true);
		expect(tableSource.includes("openAgentAssignmentDialog(row)")).toBe(true);
		expect(tableSource.includes("event.stopPropagation()")).toBe(true);
	});

	it("routes Open Draft behavior to Drafts tab with highlighted row", () => {
		expect(resolveOpenDraftState("DRAFT-02")).toEqual({
			activeTab: "drafts",
			highlightedDraftId: "DRAFT-02",
		});
	});

	it("allows optional volume/frequency/units for inline draft confirmation", () => {
		const validDraft: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "20",
			frequency: "Weekly",
			units: "tons/mo",
			clientId: "company-1",
			locationId: "location-1",
		};
		const sparseDraft: DraftEditorState = {
			...validDraft,
			volume: "",
			frequency: "",
			units: "",
		};

		expect(validateDraft(validDraft)).toEqual({});
		expect(validateDraft(sparseDraft)).toEqual({});
	});

	it("does not require location to validate a draft row", () => {
		const draftWithoutLocation: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "20",
			frequency: "Weekly",
			units: "tons/mo",
			clientId: "company-1",
			locationId: "",
		};

		expect(validateDraft(draftWithoutLocation)).toEqual({});
	});

	it("resolves primary draft action mode to review when review callback exists", () => {
		expect(
			resolveDraftPrimaryActionMode({
				onReview: () => {},
			}),
		).toBe("review");

		expect(
			resolveDraftPrimaryActionMode({
				onConfirm: () => {},
			}),
		).toBe("confirm");
	});

	it("resets location when draft client changes", () => {
		const currentDraft: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "20",
			frequency: "Weekly",
			units: "tons/mo",
			clientId: "company-1",
			locationId: "location-1",
		};

		expect(
			applyDraftFieldUpdate({
				draft: currentDraft,
				field: "clientId",
				value: "company-2",
			}),
		).toEqual({
			...currentDraft,
			clientId: "company-2",
			locationId: "",
		});
	});

	it("maps inline Draft editor state into confirmation candidate shape", () => {
		const editorState: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "20",
			frequency: "Weekly",
			units: "tons/mo",
			clientId: "company-1",
			locationId: "location-1",
		};

		expect(
			mapEditorStateToDraftCandidate("draft-item-1", "run-1", editorState),
		).toEqual({
			itemId: "draft-item-1",
			runId: "run-1",
			clientId: "company-1",
			locationId: "location-1",
			material: "Spent Solvent",
			volume: "20",
			frequency: "Weekly",
			units: "tons/mo",
			locationLabel: null,
			source: "Waste Streams Drafts",
			confidence: null,
			status: "pending",
		});
	});

	it("maps wasteType to material and units 1:1", () => {
		const editorState: DraftEditorState = {
			wasteType: "Used Oil",
			volume: "8",
			frequency: "Monthly",
			units: "gal/mo",
			clientId: "company-77",
			locationId: "location-42",
		};
		const candidate = mapEditorStateToDraftCandidate(
			"draft-item-2",
			"run-2",
			editorState,
		);

		expect(candidate.material).toBe(editorState.wasteType);
		expect(candidate.units).toBe(editorState.units);
	});

	it("maps draft rows into confirmation candidates without dropping AI suggestions", () => {
		const draftRow: DraftItemRow = {
			kind: "draft_item",
			bucket: "needs_confirmation",
			itemId: "item-7",
			runId: "run-7",
			groupId: null,
			streamName: "Spent Solvent",
			companyId: null,
			companyLabel: null,
			suggestedCompanyLabel: "Exxon",
			locationLabel: null,
			suggestedLocationName: "Baton Rouge",
			suggestedLocationCity: "Baton Rouge",
			suggestedLocationState: "LA",
			suggestedLocationAddress: null,
			volume: "BULK LOAD",
			frequency: "5-6 PER MONTH",
			units: "BULK LOAD",
			volumeSummary: "BULK LOAD / 5-6 PER MONTH",
			lastActivityAt: "2026-01-01T00:00:00Z",
			sourceType: "bulk_import",
			sourceFilename: "drafts.xlsx",
			draftStatus: "pending_review",
			confidence: 0.73,
			draftKind: "orphan_stream",
			queuePriority: "normal",
			queuePriorityReason: "normal",
			confirmable: true,
			target: null,
		};
		const editorState: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "BULK LOAD",
			frequency: "5-6 PER MONTH",
			units: "BULK LOAD",
			clientId: "",
			locationId: "",
		};

		expect(mapDraftRowToDraftCandidate(draftRow, editorState)).toEqual(
			expect.objectContaining({
				suggestedClientName: "Exxon",
				suggestedLocationName: "Baton Rouge",
				locationResolutionHint: "suggested",
				volume: "BULK LOAD",
				frequency: "5-6 PER MONTH",
				units: "BULK LOAD",
			}),
		);
	});

	it("uses locationLabel fallback for suggested location in Drafts bucket mapping", () => {
		const draftRow: DraftItemRow = {
			kind: "draft_item",
			bucket: "needs_confirmation",
			itemId: "item-fallback-1",
			runId: "run-fallback-1",
			groupId: null,
			streamName: "Spent Solvent",
			companyId: null,
			companyLabel: null,
			suggestedCompanyLabel: "EXXON",
			locationLabel: "Baton Rouge",
			suggestedLocationName: null,
			suggestedLocationCity: null,
			suggestedLocationState: null,
			suggestedLocationAddress: null,
			volume: "BULK LOAD",
			frequency: "5-6 PER MONTH",
			units: "BULK LOAD",
			volumeSummary: "BULK LOAD / 5-6 PER MONTH",
			lastActivityAt: "2026-01-01T00:00:00Z",
			sourceType: "bulk_import",
			sourceFilename: "drafts.xlsx",
			draftStatus: "pending_review",
			confidence: 0.73,
			draftKind: "orphan_stream",
			queuePriority: "normal",
			queuePriorityReason: "normal",
			confirmable: true,
			target: null,
		};
		const editorState: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "BULK LOAD",
			frequency: "5-6 PER MONTH",
			units: "BULK LOAD",
			clientId: "",
			locationId: "",
		};

		expect(mapDraftRowToDraftCandidate(draftRow, editorState)).toEqual(
			expect.objectContaining({
				suggestedClientName: "EXXON",
				suggestedLocationName: "Baton Rouge",
				locationLabel: "Baton Rouge",
			}),
		);
	});

	it("parses contaminated suggested client/location labels in Drafts bucket mapping", () => {
		const draftRow: DraftItemRow = {
			kind: "draft_item",
			bucket: "needs_confirmation",
			itemId: "item-combined-1",
			runId: "run-combined-1",
			groupId: null,
			streamName: "Spent Solvent",
			companyId: null,
			companyLabel: null,
			suggestedCompanyLabel: "NEMS High Haz / Champion X - Midland",
			locationLabel: null,
			suggestedLocationName: null,
			suggestedLocationCity: "Midland",
			suggestedLocationState: "TX",
			suggestedLocationAddress: null,
			volume: "BULK LOAD",
			frequency: "5-6 PER MONTH",
			units: "BULK LOAD",
			volumeSummary: "BULK LOAD / 5-6 PER MONTH",
			lastActivityAt: "2026-01-01T00:00:00Z",
			sourceType: "bulk_import",
			sourceFilename: "drafts.xlsx",
			draftStatus: "pending_review",
			confidence: 0.73,
			draftKind: "orphan_stream",
			queuePriority: "normal",
			queuePriorityReason: "normal",
			confirmable: true,
			target: null,
		};
		const editorState: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "BULK LOAD",
			frequency: "5-6 PER MONTH",
			units: "BULK LOAD",
			clientId: "",
			locationId: "",
		};

		expect(mapDraftRowToDraftCandidate(draftRow, editorState)).toEqual(
			expect.objectContaining({
				suggestedClientName: "Champion X",
				suggestedLocationName: "Midland",
			}),
		);
	});

	it("keeps combined suggestion intact when location hint does not match", () => {
		const draftRow: DraftItemRow = {
			kind: "draft_item",
			bucket: "needs_confirmation",
			itemId: "item-combined-mismatch-1",
			runId: "run-combined-mismatch-1",
			groupId: null,
			streamName: "Spent Solvent",
			companyId: null,
			companyLabel: null,
			suggestedCompanyLabel: "NEMS High Haz / Champion X - Midland",
			locationLabel: null,
			suggestedLocationName: null,
			suggestedLocationCity: "Houston",
			suggestedLocationState: "TX",
			suggestedLocationAddress: null,
			volume: "BULK LOAD",
			frequency: "5-6 PER MONTH",
			units: "BULK LOAD",
			volumeSummary: "BULK LOAD / 5-6 PER MONTH",
			lastActivityAt: "2026-01-01T00:00:00Z",
			sourceType: "bulk_import",
			sourceFilename: "drafts.xlsx",
			draftStatus: "pending_review",
			confidence: 0.73,
			draftKind: "orphan_stream",
			queuePriority: "normal",
			queuePriorityReason: "normal",
			confirmable: true,
			target: null,
		};
		const editorState: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "BULK LOAD",
			frequency: "5-6 PER MONTH",
			units: "BULK LOAD",
			clientId: "",
			locationId: "",
		};

		expect(mapDraftRowToDraftCandidate(draftRow, editorState)).toEqual(
			expect.objectContaining({
				suggestedClientName: "NEMS High Haz / Champion X - Midland",
				suggestedLocationName: null,
			}),
		);
	});

	it("adapts draft rows using structured values and AI-suggested labels when unresolved", () => {
		const draftRow: DraftItemRow = {
			kind: "draft_item",
			bucket: "needs_confirmation",
			itemId: "item-9",
			runId: "run-9",
			groupId: null,
			streamName: "Acetonitrile/Toluene",
			companyId: null,
			companyLabel: null,
			suggestedCompanyLabel: "Clean Harbors",
			locationLabel: null,
			suggestedLocationName: "Linden",
			suggestedLocationCity: "Linden",
			suggestedLocationState: "NJ",
			suggestedLocationAddress: null,
			volume: "BULK LOAD",
			frequency: "3 LOADS/WEEK",
			units: "BULK LOAD",
			volumeSummary: "legacy summary",
			lastActivityAt: "2026-01-01T00:00:00Z",
			sourceType: "bulk_import",
			sourceFilename: "drafts.xlsx",
			draftStatus: "pending_review",
			confidence: 0.66,
			draftKind: "orphan_stream",
			queuePriority: "normal",
			queuePriorityReason: "normal",
			confirmable: true,
			target: null,
		};

		expect(adaptDraftItem(draftRow)).toEqual(
			expect.objectContaining({
				client: "Clean Harbors",
				location: "Linden",
				volume: "BULK LOAD",
				frequency: "3 LOADS/WEEK",
				units: "BULK LOAD",
			}),
		);
	});

	it("keeps canonical confirmation valid when frequency is missing", () => {
		const editorState: DraftEditorState = {
			wasteType: "Coolant",
			volume: "10",
			frequency: "",
			units: "gal/mo",
			clientId: "company-9",
			locationId: "location-9",
		};
		const candidate = mapEditorStateToDraftCandidate(
			"draft-item-3",
			"run-3",
			editorState,
		);

		expect(validateCandidateForConfirmation(candidate)).toEqual({});
	});

	it("prioritizes follow-up by stale age + missing-information type", () => {
		const complianceButFewFields = computeFollowUpPriority({
			...baseStream,
			id: "STR-COMPLIANCE",
			daysSinceLastActivity: 8,
			status: "missing_info",
			missingFields: ["SDS"],
		});

		const manyFieldsButGeneric = computeFollowUpPriority({
			...baseStream,
			id: "STR-GENERIC",
			daysSinceLastActivity: 8,
			status: "active",
			missingFields: ["One", "Two", "Three", "Four", "Five"],
		});

		expect(complianceButFewFields).toBe("high");
		expect(manyFieldsButGeneric).toBe("medium");
	});

	it("exposes Missing Information selected status and Open route", () => {
		const items = [
			{ ...baseStream, id: "STR-111", status: "blocked" as const },
			{ ...baseStream, id: "STR-442", status: "missing_info" as const },
		];
		const selectedItem = getSelectedFollowUpItem(items, "STR-442");
		const selected = {
			...baseStream,
			id: "STR-442",
			status: "missing_info" as const,
		};

		expect(selectedItem?.id).toBe("STR-442");
		expect(formatStreamStatus(selected.status)).toBe("missing info");
		expect(getFollowUpOpenHref(selected.id)).toBe("/streams/STR-442");
	});

	it("does not expose Archive bulk action in /streams", () => {
		const pageSource = readFileSync(
			join(process.cwd(), "app", "(agent)", "streams", "page.tsx"),
			"utf8",
		);

		expect(pageSource.includes("Archive (")).toBe(false);
		expect(pageSource.includes("handleArchiveSelected")).toBe(false);
		expect(pageSource.includes("<StreamsDraftConfirmation")).toBe(true);
		expect(pageSource.includes("onReview={handleReviewDraft}")).toBe(true);
	});

	it("uses shared draft confirmation modal flow on client detail drafts", () => {
		const pageSource = readFileSync(
			join(process.cwd(), "app", "(agent)", "clients", "[id]", "page.tsx"),
			"utf8",
		);

		expect(pageSource.includes("<StreamsDraftConfirmation")).toBe(true);
		expect(pageSource.includes("onReview={handleReviewDraft}")).toBe(true);
		expect(pageSource.includes("onConfirm={handleConfirmDraft}")).toBe(false);
	});

	it("summarizes delete-all draft API outcomes explicitly", () => {
		const outcomes: PromiseSettledResult<unknown>[] = [
			{ status: "fulfilled", value: undefined },
			{ status: "rejected", reason: new Error("boom") },
			{ status: "fulfilled", value: undefined },
		];

		expect(summarizeRejectAllDraftsResults(outcomes)).toEqual({
			total: 3,
			rejected: 2,
			failed: 1,
		});
	});
});
