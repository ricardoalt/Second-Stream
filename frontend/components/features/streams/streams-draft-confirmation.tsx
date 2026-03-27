"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	DraftConfirmationModal,
	useDraftConfirmationModal,
} from "@/components/features/discovery/draft-confirmation-modal";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import {
	buildCandidateReviewNotes,
	type CandidateEditableField,
	type CandidateValidationErrors,
	toDiscoveryNormalizedData,
	validateCandidateForConfirmation,
} from "@/lib/discovery-confirmation-utils";
import type { DraftItemRow } from "@/lib/types/dashboard";
import type { DraftCandidate } from "@/lib/types/discovery";
import { mapEditorStateToDraftCandidate } from "./runtime-helpers";
import type { DraftEditorState } from "./streams-drafts-table";

type StreamsDraftConfirmationProps = {
	draftItemRow: DraftItemRow | null;
	editorState: DraftEditorState | null;
	onClose: () => void;
};

function getFallbackEditorState(draftItemRow: DraftItemRow): DraftEditorState {
	return {
		wasteType: draftItemRow.streamName,
		processMethod: "",
		volume: draftItemRow.volumeSummary ?? "",
		units: "",
		clientId: draftItemRow.companyId ?? "",
		locationId:
			draftItemRow.target?.entrypointType === "location"
				? draftItemRow.target.entrypointId
				: "",
	};
}

export function StreamsDraftConfirmation({
	draftItemRow,
	editorState,
	onClose,
}: StreamsDraftConfirmationProps) {
	const hasTarget = draftItemRow !== null;
	const { open, setOpen } = useDraftConfirmationModal(hasTarget);
	const [candidates, setCandidates] = useState<DraftCandidate[]>([]);
	const [editingCandidateId, setEditingCandidateId] = useState<string | null>(
		null,
	);
	const [candidateErrors, setCandidateErrors] = useState<
		Record<string, CandidateValidationErrors>
	>({});
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const [isBulkConfirming, setIsBulkConfirming] = useState(false);

	const initialCandidate = useMemo(() => {
		if (!draftItemRow) {
			return null;
		}

		const sourceEditorState =
			editorState ?? getFallbackEditorState(draftItemRow);
		return mapEditorStateToDraftCandidate(
			draftItemRow.itemId,
			draftItemRow.runId,
			sourceEditorState,
		);
	}, [draftItemRow, editorState]);

	useEffect(() => {
		setOpen(hasTarget);
	}, [hasTarget, setOpen]);

	useEffect(() => {
		if (!initialCandidate) {
			setCandidates([]);
			setEditingCandidateId(null);
			setCandidateErrors({});
			setConfirmingId(null);
			setIsBulkConfirming(false);
			return;
		}

		setCandidates([initialCandidate]);
		setEditingCandidateId(initialCandidate.itemId);
		setCandidateErrors({});
		setConfirmingId(null);
		setIsBulkConfirming(false);
	}, [initialCandidate]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (!nextOpen) {
				onClose();
			}
		},
		[onClose, setOpen],
	);

	const handleCandidateFieldChange = useCallback(
		(itemId: string, field: CandidateEditableField, value: string) => {
			setCandidates((prev) =>
				prev.map((candidate) =>
					candidate.itemId === itemId
						? { ...candidate, [field]: value }
						: candidate,
				),
			);

			setCandidateErrors((prev) => {
				const nextErrors = { ...(prev[itemId] ?? {}) };
				delete nextErrors[field];
				return {
					...prev,
					[itemId]: nextErrors,
				};
			});
		},
		[],
	);

	const confirmCandidate = useCallback(async (candidate: DraftCandidate) => {
		const errors = validateCandidateForConfirmation(candidate);
		if (Object.keys(errors).length > 0) {
			setCandidateErrors((prev) => ({
				...prev,
				[candidate.itemId]: errors,
			}));
			return false;
		}

		setCandidateErrors((prev) => ({
			...prev,
			[candidate.itemId]: {},
		}));

		const payload: Parameters<typeof bulkImportAPI.decideDiscoveryDraft>[1] = {
			action: "confirm",
			normalizedData: toDiscoveryNormalizedData(candidate),
			reviewNotes: buildCandidateReviewNotes(candidate),
		};

		if (candidate.locationId) {
			payload.locationResolution = {
				mode: "existing",
				locationId: candidate.locationId,
			};
		}

		await bulkImportAPI.decideDiscoveryDraft(candidate.itemId, payload);
		return true;
	}, []);

	const handleConfirmCandidate = useCallback(
		async (itemId: string) => {
			const candidate = candidates.find((row) => row.itemId === itemId);
			if (!candidate) {
				return;
			}

			setConfirmingId(itemId);
			try {
				const confirmed = await confirmCandidate(candidate);
				if (!confirmed) {
					return;
				}
				onClose();
			} finally {
				setConfirmingId(null);
			}
		},
		[candidates, confirmCandidate, onClose],
	);

	const handleProcessFinalizeAll = useCallback(async () => {
		const pendingCandidates = candidates.filter(
			(candidate) => candidate.status === "pending",
		);
		if (pendingCandidates.length === 0) {
			onClose();
			return;
		}

		setIsBulkConfirming(true);
		try {
			for (const candidate of pendingCandidates) {
				const confirmed = await confirmCandidate(candidate);
				if (!confirmed) {
					return;
				}
			}
			onClose();
		} finally {
			setIsBulkConfirming(false);
		}
	}, [candidates, confirmCandidate, onClose]);

	if (!draftItemRow) {
		return null;
	}

	return (
		<DraftConfirmationModal
			open={open}
			onOpenChange={handleOpenChange}
			candidates={candidates}
			editingCandidateId={editingCandidateId}
			onEditCandidate={setEditingCandidateId}
			onCandidateFieldChange={handleCandidateFieldChange}
			onConfirmCandidate={handleConfirmCandidate}
			onProcessFinalizeAll={handleProcessFinalizeAll}
			candidateErrors={candidateErrors}
			confirmingId={confirmingId}
			disableActions={confirmingId !== null || isBulkConfirming}
			isBulkConfirming={isBulkConfirming}
		/>
	);
}
