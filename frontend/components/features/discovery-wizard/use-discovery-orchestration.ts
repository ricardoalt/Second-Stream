"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import { fetchCandidates } from "@/lib/api/dashboard";
import { discoverySessionsAPI } from "@/lib/api/discovery-sessions";
import {
	buildCandidateReviewNotes,
	type CandidateEditableField,
	type CandidateValidationErrors,
	toDiscoveryNormalizedData,
	validateCandidateForConfirmation,
} from "@/lib/discovery-confirmation-utils";
import type { DraftItemRow } from "@/lib/types/dashboard";
import type {
	DiscoverySessionResult,
	DraftCandidate,
} from "@/lib/types/discovery";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;
const TERMINAL_STATUSES = new Set([
	"review_ready",
	"partial_failure",
	"failed",
]);

export type WizardPhase =
	| "idle"
	| "submitting"
	| "processing"
	| "no-results"
	| "review"
	| "confirming"
	| "complete"
	| "error";

interface ReviewSummary {
	confirmed: number;
	skipped: number;
	total: number;
}

interface FinalizeAllResult {
	updatedCandidates: DraftCandidate[];
	validationById: Record<string, CandidateValidationErrors>;
	confirmedIds: string[];
}

interface StartDiscoveryParams {
	companyId: string;
	locationId: string;
	files: File[];
	audioFile: File | null;
	text: string;
}

interface UseDiscoveryOrchestrationOptions {
	open: boolean;
	mapCandidateRows: (
		rows: DraftItemRow[],
		defaultClientId: string | null,
		defaultLocationId: string | null,
	) => DraftCandidate[];
	shouldRouteToNoResults: (params: {
		draftsNeedingConfirmation: number;
		mappedCandidatesCount: number;
	}) => boolean;
	confirmTerminalDiscoverySnapshot: (args: {
		sessionId: string;
		terminalSession: DiscoverySessionResult;
		getSession: (sessionId: string) => Promise<DiscoverySessionResult>;
	}) => Promise<DiscoverySessionResult>;
}

export function resolveProcessingTerminalRoute(params: {
	status: DiscoverySessionResult["status"];
	draftsNeedingConfirmation: number;
	mappedCandidatesCount: number;
}): { phase: WizardPhase; openCandidateModal: boolean } {
	const { status, draftsNeedingConfirmation, mappedCandidatesCount } = params;

	if (status === "failed") {
		return { phase: "error", openCandidateModal: false };
	}

	if (draftsNeedingConfirmation > 0 && mappedCandidatesCount > 0) {
		return { phase: "review", openCandidateModal: true };
	}

	return { phase: "no-results", openCandidateModal: false };
}

function reviewCounts(candidates: DraftCandidate[]): ReviewSummary {
	const confirmed = candidates.filter(
		(item) => item.status === "confirmed",
	).length;
	const skipped = candidates.filter((item) => item.status === "skipped").length;
	return { confirmed, skipped, total: candidates.length };
}

function resolveLocationResolution(params: {
	candidateLocationId: string | null;
	defaultLocationId: string;
}): { mode: "existing"; locationId: string } | undefined {
	const { candidateLocationId, defaultLocationId } = params;
	const resolvedLocationId = candidateLocationId ?? defaultLocationId ?? null;
	if (!resolvedLocationId) {
		return undefined;
	}

	return { mode: "existing", locationId: resolvedLocationId };
}

async function confirmCandidateDecision(params: {
	candidate: DraftCandidate;
	defaultLocationId: string;
}): Promise<CandidateValidationErrors> {
	const { candidate, defaultLocationId } = params;
	const validationErrors = validateCandidateForConfirmation(candidate);
	if (Object.keys(validationErrors).length > 0) {
		return validationErrors;
	}

	const decisionPayload: Parameters<
		typeof bulkImportAPI.decideDiscoveryDraft
	>[1] = {
		action: "confirm",
		normalizedData: toDiscoveryNormalizedData(candidate),
		reviewNotes: buildCandidateReviewNotes(candidate),
	};
	const locationResolution = resolveLocationResolution({
		candidateLocationId: candidate.locationId,
		defaultLocationId,
	});
	if (locationResolution) {
		decisionPayload.locationResolution = locationResolution;
	}

	await bulkImportAPI.decideDiscoveryDraft(candidate.itemId, decisionPayload);
	return {};
}

async function processFinalizeAllCandidates(params: {
	candidates: DraftCandidate[];
	defaultLocationId: string;
}): Promise<FinalizeAllResult> {
	const { candidates, defaultLocationId } = params;
	const pendingCandidates = candidates.filter(
		(candidate) => candidate.status === "pending",
	);
	const validationById: Record<string, CandidateValidationErrors> = {};
	const validPending = pendingCandidates.filter((candidate) => {
		const errors = validateCandidateForConfirmation(candidate);
		if (Object.keys(errors).length > 0) {
			validationById[candidate.itemId] = errors;
			return false;
		}
		return true;
	});

	const confirmedIds: string[] = [];

	await Promise.all(
		validPending.map(async (candidate) => {
			const decisionPayload: Parameters<
				typeof bulkImportAPI.decideDiscoveryDraft
			>[1] = {
				action: "confirm",
				normalizedData: toDiscoveryNormalizedData(candidate),
				reviewNotes: buildCandidateReviewNotes(candidate),
			};
			const locationResolution = resolveLocationResolution({
				candidateLocationId: candidate.locationId,
				defaultLocationId,
			});
			if (locationResolution) {
				decisionPayload.locationResolution = locationResolution;
			}

			await bulkImportAPI.decideDiscoveryDraft(
				candidate.itemId,
				decisionPayload,
			);
			confirmedIds.push(candidate.itemId);
		}),
	);

	const confirmedSet = new Set(confirmedIds);
	const updatedCandidates = candidates.map((candidate) => {
		if (confirmedSet.has(candidate.itemId)) {
			return { ...candidate, status: "confirmed" as const };
		}
		if (candidate.status === "pending") {
			return { ...candidate, status: "skipped" as const };
		}
		return candidate;
	});

	return { updatedCandidates, validationById, confirmedIds };
}

export function useDiscoveryOrchestration(
	options: UseDiscoveryOrchestrationOptions,
) {
	const {
		open,
		mapCandidateRows,
		shouldRouteToNoResults,
		confirmTerminalDiscoverySnapshot,
	} = options;

	const [phase, setPhase] = useState<WizardPhase>("idle");
	const [result, setResult] = useState<DiscoverySessionResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [candidates, setCandidates] = useState<DraftCandidate[]>([]);
	const [candidateModalOpen, setCandidateModalOpen] = useState(false);
	const [editingCandidateId, setEditingCandidateId] = useState<string | null>(
		null,
	);
	const [showDraftCloseWarning, setShowDraftCloseWarning] = useState(false);
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const [isBulkConfirming, setIsBulkConfirming] = useState(false);
	const [candidateErrors, setCandidateErrors] = useState<
		Record<string, CandidateValidationErrors>
	>({});
	const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(
		null,
	);
	const [defaultLocationId, setDefaultLocationId] = useState("");

	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pollStartRef = useRef(0);
	const terminalConfirmingRef = useRef(false);

	const pendingCandidatesCount = useMemo(
		() =>
			candidates.filter((candidate) => candidate.status === "pending").length,
		[candidates],
	);
	const isCandidateMutationInFlight = confirmingId !== null || isBulkConfirming;
	const isBlocking =
		phase === "submitting" || phase === "processing" || phase === "confirming";

	const resetState = useCallback(() => {
		setPhase("idle");
		setResult(null);
		setError(null);
		setCandidates([]);
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		setShowDraftCloseWarning(false);
		setConfirmingId(null);
		setIsBulkConfirming(false);
		setCandidateErrors({});
		setReviewSummary(null);
		terminalConfirmingRef.current = false;
	}, []);

	useEffect(() => {
		if (open) {
			return;
		}

		const timeout = setTimeout(() => {
			resetState();
		}, 200);

		return () => clearTimeout(timeout);
	}, [open, resetState]);

	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
			terminalConfirmingRef.current = false;
		};
	}, []);

	const startPolling = useCallback(
		(sessionId: string, companyId: string, locationId: string) => {
			setPhase("processing");
			pollStartRef.current = Date.now();
			terminalConfirmingRef.current = false;

			pollIntervalRef.current = setInterval(async () => {
				try {
					const session = await discoverySessionsAPI.getSession(sessionId);

					if (TERMINAL_STATUSES.has(session.status)) {
						if (terminalConfirmingRef.current) {
							return;
						}
						terminalConfirmingRef.current = true;
						const finalSession = await confirmTerminalDiscoverySnapshot({
							sessionId,
							terminalSession: session,
							getSession: discoverySessionsAPI.getSession,
						});

						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
						}

						if (finalSession.status === "failed") {
							setError(finalSession.processingError ?? "Processing failed");
							setPhase("error");
							return;
						}

						setResult(finalSession);
						if (finalSession.summary.draftsNeedingConfirmation > 0) {
							try {
								const rows = await fetchCandidates(sessionId);
								const mapped = mapCandidateRows(rows, companyId, locationId);
								const route = resolveProcessingTerminalRoute({
									status: finalSession.status,
									draftsNeedingConfirmation:
										finalSession.summary.draftsNeedingConfirmation,
									mappedCandidatesCount: mapped.length,
								});
								if (route.phase === "review") {
									setCandidates(mapped);
									setPhase(route.phase);
									setCandidateModalOpen(route.openCandidateModal);
									return;
								}
								setPhase(route.phase);
								setCandidateModalOpen(route.openCandidateModal);
								return;
							} catch {
								toast.error("Could not load draft candidates for review");
								setPhase("error");
								setError("Could not load draft candidates for review");
								return;
							}
						}

						if (
							shouldRouteToNoResults({
								draftsNeedingConfirmation:
									finalSession.summary.draftsNeedingConfirmation,
								mappedCandidatesCount: 0,
							})
						) {
							setPhase("no-results");
						}
						return;
					}

					if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
						}
						setError(
							"Processing is taking longer than expected. Please try again.",
						);
						setPhase("error");
					}
				} catch (pollError) {
					if (pollIntervalRef.current) {
						clearInterval(pollIntervalRef.current);
						pollIntervalRef.current = null;
					}

					setError(
						pollError instanceof Error
							? pollError.message
							: "Failed to check processing status",
					);
					setPhase("error");
				}
			}, POLL_INTERVAL_MS);
		},
		[
			confirmTerminalDiscoverySnapshot,
			mapCandidateRows,
			shouldRouteToNoResults,
		],
	);

	const startDiscovery = useCallback(
		async (params: StartDiscoveryParams) => {
			const { companyId, locationId, files, audioFile, text } = params;
			setDefaultLocationId(locationId);
			const trimmedText = text.trim();
			const hasValidTextSource = trimmedText.length >= 20;

			setPhase("submitting");
			setError(null);

			try {
				const session = await discoverySessionsAPI.create(companyId);
				const sessionId = session.id;

				const uploads: Promise<unknown>[] = [];
				for (const file of files) {
					uploads.push(discoverySessionsAPI.uploadFile(sessionId, file));
				}
				if (audioFile) {
					uploads.push(discoverySessionsAPI.uploadAudio(sessionId, audioFile));
				}
				if (hasValidTextSource) {
					uploads.push(discoverySessionsAPI.addText(sessionId, trimmedText));
				}

				await Promise.all(uploads);
				await discoverySessionsAPI.start(sessionId);
				startPolling(sessionId, companyId, locationId);
			} catch (startError) {
				setError(
					startError instanceof Error
						? startError.message
						: "Failed to start discovery",
				);
				setPhase("error");
			}
		},
		[startPolling],
	);

	const handleTryAgain = useCallback(() => {
		resetState();
	}, [resetState]);

	const handleCreateManually = useCallback(() => {
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		setCandidateErrors({});
		setShowDraftCloseWarning(false);
		setPhase("idle");
	}, []);

	const handleCandidateFieldChange = useCallback(
		(itemId: string, field: CandidateEditableField, value: string) => {
			setCandidates((prev) =>
				prev.map((candidate) =>
					candidate.itemId === itemId
						? {
								...candidate,
								[field]: value,
							}
						: candidate,
				),
			);
			setCandidateErrors((current) => {
				if (!(itemId in current)) {
					return current;
				}
				const next = { ...current };
				delete next[itemId];
				return next;
			});
		},
		[],
	);

	const handleConfirmCandidate = useCallback(
		async (itemId: string) => {
			if (isCandidateMutationInFlight) {
				return;
			}

			const candidate = candidates.find((item) => item.itemId === itemId);
			if (!candidate || candidate.status !== "pending") {
				return;
			}

			const validationErrors = validateCandidateForConfirmation(candidate);
			if (Object.keys(validationErrors).length > 0) {
				setCandidateErrors((current) => ({
					...current,
					[itemId]: validationErrors,
				}));
				setEditingCandidateId(itemId);
				toast.error("Complete required fields before confirming candidate");
				return;
			}

			setConfirmingId(itemId);
			try {
				await confirmCandidateDecision({ candidate, defaultLocationId });
				setCandidates((prev) =>
					prev.map((item) =>
						item.itemId === itemId ? { ...item, status: "confirmed" } : item,
					),
				);
				setCandidateErrors((current) => {
					if (!(itemId in current)) {
						return current;
					}
					const next = { ...current };
					delete next[itemId];
					return next;
				});
				setEditingCandidateId((current) =>
					current === itemId ? null : current,
				);
			} catch (confirmError) {
				toast.error(
					confirmError instanceof Error
						? confirmError.message
						: "Failed to confirm stream",
				);
			} finally {
				setConfirmingId(null);
			}
		},
		[candidates, defaultLocationId, isCandidateMutationInFlight],
	);

	const handleCandidateModalOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) {
				setCandidateModalOpen(true);
				setPhase("review");
				return;
			}

			if (pendingCandidatesCount > 0) {
				setShowDraftCloseWarning(true);
				return;
			}

			setCandidateModalOpen(false);
			setEditingCandidateId(null);
			setReviewSummary(reviewCounts(candidates));
			setPhase("complete");
		},
		[candidates, pendingCandidatesCount],
	);

	const handleProcessFinalizeAll = useCallback(async () => {
		if (isCandidateMutationInFlight) {
			return;
		}

		const currentCandidates = [...candidates];
		const unresolvedCount = currentCandidates.filter(
			(candidate) => candidate.status === "pending",
		).length;

		if (unresolvedCount === 0) {
			const finalized = currentCandidates.map((candidate) =>
				candidate.status === "pending"
					? { ...candidate, status: "skipped" as const }
					: candidate,
			);
			setCandidates(finalized);
			setReviewSummary(reviewCounts(finalized));
			setCandidateModalOpen(false);
			setEditingCandidateId(null);
			setCandidateErrors({});
			setPhase("complete");
			return;
		}

		setIsBulkConfirming(true);
		let outcome: FinalizeAllResult | null = null;

		try {
			outcome = await processFinalizeAllCandidates({
				candidates: currentCandidates,
				defaultLocationId,
			});
		} catch (finalizeError) {
			toast.error(
				finalizeError instanceof Error
					? finalizeError.message
					: "Failed to finalize all pending candidates",
			);
		} finally {
			setIsBulkConfirming(false);
		}

		if (!outcome) {
			return;
		}

		if (Object.keys(outcome.validationById).length > 0) {
			setCandidateErrors((current) => ({
				...current,
				...outcome.validationById,
			}));
		}

		setCandidates(outcome.updatedCandidates);
		setReviewSummary(reviewCounts(outcome.updatedCandidates));
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		setCandidateErrors({});
		setPhase("complete");
	}, [candidates, defaultLocationId, isCandidateMutationInFlight]);

	const handleConfirmKeepDrafts = useCallback(() => {
		setShowDraftCloseWarning(false);
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		const finalizedCandidates = candidates.map((candidate) =>
			candidate.status === "pending"
				? { ...candidate, status: "skipped" as const }
				: candidate,
		);
		setCandidates(finalizedCandidates);
		setReviewSummary(reviewCounts(finalizedCandidates));
		setPhase("complete");
	}, [candidates]);

	return {
		phase,
		result,
		error,
		candidates,
		candidateModalOpen,
		editingCandidateId,
		showDraftCloseWarning,
		confirmingId,
		isBulkConfirming,
		candidateErrors,
		reviewSummary,
		isCandidateMutationInFlight,
		isBlocking,
		setShowDraftCloseWarning,
		setEditingCandidateId,
		startDiscovery,
		handleTryAgain,
		handleCreateManually,
		handleCandidateFieldChange,
		handleConfirmCandidate,
		handleCandidateModalOpenChange,
		handleProcessFinalizeAll,
		handleConfirmKeepDrafts,
	};
}
