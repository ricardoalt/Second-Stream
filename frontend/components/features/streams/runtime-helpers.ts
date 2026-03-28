import type { DraftCandidate } from "@/lib/types/discovery";
import type { DraftEditorState } from "./streams-drafts-table";
import type { StreamRow } from "./types";

export type StreamsTab = "all" | "drafts" | "missing-info";

export function getAllStreamsPrimaryActionLabel(
	row: StreamRow,
): "Open" | "Open Draft" {
	return row.status === "draft" ? "Open Draft" : "Open";
}

export function formatStreamStatus(status: StreamRow["status"]): string {
	return status.replaceAll("_", " ");
}

export function getFollowUpOpenHref(id: string): string {
	return `/streams/${id}`;
}

export function resolveOpenDraftState(id: string): {
	activeTab: StreamsTab;
	highlightedDraftId: string;
} {
	return {
		activeTab: "drafts",
		highlightedDraftId: id,
	};
}

export function mapEditorStateToDraftCandidate(
	itemId: string,
	runId: string,
	editorState: DraftEditorState,
): DraftCandidate {
	return {
		itemId,
		runId,
		clientId: editorState.clientId || null,
		locationId: editorState.locationId || null,
		material: editorState.wasteType,
		volume: editorState.volume || null,
		frequency: editorState.frequency || null,
		units: editorState.units || null,
		locationLabel: null,
		source: "Waste Streams Drafts",
		confidence: null,
		status: "pending",
	};
}

export function getSelectedFollowUpItem(
	items: StreamRow[],
	selectedId: string | null,
): StreamRow | null {
	if (!selectedId) {
		return null;
	}

	return items.find((item) => item.id === selectedId) ?? null;
}
