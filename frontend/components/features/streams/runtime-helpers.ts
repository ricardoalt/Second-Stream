import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import type { DraftItemRow } from "@/lib/types/dashboard";
import type { DraftCandidate } from "@/lib/types/discovery";
import type { DraftEditorState } from "./streams-drafts-table";
import type { StreamRow } from "./types";

export type StreamsTab = "all" | "drafts" | "missing-info";

export interface RejectAllDraftsSummary {
	total: number;
	rejected: number;
	failed: number;
}

interface DraftRowRef {
	itemId: string;
}

export interface RejectSingleDraftOptions {
	draftId: string;
	draftRowsById: Record<string, DraftRowRef | undefined>;
	reviewNotes: string;
	setDeletingDraftIds: Dispatch<SetStateAction<Set<string>>>;
	clearHighlightedDraft: () => void;
	refreshStreams: () => void;
}

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

export function mapDraftRowToDraftCandidate(
	draftItemRow: DraftItemRow,
	editorState: DraftEditorState,
): DraftCandidate {
	const targetLocationId =
		draftItemRow.target?.entrypointType === "location"
			? draftItemRow.target.entrypointId
			: null;

	return {
		itemId: draftItemRow.itemId,
		runId: draftItemRow.runId,
		suggestedClientName: draftItemRow.suggestedCompanyLabel ?? null,
		suggestedClientConfidence: draftItemRow.suggestedClientConfidence ?? null,
		suggestedClientEvidence: draftItemRow.suggestedClientEvidence ?? [],
		aiSuggestedClientAccepted: false,
		suggestedLocationName: draftItemRow.suggestedLocationName ?? null,
		aiSuggestedLocationAccepted: false,
		suggestedLocationCity: draftItemRow.suggestedLocationCity ?? null,
		suggestedLocationState: draftItemRow.suggestedLocationState ?? null,
		suggestedLocationAddress: draftItemRow.suggestedLocationAddress ?? null,
		suggestedLocationConfidence:
			draftItemRow.suggestedLocationConfidence ?? null,
		suggestedLocationEvidence: draftItemRow.suggestedLocationEvidence ?? [],
		clientId: editorState.clientId || draftItemRow.companyId || null,
		locationId: editorState.locationId || targetLocationId || null,
		locationResolutionHint:
			draftItemRow.locationLabel || targetLocationId
				? "none"
				: draftItemRow.suggestedLocationName ||
						draftItemRow.suggestedLocationCity ||
						draftItemRow.suggestedLocationState ||
						draftItemRow.suggestedLocationAddress
					? "suggested"
					: "missing",
		locationSuggestionLabel:
			draftItemRow.suggestedLocationName ?? draftItemRow.locationLabel ?? null,
		material: editorState.wasteType,
		volume: editorState.volume || null,
		frequency: editorState.frequency || null,
		units: editorState.units || null,
		locationLabel:
			draftItemRow.locationLabel ?? draftItemRow.suggestedLocationName ?? null,
		source: draftItemRow.sourceFilename ?? "Waste Streams Drafts",
		confidence: draftItemRow.confidence,
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

export function summarizeRejectAllDraftsResults(
	results: PromiseSettledResult<unknown>[],
): RejectAllDraftsSummary {
	const rejected = results.filter(
		(result) => result.status === "fulfilled",
	).length;
	const failed = results.length - rejected;

	return {
		total: results.length,
		rejected,
		failed,
	};
}

export async function rejectSingleDraftWithConfirmation({
	draftId,
	draftRowsById,
	reviewNotes,
	setDeletingDraftIds,
	clearHighlightedDraft,
	refreshStreams,
}: RejectSingleDraftOptions): Promise<void> {
	const draft = draftRowsById[draftId];
	if (!draft) {
		return;
	}

	const confirmed = window.confirm(
		"Discard this draft? This action cannot be undone.",
	);
	if (!confirmed) {
		return;
	}

	setDeletingDraftIds((prev) => new Set(prev).add(draftId));
	clearHighlightedDraft();

	try {
		await bulkImportAPI.decideDiscoveryDraft(draft.itemId, {
			action: "reject",
			reviewNotes,
		});
		toast.success("Draft discarded");
		refreshStreams();
	} catch (error) {
		toast.error(
			error instanceof Error ? error.message : "Failed to discard draft",
		);
	} finally {
		setDeletingDraftIds((prev) => {
			const next = new Set(prev);
			next.delete(draftId);
			return next;
		});
	}
}
