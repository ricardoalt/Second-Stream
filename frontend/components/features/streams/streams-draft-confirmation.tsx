"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	DraftConfirmationModal,
	useDraftConfirmationModal,
} from "@/components/features/discovery/draft-confirmation-modal";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import {
	buildCandidateReviewNotes,
	type CandidateEditableField,
	type CandidateValidationErrors,
	resolveCandidatesAfterFieldChange,
	resolveDiscoveryDecisionResolutions,
	toDiscoveryNormalizedData,
	validateCandidateForConfirmation,
} from "@/lib/discovery-confirmation-utils";
import type { DraftItemRow } from "@/lib/types/dashboard";
import type { DraftCandidate } from "@/lib/types/discovery";
import { mapDraftRowToDraftCandidate } from "./runtime-helpers";
import type { DraftEditorState } from "./streams-drafts-table";

type StreamsDraftConfirmationProps = {
	draftItemRow: DraftItemRow | null;
	editorState: DraftEditorState | null;
	onClose: () => void;
	onConfirmed?: () => void;
};

function getFallbackEditorState(draftItemRow: DraftItemRow): DraftEditorState {
	return {
		wasteType: draftItemRow.streamName,
		volume: draftItemRow.volume ?? draftItemRow.volumeSummary ?? "",
		frequency: draftItemRow.frequency ?? "",
		units: draftItemRow.units ?? "",
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
	onConfirmed,
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
	const [submissionError, setSubmissionError] = useState<string | null>(null);

	const initialCandidate = useMemo(() => {
		if (!draftItemRow) {
			return null;
		}

		const sourceEditorState =
			editorState ?? getFallbackEditorState(draftItemRow);
		return mapDraftRowToDraftCandidate(draftItemRow, sourceEditorState);
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
			setSubmissionError(null);
			return;
		}

		setCandidates([initialCandidate]);
		setEditingCandidateId(initialCandidate.itemId);
		setCandidateErrors({});
		setConfirmingId(null);
		setIsBulkConfirming(false);
		setSubmissionError(null);
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
				resolveCandidatesAfterFieldChange({
					candidates: prev,
					itemId,
					field,
					value,
				}),
			);

			setCandidateErrors((prev) => {
				const nextErrors = { ...(prev[itemId] ?? {}) };
				delete nextErrors[field];
				return {
					...prev,
					[itemId]: nextErrors,
				};
			});
			setSubmissionError(null);
		},
		[],
	);

	const confirmCandidate = useCallback(async (candidate: DraftCandidate) => {
		setSubmissionError(null);
		const errors = validateCandidateForConfirmation(candidate);
		if (Object.keys(errors).length > 0) {
			setCandidateErrors((prev) => ({
				...prev,
				[candidate.itemId]: errors,
			}));
			setEditingCandidateId(candidate.itemId);
			setSubmissionError(
				"Complete client, location, and required fields before confirming.",
			);
			toast.error("Complete required fields before confirming stream");
			return false;
		}

		setCandidateErrors((prev) => ({
			...prev,
			[candidate.itemId]: {},
		}));

		try {
			const resolutions = resolveDiscoveryDecisionResolutions({
				candidate,
			});
			const payload: Parameters<typeof bulkImportAPI.decideDiscoveryDraft>[1] =
				{
					action: "confirm",
					normalizedData: toDiscoveryNormalizedData(candidate),
					reviewNotes: buildCandidateReviewNotes(candidate),
					...resolutions,
				};

			await bulkImportAPI.decideDiscoveryDraft(candidate.itemId, payload);
			return true;
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Could not confirm this draft. Please try again.";
			setSubmissionError(message);
			toast.error(message);
			return false;
		}
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
				onConfirmed?.();
				onClose();
			} finally {
				setConfirmingId(null);
			}
		},
		[candidates, confirmCandidate, onClose, onConfirmed],
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
			let didConfirmAny = false;
			for (const candidate of pendingCandidates) {
				const confirmed = await confirmCandidate(candidate);
				if (!confirmed) {
					return;
				}
				didConfirmAny = true;
			}
			if (didConfirmAny) {
				onConfirmed?.();
			}
			onClose();
		} finally {
			setIsBulkConfirming(false);
		}
	}, [candidates, confirmCandidate, onClose, onConfirmed]);

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
			globalError={submissionError}
			confirmingId={confirmingId}
			disableActions={confirmingId !== null || isBulkConfirming}
			isBulkConfirming={isBulkConfirming}
			reviewPresentation="single"
		/>
	);
}
