"use client";

import { ArrowLeft, ArrowRight, FolderOpen, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { StreamPhaseStepper } from "@/components/features/streams/stream-phase-stepper";
import { StreamQuickCaptureCard } from "@/components/features/streams/stream-quick-capture-card";
import { StreamQuickCaptureModal } from "@/components/features/streams/stream-quick-capture-modal";
import { StreamWorkspaceForm } from "@/components/features/streams/stream-workspace-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { STREAM_WORKSPACE_PHASES } from "@/config/stream-questionnaire";
import { workspaceAPI } from "@/lib/api/workspace";
import {
	useWorkspaceActions,
	useWorkspaceError,
	useWorkspaceLoading,
	useWorkspaceStore,
} from "@/lib/stores/workspace-store";
import type {
	WorkspaceQuestionId,
	WorkspaceQuickCaptureStatus,
} from "@/lib/types/workspace";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/logger";
import type { StreamPhase } from "./types";

const QUESTIONNAIRE_AUTOSAVE_DELAY_MS = 500;
type CompleteDiscoveryStatus = "idle" | "submitting" | "error";

export function buildOfferDetailHref({ projectId }: { projectId: string }) {
	return `/offers/${projectId}`;
}

export function buildPhaseCompletion(
	phaseProgress: Record<string, boolean>,
): Record<StreamPhase, boolean> {
	return {
		1: Boolean(phaseProgress["1"]),
		2: Boolean(phaseProgress["2"]),
		3: Boolean(phaseProgress["3"]),
		4: Boolean(phaseProgress["4"]),
	};
}

export function countCompletedPhases(
	phaseCompletion: Record<StreamPhase, boolean>,
): number {
	return Object.values(phaseCompletion).filter(Boolean).length;
}

export function resolveWorkspaceActivePhase({
	activePhase,
	firstIncompletePhase,
	phaseManuallySelected,
}: {
	activePhase: StreamPhase;
	firstIncompletePhase: StreamPhase;
	phaseManuallySelected: boolean;
}): StreamPhase {
	if (phaseManuallySelected) {
		return activePhase;
	}

	return firstIncompletePhase;
}

export function resolveWorkspaceQuickCaptureFeedback({
	quickCaptureStatus,
	backgroundHydrateError,
}: {
	quickCaptureStatus: WorkspaceQuickCaptureStatus;
	backgroundHydrateError: string | null;
}) {
	if (quickCaptureStatus === "completed") {
		return {
			tone: "success" as const,
			title: "Capture completed",
			description:
				"Workspace evidence is visible and suggestions are up to date.",
		};
	}

	if (quickCaptureStatus === "analyzing") {
		return {
			tone: "pending" as const,
			title: "Capture in progress",
			description:
				"Evidence is visible. Refreshing workspace suggestions now...",
		};
	}

	if (quickCaptureStatus === "pending") {
		return {
			tone: "pending" as const,
			title: "Capture pending",
			description: "Waiting for captured evidence to appear in workspace.",
		};
	}

	if (quickCaptureStatus === "retry_required") {
		return {
			tone: "error" as const,
			title: "Manual retry needed",
			description:
				backgroundHydrateError ??
				"Quick Capture needs manual retry. Evidence is still processing.",
			actionLabel: "Open Quick Capture",
		};
	}

	return null;
}

export function StreamDetailPageContent({ id }: { id: string }) {
	const router = useRouter();
	const {
		hydrate,
		reset,
		updateQuestionnaireAnswer,
		reviewQuestionnaireSuggestions,
		saveQuestionnaireAnswers,
	} = useWorkspaceActions();
	const loading = useWorkspaceLoading();
	const error = useWorkspaceError();
	const {
		questionnaireAnswers,
		questionnaireAnswersDirty,
		questionnaireSaveStatus,
		questionnaireSuggestions,
		reviewSuggestionsStatus,
		phaseProgress,
		firstIncompletePhase,
		baseFields,
		quickCaptureStatus,
		backgroundHydrateError,
	} = useWorkspaceStore(
		useShallow((state) => ({
			questionnaireAnswers: state.questionnaireAnswers,
			questionnaireAnswersDirty: state.questionnaireAnswersDirty,
			questionnaireSaveStatus: state.questionnaireSaveStatus,
			questionnaireSuggestions: state.questionnaireSuggestions,
			reviewSuggestionsStatus: state.reviewSuggestionsStatus,
			phaseProgress: state.phaseProgress,
			firstIncompletePhase: state.firstIncompletePhase,
			baseFields: state.baseFields,
			quickCaptureStatus: state.quickCaptureStatus,
			backgroundHydrateError: state.backgroundHydrateError,
		})),
	);

	const [activePhase, setActivePhase] = useState<StreamPhase>(1);
	const [phaseManuallySelected, setPhaseManuallySelected] =
		useState<boolean>(false);
	const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
	const [completeDiscoveryModalOpen, setCompleteDiscoveryModalOpen] =
		useState(false);
	const [completeDiscoveryStatus, setCompleteDiscoveryStatus] =
		useState<CompleteDiscoveryStatus>("idle");
	const [completeDiscoveryError, setCompleteDiscoveryError] = useState<
		string | null
	>(null);
	const [quickCaptureInitialAction, setQuickCaptureInitialAction] = useState<
		"upload" | "paste" | "voice"
	>("upload");

	useEffect(() => {
		setPhaseManuallySelected(false);
		void hydrate(id);
		return () => reset();
	}, [id, hydrate, reset]);

	useEffect(() => {
		setActivePhase((currentPhase) =>
			resolveWorkspaceActivePhase({
				activePhase: currentPhase,
				firstIncompletePhase,
				phaseManuallySelected,
			}),
		);
	}, [firstIncompletePhase, phaseManuallySelected]);

	useEffect(() => {
		if (!questionnaireAnswersDirty) {
			return;
		}

		const saveTimer = setTimeout(() => {
			void saveQuestionnaireAnswers(id);
		}, QUESTIONNAIRE_AUTOSAVE_DELAY_MS);

		return () => clearTimeout(saveTimer);
	}, [id, questionnaireAnswersDirty, saveQuestionnaireAnswers]);

	const phaseCompletion = useMemo(
		() => buildPhaseCompletion(phaseProgress),
		[phaseProgress],
	);

	const materialName =
		baseFields.find((field) => field.fieldId === "material_name")?.value ||
		"Untitled stream";

	const handlePhaseSelect = (phase: StreamPhase) => {
		setPhaseManuallySelected(true);
		setActivePhase(phase);
	};

	const handleQuestionChange = (questionId: string, value: string) => {
		updateQuestionnaireAnswer(questionId as WorkspaceQuestionId, value);
	};

	const handleSuggestionReview = (
		action: "accept" | "reject",
		scope:
			| { kind: "field"; question_id: WorkspaceQuestionId }
			| { kind: "section"; section: string }
			| { kind: "phase"; phase: 1 | 2 | 3 | 4 },
	) => {
		void reviewQuestionnaireSuggestions(id, action, scope);
	};

	const handleOpenQuickCapture = (action: "upload" | "paste" | "voice") => {
		setQuickCaptureInitialAction(action);
		setQuickCaptureOpen(true);
	};

	const filesHref = `/streams/${id}/files`;
	const contactsHref = `/streams/${id}/contacts`;

	const workspaceQuickCaptureFeedback = useMemo(
		() =>
			resolveWorkspaceQuickCaptureFeedback({
				quickCaptureStatus,
				backgroundHydrateError,
			}),
		[backgroundHydrateError, quickCaptureStatus],
	);

	const handleWorkspaceEvidenceChanged = () => {
		void hydrate(id);
	};

	const handleSubmitCompleteDiscovery = async () => {
		setCompleteDiscoveryStatus("submitting");
		setCompleteDiscoveryError(null);
		try {
			const response = await workspaceAPI.completeDiscovery(id);
			const href = buildOfferDetailHref({
				projectId: response.offer.projectId,
			});
			setCompleteDiscoveryModalOpen(false);
			router.push(href);
		} catch (error) {
			setCompleteDiscoveryStatus("error");
			setCompleteDiscoveryError(
				getErrorMessage(
					error,
					"Could not complete discovery. Please try again.",
				),
			);
		}
	};

	const completeDiscoveryDisabled =
		completeDiscoveryStatus === "submitting" ||
		questionnaireAnswersDirty ||
		questionnaireSaveStatus === "saving";

	const prevPhase = activePhase > 1 ? ((activePhase - 1) as StreamPhase) : null;
	const nextPhase = activePhase < 4 ? ((activePhase + 1) as StreamPhase) : null;
	const nextPhaseMeta = nextPhase
		? STREAM_WORKSPACE_PHASES.find((p) => p.phase === nextPhase)
		: null;
	const prevPhaseMeta = prevPhase
		? STREAM_WORKSPACE_PHASES.find((p) => p.phase === prevPhase)
		: null;

	const saveStatusLabel =
		questionnaireSaveStatus === "saving"
			? "Saving..."
			: questionnaireSaveStatus === "error"
				? "Save error — will retry"
				: questionnaireAnswersDirty
					? "Unsaved edits"
					: reviewSuggestionsStatus === "saving"
						? "Applying AI review..."
						: reviewSuggestionsStatus === "error"
							? "AI review error — retry"
							: "All changes saved";

	return (
		<>
			<div className="flex flex-col gap-8">
				{/* Header */}
				<header className="animate-fade-in-up">
					<div className="flex flex-col gap-1">
						<p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
							Waste Streams &rsaquo; Missing Information &rsaquo;{" "}
							<span className="font-bold text-foreground">
								{materialName}
							</span>
						</p>
						<div className="flex items-start justify-between gap-4">
							<h1 className="font-display text-[1.65rem] font-bold tracking-tight text-foreground">
								Complete Stream Information
							</h1>
							<div className="flex shrink-0 items-center gap-2">
								<Button
									asChild
									variant="outline"
									size="sm"
									className="border-primary/30 text-primary hover:bg-primary/5"
								>
									<Link href={filesHref}>
										<FolderOpen className="size-4" aria-hidden />
										Files
									</Link>
								</Button>
								<Button
									asChild
									variant="outline"
									size="sm"
									className="border-primary/30 text-primary hover:bg-primary/5"
								>
									<Link href={contactsHref}>
										<Users className="size-4" aria-hidden />
										Contacts
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</header>

				{/* Phase Stepper */}
				<StreamPhaseStepper
					activePhase={activePhase}
					phaseProgress={phaseCompletion}
					onPhaseSelect={handlePhaseSelect}
				/>

				{/* Error state */}
				{error ? (
					<Card className="border-0 bg-destructive/5 shadow-xs">
						<CardContent className="py-4 text-sm text-destructive">
							Failed to hydrate workspace detail: {error}
						</CardContent>
					</Card>
				) : null}

				{/* Main Content Grid */}
				<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px]">
					{/* Form Column */}
					<div className="flex flex-col gap-6">
						{loading ? (
							<div className="rounded-2xl bg-surface-container-lowest p-8 text-sm text-muted-foreground shadow-xs">
								Loading workspace questionnaire...
							</div>
						) : (
							<>
								<div className="rounded-2xl bg-surface-container-lowest px-8 py-8 shadow-xs">
									<StreamWorkspaceForm
										activePhase={activePhase}
										answers={questionnaireAnswers}
										suggestions={questionnaireSuggestions}
										reviewingSuggestions={
											reviewSuggestionsStatus === "saving"
										}
										onAnswerChange={handleQuestionChange}
										onReviewSuggestion={handleSuggestionReview}
									/>
								</div>

								{/* Phase Navigation */}
								<div className="flex items-center justify-between gap-3">
									<div>
										{prevPhase && prevPhaseMeta ? (
											<Button
												type="button"
												variant="ghost"
												className="gap-2 text-muted-foreground hover:text-foreground"
												onClick={() => handlePhaseSelect(prevPhase)}
											>
												<ArrowLeft className="size-4" aria-hidden />
												Back to Phase {prevPhase}
											</Button>
										) : null}
									</div>
									<div>
										{nextPhase && nextPhaseMeta ? (
											<Button
												type="button"
												className="gap-2 bg-primary px-6 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
												onClick={() => handlePhaseSelect(nextPhase)}
											>
												Continue to Phase {nextPhase}
												<ArrowRight className="size-4" aria-hidden />
											</Button>
										) : null}
										{activePhase === 4 ? (
											<Button
												type="button"
												className="gap-2 bg-primary px-6 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
												onClick={() => {
													setCompleteDiscoveryError(null);
													setCompleteDiscoveryStatus("idle");
													setCompleteDiscoveryModalOpen(true);
												}}
												disabled={completeDiscoveryDisabled}
											>
												Complete Discovery
												<ArrowRight className="size-4" aria-hidden />
											</Button>
										) : null}
									</div>
								</div>

								{/* Save status — subtle */}
								<p
									className={cn(
										"text-center text-[11px]",
										questionnaireSaveStatus === "error" ||
											reviewSuggestionsStatus === "error"
											? "text-destructive"
											: "text-muted-foreground/60",
									)}
								>
									{saveStatusLabel}
								</p>
							</>
						)}
					</div>

					{/* Sidebar */}
					<aside className="flex flex-col gap-6">
						<StreamQuickCaptureCard
							onOpenQuickCapture={handleOpenQuickCapture}
						/>
						{workspaceQuickCaptureFeedback ? (
							<div
								className={cn(
									"rounded-2xl p-4 shadow-xs",
									workspaceQuickCaptureFeedback.tone === "error"
										? "border border-destructive/30 bg-destructive/5"
										: workspaceQuickCaptureFeedback.tone === "success"
											? "border border-emerald-300/40 bg-emerald-500/10"
											: "bg-surface-container-lowest",
								)}
							>
								<p className="text-xs font-semibold text-foreground">
									{workspaceQuickCaptureFeedback.title}
								</p>
								<p className="mt-1 text-[11px] text-muted-foreground">
									{workspaceQuickCaptureFeedback.description}
								</p>
								{workspaceQuickCaptureFeedback.actionLabel ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="mt-2"
										onClick={() => handleOpenQuickCapture("upload")}
									>
										{workspaceQuickCaptureFeedback.actionLabel}
									</Button>
								) : null}
							</div>
						) : null}
					</aside>
				</div>
			</div>

			<StreamQuickCaptureModal
				projectId={id}
				open={quickCaptureOpen}
				onOpenChange={setQuickCaptureOpen}
				onCaptured={handleWorkspaceEvidenceChanged}
				initialAction={quickCaptureInitialAction}
			/>
			<Dialog
				open={completeDiscoveryModalOpen}
				onOpenChange={(open) => {
					if (completeDiscoveryStatus === "submitting") {
						return;
					}
					setCompleteDiscoveryModalOpen(open);
				}}
			>
				<DialogContent className="glass-popover w-[min(92vw,560px)] max-w-none rounded-2xl p-0">
					<DialogTitle className="sr-only">Complete Discovery</DialogTitle>
					<DialogDescription className="sr-only">
						Finalize this stream discovery and open the Offer detail.
					</DialogDescription>
					<div className="space-y-2 border-b border-border/30 bg-surface-container-low px-6 py-5 text-center">
						<p className="text-xs uppercase tracking-[0.08em] text-secondary">
							Phase 4 handoff
						</p>
						<h2 className="font-display text-2xl font-semibold text-foreground">
							Complete Discovery?
						</h2>
						<p className="text-sm text-muted-foreground">
							This confirms discovery and opens the Offer detail for next-step
							action.
						</p>
					</div>
					<div className="space-y-3 px-6 py-5">
						{completeDiscoveryError ? (
							<p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
								{completeDiscoveryError}
							</p>
						) : null}
						<div className="flex justify-center gap-2">
							<Button
								variant="outline"
								onClick={() => setCompleteDiscoveryModalOpen(false)}
								disabled={completeDiscoveryStatus === "submitting"}
							>
								Not yet
							</Button>
							<Button
								onClick={() => {
									void handleSubmitCompleteDiscovery();
								}}
								disabled={completeDiscoveryStatus === "submitting"}
							>
								{completeDiscoveryStatus === "submitting"
									? "Completing..."
									: "Complete Discovery"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
