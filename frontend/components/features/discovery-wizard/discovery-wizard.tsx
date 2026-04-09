"use client";

import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useCallback } from "react";
import { DraftConfirmationModal } from "@/components/features/discovery/draft-confirmation-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
	buildCandidateReviewNotes,
	type CandidateValidationErrors,
	toDiscoveryNormalizedData,
	validateCandidateForConfirmation,
} from "@/lib/discovery-confirmation-utils";
import { routes } from "@/lib/routes";
import { useStreamsStore } from "@/lib/stores/streams-store";
import type { DraftItemRow } from "@/lib/types/dashboard";
import type {
	DiscoverySessionResult,
	DraftCandidate,
} from "@/lib/types/discovery";
import {
	useDiscoveryOrchestration,
	type WizardPhase,
} from "./use-discovery-orchestration";
import { CompleteView, ErrorView, NoResultsView } from "./views/complete-view";
import { IdleView } from "./views/idle-view";
import { ProcessingView } from "./views/processing-view";
import {
	ConfirmingView,
	ResultView,
	ReviewView,
	sourceDisplayLabel,
	sourceStatusLabel,
	sourceTypeLabel,
} from "./views/review-view";

const TERMINAL_STATUSES = new Set([
	"review_ready",
	"partial_failure",
	"failed",
]);

type CandidateModalInstruction =
	| "open-review"
	| "warn-unresolved-drafts"
	| "close-complete";

type DecideDiscoveryDraftFn =
	typeof import("@/lib/api/bulk-import").bulkImportAPI["decideDiscoveryDraft"];

interface FinalizeReviewResult {
	updatedCandidates: DraftCandidate[];
	confirmedIds: string[];
}

interface DiscoveryWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultText?: string;
}

interface ConfirmTerminalSessionArgs {
	sessionId: string;
	terminalSession: DiscoverySessionResult;
	getSession: (sessionId: string) => Promise<DiscoverySessionResult>;
}

function parseVolumeSummary(volumeSummary: string | null): {
	units: string | null;
	frequency: string | null;
} {
	if (!volumeSummary) {
		return { units: null, frequency: null };
	}

	const normalized = volumeSummary.trim();
	if (normalized.length === 0) {
		return { units: null, frequency: null };
	}

	const [unitsRaw, frequencyRaw] = normalized.split("/");
	const units = unitsRaw?.replace(/^[\d.,\s-]+/, "").trim() || null;
	const frequency = frequencyRaw?.trim() || null;

	return { units, frequency };
}

function sourceTypeLabelFromDraft(
	sourceType: DraftItemRow["sourceType"],
): string {
	if (sourceType === "voice_interview") {
		return "Voice interview";
	}
	return "Bulk import";
}

function normalizeSuggestionToken(value: string | null | undefined): string {
	return (value ?? "").trim().toLocaleLowerCase();
}

export function resolveSuggestedClientAndLocation(params: {
	rawSuggestedClientName: string | null;
	rawSuggestedLocationName: string | null;
	suggestedLocationCity: string | null;
	locationLabel: string | null;
	hasStructuredLocationSuggestion: boolean;
}): {
	suggestedClientName: string | null;
	suggestedLocationName: string | null;
} {
	const {
		rawSuggestedClientName,
		rawSuggestedLocationName,
		suggestedLocationCity,
		locationLabel,
		hasStructuredLocationSuggestion,
	} = params;

	const suggestedClientName = (rawSuggestedClientName ?? "").trim();
	const suggestedLocationName = (rawSuggestedLocationName ?? "").trim();

	if (!suggestedClientName) {
		return {
			suggestedClientName: null,
			suggestedLocationName: suggestedLocationName || null,
		};
	}

	if (suggestedLocationName) {
		return {
			suggestedClientName,
			suggestedLocationName,
		};
	}

	if (hasStructuredLocationSuggestion) {
		return {
			suggestedClientName,
			suggestedLocationName: null,
		};
	}

	const separatorIndex = suggestedClientName.indexOf(" - ");
	if (separatorIndex <= 0) {
		return {
			suggestedClientName,
			suggestedLocationName: null,
		};
	}

	const clientPart = suggestedClientName.slice(0, separatorIndex).trim();
	const locationPart = suggestedClientName.slice(separatorIndex + 3).trim();
	if (!clientPart || !locationPart) {
		return {
			suggestedClientName,
			suggestedLocationName: null,
		};
	}

	const normalizedLocationPart = normalizeSuggestionToken(locationPart);
	const cityMatches =
		normalizeSuggestionToken(suggestedLocationCity) === normalizedLocationPart;
	const labelMatches =
		normalizeSuggestionToken(locationLabel) === normalizedLocationPart;

	if (!(cityMatches || labelMatches)) {
		return {
			suggestedClientName,
			suggestedLocationName: null,
		};
	}

	return {
		suggestedClientName: clientPart,
		suggestedLocationName: locationPart,
	};
}

export async function confirmTerminalDiscoverySnapshot({
	sessionId,
	terminalSession,
	getSession,
}: ConfirmTerminalSessionArgs): Promise<DiscoverySessionResult> {
	try {
		const confirmedSession = await getSession(sessionId);
		if (TERMINAL_STATUSES.has(confirmedSession.status)) {
			return confirmedSession;
		}
	} catch {
		return terminalSession;
	}

	return terminalSession;
}

export function mapCandidateRows(
	rows: DraftItemRow[],
	defaultClientId: string | null,
	defaultLocationId: string | null,
): DraftCandidate[] {
	return rows.map((row) => {
		const parsedVolume = parseVolumeSummary(row.volumeSummary);
		const suggestedNames = resolveSuggestedClientAndLocation({
			rawSuggestedClientName: row.suggestedCompanyLabel ?? row.companyLabel ?? null,
			rawSuggestedLocationName: row.suggestedLocationName ?? row.locationLabel ?? null,
			suggestedLocationCity: row.suggestedLocationCity ?? null,
			locationLabel: row.locationLabel ?? null,
			hasStructuredLocationSuggestion:
				Boolean((row.suggestedLocationName ?? "").trim()) ||
				Boolean((row.suggestedLocationCity ?? "").trim()) ||
				Boolean((row.suggestedLocationState ?? "").trim()) ||
				Boolean((row.suggestedLocationAddress ?? "").trim()),
		});
		const targetLocationId =
			row.target?.entrypointType === "location"
				? row.target.entrypointId
				: null;
		const resolvedClientId = defaultClientId ?? row.companyId ?? null;
		const hasLocationConflict = row.draftKind === "location_only";
		const resolvedLocationId = hasLocationConflict
			? null
			: (targetLocationId ?? defaultLocationId);
		const hasSuggestedLocation =
			resolvedLocationId === null &&
			resolvedClientId !== null &&
			(row.locationLabel ?? "").trim().length > 0;
		const isAmbiguousLocation = hasSuggestedLocation && hasLocationConflict;

		return {
			itemId: row.itemId,
			runId: row.runId,
			suggestedClientName: suggestedNames.suggestedClientName,
			aiSuggestedClientAccepted: false,
			suggestedClientConfidence: row.suggestedClientConfidence ?? null,
			suggestedClientEvidence: row.suggestedClientEvidence ?? [],
			suggestedLocationName: suggestedNames.suggestedLocationName,
			aiSuggestedLocationAccepted: false,
			suggestedLocationCity: row.suggestedLocationCity ?? null,
			suggestedLocationState: row.suggestedLocationState ?? null,
			suggestedLocationAddress: row.suggestedLocationAddress ?? null,
			suggestedLocationConfidence: row.suggestedLocationConfidence ?? null,
			suggestedLocationEvidence: row.suggestedLocationEvidence ?? [],
			clientId: resolvedClientId,
			clientLocked: defaultClientId !== null,
			locationId: resolvedLocationId,
			locationResolutionHint: isAmbiguousLocation
				? "ambiguous"
				: hasSuggestedLocation
					? "suggested"
					: resolvedLocationId
						? "none"
						: "missing",
			locationSuggestionLabel: hasSuggestedLocation
				? (row.locationLabel ?? null)
				: null,
			material: row.streamName,
			volume: row.volumeSummary,
			frequency: parsedVolume.frequency,
			units: parsedVolume.units,
			locationLabel: row.locationLabel,
			source: row.sourceFilename ?? sourceTypeLabelFromDraft(row.sourceType),
			confidence: row.confidence,
			status: "pending",
		};
	});
}

export function canStartDiscovery(params: {
	filesCount: number;
	hasAudio: boolean;
	hasValidTextSource: boolean;
}): boolean {
	const { filesCount, hasAudio, hasValidTextSource } = params;
	return filesCount > 0 || hasAudio || hasValidTextSource;
}

export function canSaveQuickEntry(params: {
	clientId: string;
	locationId: string;
	material: string;
	volume: string;
	units: string;
	frequency: string;
	isSaving: boolean;
}): boolean {
	const { clientId, locationId, material, volume, units, frequency, isSaving } =
		params;
	return (
		clientId.trim().length > 0 &&
		locationId.trim().length > 0 &&
		material.trim().length > 0 &&
		volume.trim().length > 0 &&
		units.trim().length > 0 &&
		frequency.trim().length > 0 &&
		!isSaving
	);
}

export function resolveLocationResolution(params: {
	candidateLocationId: string | null;
	defaultLocationId?: string | undefined;
}): { mode: "existing"; locationId: string } | undefined {
	const { candidateLocationId, defaultLocationId } = params;
	const resolvedLocationId = candidateLocationId ?? defaultLocationId ?? null;
	if (!resolvedLocationId) {
		return undefined;
	}

	return {
		mode: "existing",
		locationId: resolvedLocationId,
	};
}

export async function confirmCandidateDecision(params: {
	candidate: DraftCandidate;
	decideDiscoveryDraft: DecideDiscoveryDraftFn;
	defaultLocationId?: string;
}): Promise<CandidateValidationErrors> {
	const { candidate, decideDiscoveryDraft, defaultLocationId } = params;
	const validationCandidate: DraftCandidate = {
		...candidate,
		locationId: candidate.locationId ?? defaultLocationId ?? null,
	};
	const validationErrors =
		validateCandidateForConfirmation(validationCandidate);
	if (Object.keys(validationErrors).length > 0) {
		return validationErrors;
	}
	const decisionPayload: Parameters<DecideDiscoveryDraftFn>[1] = {
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

	await decideDiscoveryDraft(candidate.itemId, decisionPayload);

	return {};
}

export function processFinalizeAllCandidates(
	candidates: DraftCandidate[],
): FinalizeReviewResult {
	const updatedCandidates = candidates.map((candidate) => {
		if (candidate.status === "pending") {
			return { ...candidate, status: "skipped" as const };
		}
		return candidate;
	});

	return {
		updatedCandidates,
		confirmedIds: candidates
			.filter((candidate) => candidate.status === "confirmed")
			.map((candidate) => candidate.itemId),
	};
}

export function shouldRouteToNoResults(params: {
	draftsNeedingConfirmation: number;
	mappedCandidatesCount: number;
}): boolean {
	const { draftsNeedingConfirmation, mappedCandidatesCount } = params;
	if (draftsNeedingConfirmation <= 0) {
		return true;
	}
	return mappedCandidatesCount <= 0;
}

export function resolveDiscoveryReviewStep(params: {
	draftsNeedingConfirmation: number;
	mappedCandidatesCount: number;
}): {
	phase: "review" | "no-results";
	openCandidateModal: boolean;
} {
	if (shouldRouteToNoResults(params)) {
		return {
			phase: "no-results",
			openCandidateModal: false,
		};
	}

	return {
		phase: "review",
		openCandidateModal: true,
	};
}

export function resolveCandidateModalInstruction(params: {
	nextOpen: boolean;
	pendingCandidatesCount: number;
}): CandidateModalInstruction {
	const { nextOpen, pendingCandidatesCount } = params;
	if (nextOpen) {
		return "open-review";
	}

	if (pendingCandidatesCount > 0) {
		return "warn-unresolved-drafts";
	}

	return "close-complete";
}

export function DiscoveryWizard({
	open,
	onOpenChange,
	defaultText,
}: DiscoveryWizardProps): ReactElement {
	const router = useRouter();
	const orchestration = useDiscoveryOrchestration({
		open,
		mapCandidateRows,
		shouldRouteToNoResults,
		confirmTerminalDiscoverySnapshot,
	});

	const handleGoToStreams = useCallback(() => {
		onOpenChange(false);
		useStreamsStore.getState().resetStore();
		router.push(routes.streams.all);
	}, [onOpenChange, router]);

	const handleGoToDrafts = useCallback(() => {
		onOpenChange(false);
		useStreamsStore.getState().resetStore();
		router.push(routes.streams.all);
	}, [onOpenChange, router]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (orchestration.isBlocking && !nextOpen) return;
			if (!nextOpen && orchestration.candidateModalOpen) {
				orchestration.setShowDraftCloseWarning(true);
				return;
			}
			onOpenChange(nextOpen);
		},
		[
			orchestration.candidateModalOpen,
			orchestration.isBlocking,
			orchestration.setShowDraftCloseWarning,
			onOpenChange,
		],
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="glass-popover discovery-wizard-dialog flex h-auto w-[calc(100vw-2rem)] max-h-[90vh] max-h-[90dvh] max-w-none gap-0 overflow-hidden rounded-2xl p-0 shadow-water-lg md:w-[min(94vw,1120px)] xl:w-[min(94vw,1180px)]"
				showCloseButton={!orchestration.isBlocking}
			>
				<div
					key={orchestration.phase}
					aria-live="polite"
					className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex min-h-0 flex-1 flex-col"
				>
					{orchestration.phase === "idle" && orchestration.resumeNotice && (
						<div className="px-6 pt-6">
							<Alert variant="warning">
								<AlertTitle>{orchestration.resumeNotice.title}</AlertTitle>
								<AlertDescription>
									{orchestration.resumeNotice.description}
									<div className="mt-3 flex items-center gap-2">
										{orchestration.resumeNotice.actionLabel ? (
											<Button
												size="sm"
												onClick={() => {
													void orchestration.resumeDiscoverySession();
												}}
												disabled={orchestration.checkingResumeState}
											>
												{orchestration.resumeNotice.actionLabel}
											</Button>
										) : null}
										<Button
											size="sm"
											variant="ghost"
											onClick={orchestration.dismissResumeNotice}
										>
											Dismiss
										</Button>
									</div>
								</AlertDescription>
							</Alert>
						</div>
					)}

					{(orchestration.phase === "idle" ||
						orchestration.phase === "submitting") && (
						<IdleView
							open={open}
							phase={
								orchestration.phase as Extract<
									WizardPhase,
									"idle" | "submitting"
								>
							}
							{...(defaultText ? { defaultText } : {})}
							onDiscover={orchestration.startDiscovery}
							onClose={() => onOpenChange(false)}
						/>
					)}

					{orchestration.phase === "processing" && <ProcessingView />}

					{orchestration.phase === "no-results" && (
						<NoResultsView
							onClose={() => onOpenChange(false)}
							onTryAgain={orchestration.handleTryAgain}
							onCreateManually={orchestration.handleCreateManually}
						/>
					)}

					{orchestration.phase === "review" && (
						<section className="flex flex-1 items-center justify-center px-6 py-10 text-center">
							<div>
								<p className="font-medium">Candidate review in progress</p>
								<p className="mt-1 text-sm text-muted-foreground">
									Use the confirmation modal to review and confirm candidates.
								</p>
							</div>
						</section>
					)}

					{orchestration.phase === "confirming" && <ConfirmingView />}

					{orchestration.phase === "complete" &&
						orchestration.reviewSummary && (
							<CompleteView
								confirmed={orchestration.reviewSummary.confirmed}
								skipped={orchestration.reviewSummary.skipped}
								onGoToStreams={handleGoToStreams}
								onGoToDrafts={handleGoToDrafts}
							/>
						)}

					{orchestration.phase === "error" && (
						<ErrorView
							error={orchestration.error ?? "An unexpected error occurred"}
							onTryAgain={orchestration.handleTryAgain}
							onClose={() => onOpenChange(false)}
							onCreateManually={orchestration.handleCreateManually}
						/>
					)}
				</div>
			</DialogContent>

			<DraftConfirmationModal
				open={orchestration.candidateModalOpen}
				onOpenChange={orchestration.handleCandidateModalOpenChange}
				candidates={orchestration.candidates}
				editingCandidateId={orchestration.editingCandidateId}
				onEditCandidate={orchestration.setEditingCandidateId}
				onCandidateFieldChange={orchestration.handleCandidateFieldChange}
				onConfirmCandidate={orchestration.handleConfirmCandidate}
				onRejectCandidate={orchestration.handleRejectCandidate}
				onProcessFinalizeAll={orchestration.handleProcessFinalizeAll}
				candidateErrors={orchestration.candidateErrors}
				confirmingId={orchestration.confirmingId}
				disableActions={orchestration.isCandidateMutationInFlight}
				isBulkConfirming={orchestration.isBulkConfirming}
			/>

			<AlertDialog
				open={orchestration.showDraftCloseWarning}
				onOpenChange={orchestration.setShowDraftCloseWarning}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Leave review?</AlertDialogTitle>
						<AlertDialogDescription>
							Confirmed streams are already created. You can keep reviewing,
							save the remaining items as drafts, or discard the remaining
							unconfirmed items.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Reviewing</AlertDialogCancel>
						<AlertDialogAction onClick={orchestration.handleConfirmKeepDrafts}>
							Save as Drafts
						</AlertDialogAction>
						<AlertDialogAction
							onClick={orchestration.handleDiscardRemainingCandidates}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Discard Remaining
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}

export {
	CompleteView,
	ErrorView,
	NoResultsView,
	ResultView,
	ReviewView,
	sourceDisplayLabel,
	sourceStatusLabel,
	sourceTypeLabel,
};
