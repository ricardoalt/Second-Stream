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
const DISCOVERY_RESUME_STORAGE_KEY = "discovery-wizard-resume-session";
const DISCOVERY_RESUME_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES = new Set([
	"review_ready",
	"partial_failure",
	"failed",
]);

type ResumeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface PersistedDiscoveryResumeState {
	sessionId: string;
	companyId: string;
	locationId: string;
	assignedOwnerUserId: string | null;
	savedAt: number;
}

export type DiscoveryResumeMode = "processing" | "review" | "terminal";

interface DiscoveryResumeNotice {
	sessionId: string;
	companyId: string;
	locationId: string;
	assignedOwnerUserId: string | null;
	status: DiscoverySessionResult["status"];
	mode: DiscoveryResumeMode;
	title: string;
	description: string;
	actionLabel: string | null;
}

function isResumeStorageCandidate(
	value: unknown,
): value is PersistedDiscoveryResumeState {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<PersistedDiscoveryResumeState>;
	return (
		typeof candidate.sessionId === "string" &&
		candidate.sessionId.length > 0 &&
		typeof candidate.companyId === "string" &&
		candidate.companyId.length > 0 &&
		typeof candidate.locationId === "string" &&
		candidate.locationId.length > 0 &&
		(candidate.assignedOwnerUserId === null ||
			typeof candidate.assignedOwnerUserId === "string") &&
		typeof candidate.savedAt === "number"
	);
}

function resolveStorage(storage?: ResumeStorage): ResumeStorage | null {
	if (storage) {
		return storage;
	}

	if (typeof window === "undefined") {
		return null;
	}

	return window.localStorage;
}

export function persistDiscoveryResumeState(
	state: Omit<PersistedDiscoveryResumeState, "savedAt">,
	storage?: ResumeStorage,
): void {
	const resolvedStorage = resolveStorage(storage);
	if (!resolvedStorage) {
		return;
	}

	try {
		resolvedStorage.setItem(
			DISCOVERY_RESUME_STORAGE_KEY,
			JSON.stringify({ ...state, savedAt: Date.now() }),
		);
	} catch {
		// Ignore storage failures to avoid blocking the wizard.
	}
}

export function clearDiscoveryResumeState(storage?: ResumeStorage): void {
	const resolvedStorage = resolveStorage(storage);
	if (!resolvedStorage) {
		return;
	}

	try {
		resolvedStorage.removeItem(DISCOVERY_RESUME_STORAGE_KEY);
	} catch {
		// Ignore storage failures to avoid blocking the wizard.
	}
}

export function loadDiscoveryResumeState(
	storage?: ResumeStorage,
	maxAgeMs: number = DISCOVERY_RESUME_MAX_AGE_MS,
): PersistedDiscoveryResumeState | null {
	const resolvedStorage = resolveStorage(storage);
	if (!resolvedStorage) {
		return null;
	}

	try {
		const raw = resolvedStorage.getItem(DISCOVERY_RESUME_STORAGE_KEY);
		if (!raw) {
			return null;
		}

		const parsed: unknown = JSON.parse(raw);
		if (!isResumeStorageCandidate(parsed)) {
			clearDiscoveryResumeState(resolvedStorage);
			return null;
		}

		if (Date.now() - parsed.savedAt > maxAgeMs) {
			clearDiscoveryResumeState(resolvedStorage);
			return null;
		}

		return parsed;
	} catch {
		clearDiscoveryResumeState(resolvedStorage);
		return null;
	}
}

export function resolveDiscoveryResumeMode(params: {
	status: DiscoverySessionResult["status"];
	draftsNeedingConfirmation: number;
}): DiscoveryResumeMode {
	const { status, draftsNeedingConfirmation } = params;

	if (status === "review_ready" || status === "partial_failure") {
		return draftsNeedingConfirmation > 0 ? "review" : "terminal";
	}

	if (status === "failed") {
		return "terminal";
	}

	return "processing";
}

export function resolveDiscoveryResumeNotice(params: {
	session: DiscoverySessionResult;
	persisted: PersistedDiscoveryResumeState;
}): DiscoveryResumeNotice {
	const { session, persisted } = params;
	const mode = resolveDiscoveryResumeMode({
		status: session.status,
		draftsNeedingConfirmation: session.summary.draftsNeedingConfirmation,
	});

	if (mode === "processing") {
		return {
			sessionId: persisted.sessionId,
			companyId: persisted.companyId,
			locationId: persisted.locationId,
			assignedOwnerUserId: persisted.assignedOwnerUserId,
			status: session.status,
			mode,
			title: "Resume previous discovery session?",
			description:
				"Your previous discovery is still running. Resume to continue tracking progress.",
			actionLabel: "Resume status",
		};
	}

	if (mode === "review") {
		return {
			sessionId: persisted.sessionId,
			companyId: persisted.companyId,
			locationId: persisted.locationId,
			assignedOwnerUserId: persisted.assignedOwnerUserId,
			status: session.status,
			mode,
			title: "Resume candidate review?",
			description:
				"A recent discovery session has drafts ready for confirmation.",
			actionLabel: "Resume review",
		};
	}

	return {
		sessionId: persisted.sessionId,
		companyId: persisted.companyId,
		locationId: persisted.locationId,
		assignedOwnerUserId: persisted.assignedOwnerUserId,
		status: session.status,
		mode,
		title: "Previous discovery session found",
		description:
			"That session is already complete and has nothing left to review. You can dismiss this reminder.",
		actionLabel: null,
	};
}

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

interface StartDiscoveryParams {
	companyId: string;
	locationId: string;
	assignedOwnerUserId: string | null;
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

type DecideDiscoveryDraftFn =
	typeof import("@/lib/api/bulk-import").bulkImportAPI["decideDiscoveryDraft"];

export const REJECT_CANDIDATE_CONFIRMATION_MESSAGE =
	"Discard this draft stream? This will remove it from this review.";

export function shouldProceedWithCandidateAction(params: {
	action: "confirm" | "reject";
	confirm: (message: string) => boolean;
}): boolean {
	const { action, confirm } = params;
	if (action === "confirm") {
		return true;
	}

	return confirm(REJECT_CANDIDATE_CONFIRMATION_MESSAGE);
}

export async function rejectCandidateDecision(params: {
	itemId: string;
	decideDiscoveryDraft?: DecideDiscoveryDraftFn;
}): Promise<void> {
	const { itemId, decideDiscoveryDraft = bulkImportAPI.decideDiscoveryDraft } =
		params;

	await decideDiscoveryDraft(itemId, {
		action: "reject",
		reviewNotes: "rejected_via_discovery_wizard",
	});
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
	const [assignedOwnerUserId, setAssignedOwnerUserId] = useState<string | null>(
		null,
	);
	const [resumeNotice, setResumeNotice] =
		useState<DiscoveryResumeNotice | null>(null);
	const [checkingResumeState, setCheckingResumeState] = useState(false);

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
		setAssignedOwnerUserId(null);
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
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
			setPhase("processing");
			setResumeNotice(null);
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
							clearDiscoveryResumeState();
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
							clearDiscoveryResumeState();
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
			const {
				companyId,
				locationId,
				assignedOwnerUserId: selectedOwnerUserId,
				files,
				audioFile,
				text,
			} = params;
			setDefaultLocationId(locationId);
			setAssignedOwnerUserId(selectedOwnerUserId);
			const trimmedText = text.trim();
			const hasValidTextSource = trimmedText.length >= 20;

			setPhase("submitting");
			setError(null);

			try {
				const session = await discoverySessionsAPI.create(
					companyId,
					selectedOwnerUserId ?? undefined,
				);
				const sessionId = session.id;
				persistDiscoveryResumeState({
					sessionId,
					companyId,
					locationId,
					assignedOwnerUserId: selectedOwnerUserId,
				});

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

	useEffect(() => {
		if (!open || phase !== "idle") {
			return;
		}

		const persisted = loadDiscoveryResumeState();
		if (!persisted) {
			setResumeNotice(null);
			return;
		}

		let isCancelled = false;
		setCheckingResumeState(true);

		void discoverySessionsAPI
			.getSession(persisted.sessionId)
			.then((session) => {
				if (isCancelled) {
					return;
				}

				setResumeNotice(
					resolveDiscoveryResumeNotice({
						session,
						persisted,
					}),
				);
			})
			.catch(() => {
				clearDiscoveryResumeState();
				if (!isCancelled) {
					setResumeNotice(null);
				}
			})
			.finally(() => {
				if (!isCancelled) {
					setCheckingResumeState(false);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [open, phase]);

	const dismissResumeNotice = useCallback(() => {
		clearDiscoveryResumeState();
		setResumeNotice(null);
	}, []);

	const resumeDiscoverySession = useCallback(async () => {
		if (!resumeNotice) {
			return;
		}

		if (resumeNotice.mode === "terminal") {
			dismissResumeNotice();
			return;
		}

		setError(null);
		setDefaultLocationId(resumeNotice.locationId);
		setAssignedOwnerUserId(resumeNotice.assignedOwnerUserId);

		if (resumeNotice.mode === "processing") {
			startPolling(
				resumeNotice.sessionId,
				resumeNotice.companyId,
				resumeNotice.locationId,
			);
			return;
		}

		try {
			const session = await discoverySessionsAPI.getSession(
				resumeNotice.sessionId,
			);
			const mode = resolveDiscoveryResumeMode({
				status: session.status,
				draftsNeedingConfirmation: session.summary.draftsNeedingConfirmation,
			});

			if (mode === "processing") {
				startPolling(
					resumeNotice.sessionId,
					resumeNotice.companyId,
					resumeNotice.locationId,
				);
				return;
			}

			if (mode === "terminal") {
				setResumeNotice(
					resolveDiscoveryResumeNotice({
						session,
						persisted: {
							sessionId: resumeNotice.sessionId,
							companyId: resumeNotice.companyId,
							locationId: resumeNotice.locationId,
							assignedOwnerUserId: resumeNotice.assignedOwnerUserId,
							savedAt: Date.now(),
						},
					}),
				);
				return;
			}

			const rows = await fetchCandidates(resumeNotice.sessionId);
			const mapped = mapCandidateRows(
				rows,
				resumeNotice.companyId,
				resumeNotice.locationId,
			);
			const route = resolveProcessingTerminalRoute({
				status: session.status,
				draftsNeedingConfirmation: session.summary.draftsNeedingConfirmation,
				mappedCandidatesCount: mapped.length,
			});

			setResult(session);
			setResumeNotice(null);
			if (route.phase === "review") {
				setCandidates(mapped);
			}
			setPhase(route.phase);
			setCandidateModalOpen(route.openCandidateModal);
		} catch (resumeError) {
			setError(
				resumeError instanceof Error
					? resumeError.message
					: "Failed to resume discovery session",
			);
			setPhase("error");
		}
	}, [dismissResumeNotice, mapCandidateRows, resumeNotice, startPolling]);

	const handleTryAgain = useCallback(() => {
		resetState();
	}, [resetState]);

	const handleCreateManually = useCallback(() => {
		clearDiscoveryResumeState();
		setResumeNotice(null);
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
				const locationResolution = resolveLocationResolution({
					candidateLocationId: candidate.locationId,
					defaultLocationId,
				});
				await bulkImportAPI.decideDiscoveryDraft(candidate.itemId, {
					action: "confirm",
					normalizedData: toDiscoveryNormalizedData(candidate),
					reviewNotes: buildCandidateReviewNotes(candidate),
					...(locationResolution ? { locationResolution } : {}),
					...(assignedOwnerUserId ? { ownerUserId: assignedOwnerUserId } : {}),
				});
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
		[
			candidates,
			defaultLocationId,
			isCandidateMutationInFlight,
			assignedOwnerUserId,
		],
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
			clearDiscoveryResumeState();
			setPhase("complete");
		},
		[candidates, pendingCandidatesCount],
	);

	const handleRejectCandidate = useCallback(
		async (itemId: string) => {
			if (isCandidateMutationInFlight) {
				return;
			}

			const candidate = candidates.find((item) => item.itemId === itemId);
			if (!candidate || candidate.status !== "pending") {
				return;
			}

			if (
				!shouldProceedWithCandidateAction({
					action: "reject",
					confirm: window.confirm,
				})
			) {
				return;
			}

			setConfirmingId(itemId);
			try {
				await rejectCandidateDecision({ itemId });
				const updatedCandidates = candidates.filter(
					(item) => item.itemId !== itemId,
				);
				setCandidates(updatedCandidates);
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

				if (updatedCandidates.length === 0) {
					setCandidateModalOpen(false);
					setReviewSummary(reviewCounts(updatedCandidates));
					setPhase("complete");
				}
			} catch (rejectError) {
				toast.error(
					rejectError instanceof Error
						? rejectError.message
						: "Failed to discard stream",
				);
			} finally {
				setConfirmingId(null);
			}
		},
		[candidates, isCandidateMutationInFlight],
	);

	const handleProcessFinalizeAll = useCallback(async () => {
		if (isCandidateMutationInFlight) {
			return;
		}

		const finalizedCandidates = candidates.map((candidate) =>
			candidate.status === "pending"
				? { ...candidate, status: "skipped" as const }
				: candidate,
		);
		setCandidates(finalizedCandidates);
		setReviewSummary(reviewCounts(finalizedCandidates));
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		setCandidateErrors({});
		clearDiscoveryResumeState();
		setPhase("complete");
	}, [candidates, isCandidateMutationInFlight]);

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
		clearDiscoveryResumeState();
		setPhase("complete");
	}, [candidates]);

	const handleDiscardRemainingCandidates = useCallback(async () => {
		if (isCandidateMutationInFlight) {
			return;
		}

		const pendingCandidates = candidates.filter(
			(candidate) => candidate.status === "pending",
		);

		if (pendingCandidates.length === 0) {
			setShowDraftCloseWarning(false);
			setCandidateModalOpen(false);
			setEditingCandidateId(null);
			setReviewSummary(reviewCounts(candidates));
			clearDiscoveryResumeState();
			setPhase("complete");
			return;
		}

		setIsBulkConfirming(true);
		try {
			await Promise.all(
				pendingCandidates.map((candidate) =>
					rejectCandidateDecision({ itemId: candidate.itemId }),
				),
			);
			const remainingCandidates = candidates.filter(
				(candidate) => candidate.status !== "pending",
			);
			setShowDraftCloseWarning(false);
			setCandidates(remainingCandidates);
			setCandidateErrors({});
			setCandidateModalOpen(false);
			setEditingCandidateId(null);
			setReviewSummary(reviewCounts(remainingCandidates));
			clearDiscoveryResumeState();
			setPhase("complete");
		} catch (discardError) {
			toast.error(
				discardError instanceof Error
					? discardError.message
					: "Failed to discard remaining candidates",
			);
		} finally {
			setIsBulkConfirming(false);
		}
	}, [candidates, isCandidateMutationInFlight]);

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
		resumeNotice,
		checkingResumeState,
		candidateErrors,
		reviewSummary,
		isCandidateMutationInFlight,
		isBlocking,
		setShowDraftCloseWarning,
		setEditingCandidateId,
		startDiscovery,
		resumeDiscoverySession,
		dismissResumeNotice,
		handleTryAgain,
		handleCreateManually,
		handleCandidateFieldChange,
		handleConfirmCandidate,
		handleRejectCandidate,
		handleCandidateModalOpenChange,
		handleProcessFinalizeAll,
		handleConfirmKeepDrafts,
		handleDiscardRemainingCandidates,
	};
}
