"use client";

import { FolderOpen, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { StreamPhaseStepper } from "@/components/features/streams/stream-phase-stepper";
import { StreamQuickCaptureCard } from "@/components/features/streams/stream-quick-capture-card";
import { StreamQuickCaptureModal } from "@/components/features/streams/stream-quick-capture-modal";
import { StreamWorkspaceForm } from "@/components/features/streams/stream-workspace-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STREAM_WORKSPACE_PHASES } from "@/config/stream-questionnaire";
import {
	useWorkspaceActions,
	useWorkspaceError,
	useWorkspaceLoading,
	useWorkspaceStore,
} from "@/lib/stores/workspace-store";
import type { WorkspaceQuestionId } from "@/lib/types/workspace";
import type { StreamPhase } from "./types";

const QUESTIONNAIRE_AUTOSAVE_DELAY_MS = 500;

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

export function StreamDetailPageContent({ id }: { id: string }) {
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
		})),
	);

	const [activePhase, setActivePhase] = useState<StreamPhase>(1);
	const [phaseManuallySelected, setPhaseManuallySelected] =
		useState<boolean>(false);
	const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
	const [quickCaptureInitialAction, setQuickCaptureInitialAction] = useState<
		"upload" | "voice" | "paste"
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

	const completedCount = useMemo(
		() => countCompletedPhases(phaseCompletion),
		[phaseCompletion],
	);

	const activePhaseMeta = STREAM_WORKSPACE_PHASES.find(
		(phase) => phase.phase === activePhase,
	);

	const materialName =
		baseFields.find((field) => field.fieldId === "material_name")?.value ||
		"Untitled stream";
	const volume =
		baseFields.find((field) => field.fieldId === "volume")?.value || "Not set";
	const frequency =
		baseFields.find((field) => field.fieldId === "frequency")?.value ||
		"Not set";

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

	const handleOpenQuickCapture = (action: "upload" | "voice" | "paste") => {
		setQuickCaptureInitialAction(action);
		setQuickCaptureOpen(true);
	};

	const filesHref = `/streams/${id}/files`;
	const contactsHref = `/streams/${id}/contacts`;

	const handleWorkspaceEvidenceChanged = () => {
		void hydrate(id);
	};

	return (
		<>
			<div className="flex flex-col gap-6">
				<header className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
					<p className="text-xs uppercase tracking-[0.08em] text-secondary">
						Streams / Workspace / {id}
					</p>
					<div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex flex-col gap-2">
							<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
								{materialName}
							</h1>
							<p className="text-sm text-muted-foreground">
								Phase {activePhase} · {activePhaseMeta?.label}
							</p>
							<p className="text-sm text-muted-foreground">
								Volume: {volume} · Frequency: {frequency}
							</p>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<Badge variant="secondary" className="rounded-full">
								{completedCount}/4 phases complete
							</Badge>
							<Badge variant="secondary" className="rounded-full">
								Default: Phase {firstIncompletePhase}
							</Badge>
							<Button asChild variant="outline" size="sm">
								<Link href={filesHref}>
									<FolderOpen data-icon="inline-start" aria-hidden />
									Files
								</Link>
							</Button>
							<Button asChild variant="outline" size="sm">
								<Link href={contactsHref}>
									<Users data-icon="inline-start" aria-hidden />
									Contacts
								</Link>
							</Button>
						</div>
					</div>
				</header>

				<StreamPhaseStepper
					activePhase={activePhase}
					phaseProgress={phaseCompletion}
					onPhaseSelect={handlePhaseSelect}
				/>

				{error ? (
					<Card className="border-destructive/30 bg-destructive/5 shadow-sm">
						<CardContent className="py-4 text-sm text-destructive">
							Failed to hydrate workspace detail: {error}
						</CardContent>
					</Card>
				) : null}

				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
					<div className="flex flex-col gap-6">
						<Card className="bg-surface-container-lowest shadow-sm">
							<CardHeader>
								<CardTitle className="font-display text-xl">
									Questionnaire workspace
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-4 pt-0">
								{loading ? (
									<div className="rounded-lg bg-surface-container-low p-3 text-sm text-muted-foreground">
										Loading workspace questionnaire...
									</div>
								) : null}
								{!loading ? (
									<div className="text-xs text-muted-foreground">
										{questionnaireSaveStatus === "saving"
											? "Saving questionnaire answers..."
											: questionnaireSaveStatus === "error"
												? "Could not save answers. We will retry when you keep editing."
												: questionnaireAnswersDirty
													? "Unsaved questionnaire edits"
													: reviewSuggestionsStatus === "saving"
														? "Applying AI review action..."
														: reviewSuggestionsStatus === "error"
															? "Could not apply AI review action. Retry."
															: "Questionnaire answers saved"}
									</div>
								) : null}
								<StreamWorkspaceForm
									activePhase={activePhase}
									answers={questionnaireAnswers}
									suggestions={questionnaireSuggestions}
									reviewingSuggestions={reviewSuggestionsStatus === "saving"}
									onAnswerChange={handleQuestionChange}
									onReviewSuggestion={handleSuggestionReview}
								/>
							</CardContent>
						</Card>
					</div>

					<aside className="flex flex-col gap-6">
						<StreamQuickCaptureCard
							onOpenQuickCapture={handleOpenQuickCapture}
						/>
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
		</>
	);
}
