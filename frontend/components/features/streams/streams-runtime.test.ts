import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	formatStreamStatus,
	getAllStreamsPrimaryActionLabel,
	getFollowUpOpenHref,
	getSelectedFollowUpItem,
	mapEditorStateToDraftCandidate,
	resolveOpenDraftState,
} from "@/components/features/streams/runtime-helpers";
import {
	applyDraftFieldUpdate,
	type DraftEditorState,
	validateDraft,
} from "@/components/features/streams/streams-drafts-table";
import type { StreamRow } from "@/components/features/streams/types";
import { validateCandidateForConfirmation } from "@/lib/discovery-confirmation-utils";
import type { DashboardCounts } from "@/lib/types/dashboard";
import { computeFollowUpPriority } from "@/lib/utils/compute-follow-up-priority";
import { computeWasteStreamsKpis } from "@/lib/utils/compute-waste-streams-kpis";

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

	it("routes Open Draft behavior to Drafts tab with highlighted row", () => {
		expect(resolveOpenDraftState("DRAFT-02")).toEqual({
			activeTab: "drafts",
			highlightedDraftId: "DRAFT-02",
		});
	});

	it("validates draft confirmation with required units", () => {
		const validDraft: DraftEditorState = {
			wasteType: "Spent Solvent",
			volume: "20",
			frequency: "Weekly",
			units: "tons/mo",
			clientId: "company-1",
			locationId: "location-1",
		};
		const invalidDraft: DraftEditorState = {
			...validDraft,
			frequency: "",
		};

		expect(validateDraft(validDraft)).toEqual({});
		expect(validateDraft(invalidDraft)).toEqual({
			frequency: "Frequency is required.",
		});
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

	it("requires frequency during canonical confirmation when missing", () => {
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

		expect(validateCandidateForConfirmation(candidate)).toEqual({
			frequency: "Frequency is required",
		});
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
	});
});
