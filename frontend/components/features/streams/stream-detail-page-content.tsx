"use client";

import {
	ArrowLeft,
	ArrowRight,
	Check,
	FolderOpen,
	Pencil,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { AutoTeamAvatar } from "@/components/features/shared/team-avatar";
import { StreamPhaseStepper } from "@/components/features/streams/stream-phase-stepper";
import { StreamQuickCaptureCard } from "@/components/features/streams/stream-quick-capture-card";
import { StreamQuickCaptureModal } from "@/components/features/streams/stream-quick-capture-modal";
import { StreamWorkspaceForm } from "@/components/features/streams/stream-workspace-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
	STREAM_WORKSPACE_PHASES,
	STREAM_WORKSPACE_QUESTIONS,
	STREAM_WORKSPACE_QUESTIONS_BY_PHASE,
} from "@/config/stream-questionnaire";
import { organizationsAPI } from "@/lib/api/organizations";
import { projectsAPI } from "@/lib/api/projects";
import { workspaceAPI } from "@/lib/api/workspace";
import { useAuth } from "@/lib/contexts/auth-context";
import { useStreamsActions } from "@/lib/stores/streams-store";
import {
	useWorkspaceActions,
	useWorkspaceError,
	useWorkspaceLoading,
	useWorkspaceStore,
} from "@/lib/stores/workspace-store";
import type { User } from "@/lib/types/user";
import type {
	WorkspaceQuestionId,
	WorkspaceQuickCaptureStatus,
} from "@/lib/types/workspace";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/logger";
import type { StreamPhase } from "./types";

// Helper functions for owner assignment (from agent-owner-selector)
function canShowAssignOwnerControl(params: {
	isOrgAdmin: boolean;
	isSuperAdmin: boolean;
}): boolean {
	return params.isOrgAdmin || params.isSuperAdmin;
}

function filterAssignableOwners(users: User[], currentUserId?: string): User[] {
	return users.filter(
		(candidate) =>
			candidate.isActive &&
			(candidate.role === "org_admin" || candidate.role === "field_agent") &&
			candidate.id !== currentUserId,
	);
}

function formatAssignableOwnerRoleLabel(role: User["role"]): string {
	if (role === "org_admin") {
		return "Org Admin";
	}
	if (role === "field_agent") {
		return "Field Agent";
	}
	return role
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

// Inline owner selector component with custom trigger
function InlineOwnerSelector({
	owners,
	selectedOwnerId,
	onOwnerChange,
	disabled,
	triggerButton,
}: {
	owners: User[];
	selectedOwnerId: string | null;
	onOwnerChange: (value: string) => void;
	disabled?: boolean;
	triggerButton: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const selectedOwner = selectedOwnerId
		? owners.find((owner) => owner.id === selectedOwnerId)
		: null;

	const handleSelect = (ownerId: string) => {
		onOwnerChange(ownerId);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild disabled={disabled}>
				{triggerButton}
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] max-h-[var(--radix-popover-content-available-height)] overflow-hidden p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search by name or email..." />
					<CommandList className="max-h-[calc(var(--radix-popover-content-available-height)-2.5rem)] overscroll-contain">
						<CommandEmpty>No matching agents found.</CommandEmpty>
						<CommandGroup>
							{owners.map((owner) => (
								<CommandItem
									key={owner.id}
									value={`${owner.firstName} ${owner.lastName} ${owner.email}`}
									onSelect={() => handleSelect(owner.id)}
									className="flex items-center justify-between"
								>
									<div className="flex min-w-0 items-center gap-2">
										<div className="min-w-0">
											<div className="truncate">
												{owner.firstName} {owner.lastName}
											</div>
										</div>
										<Badge
											variant="outline"
											className="ml-auto shrink-0 px-1.5 py-0 text-[10px]"
										>
											{formatAssignableOwnerRoleLabel(owner.role)}
										</Badge>
									</div>
									<Check
										className={cn(
											"ml-2 h-4 w-4",
											selectedOwner?.id === owner.id
												? "opacity-100"
												: "opacity-0",
										)}
									/>
								</CommandItem>
							))}
							<CommandItem
								value="__clear__"
								onSelect={() => handleSelect("")}
								className="flex items-center justify-between text-muted-foreground"
							>
								<span>Clear assignment</span>
								<Check
									className={cn(
										"ml-2 h-4 w-4",
										!selectedOwner ? "opacity-100" : "opacity-0",
									)}
								/>
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

const QUESTIONNAIRE_AUTOSAVE_DELAY_MS = 500;
type CompleteDiscoveryStatus = "idle" | "submitting" | "error";

export function resolveCompleteDiscoveryDisabled({
	completeDiscoveryStatus,
	questionnaireAnswersDirty,
	questionnaireSaveStatus,
}: {
	completeDiscoveryStatus: CompleteDiscoveryStatus;
	questionnaireAnswersDirty: boolean;
	questionnaireSaveStatus: "idle" | "saving" | "saved" | "error";
}): boolean {
	return (
		completeDiscoveryStatus === "submitting" ||
		questionnaireAnswersDirty ||
		questionnaireSaveStatus === "saving"
	);
}

export function buildOfferDetailHref({ projectId }: { projectId: string }) {
	return `/offers/${projectId}`;
}

export function buildOfferDetailHandoffHref({
	projectId,
	insightsRefreshFailed,
}: {
	projectId: string;
	insightsRefreshFailed: boolean;
}) {
	if (!insightsRefreshFailed) {
		return buildOfferDetailHref({ projectId });
	}

	return `${buildOfferDetailHref({ projectId })}?insightsRefreshFailed=1`;
}

export function resolveStreamDetailTitle({
	projectName,
	materialName,
}: {
	projectName: string | null;
	materialName: string | null;
}) {
	const canonicalProjectName = projectName?.trim();
	if (canonicalProjectName) {
		return canonicalProjectName;
	}

	const workspaceMaterialName = materialName?.trim();
	if (workspaceMaterialName) {
		return workspaceMaterialName;
	}

	return "Untitled stream";
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
	const { loadStreams: refreshStreamsList } = useStreamsActions();
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
		discoveryCompleted,
		projectName,
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
			discoveryCompleted: state.discoveryCompleted,
			projectName: state.projectName,
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

	// Owner assignment state
	const { user, isLoading: authLoading } = useAuth();
	const [currentOwner, setCurrentOwner] = useState<User | null>(null);
	const [assignableOwners, setAssignableOwners] = useState<User[]>([]);
	const [isLoadingOwner, setIsLoadingOwner] = useState(true);
	const [isUpdatingOwner, setIsUpdatingOwner] = useState(false);

	const canManageOwner = useMemo(() => {
		if (!user) return false;
		return canShowAssignOwnerControl({
			isOrgAdmin: user.role === "org_admin",
			isSuperAdmin: user.isSuperuser,
		});
	}, [user]);

	useEffect(() => {
		setPhaseManuallySelected(false);
		void hydrate(id);
		return () => reset();
	}, [id, hydrate, reset]);

	// Load owner and assignable users
	useEffect(() => {
		if (authLoading || !user?.organizationId) return;

		const orgId = user.organizationId;
		const loadOwnerData = async () => {
			setIsLoadingOwner(true);
			try {
				// Load project details to get current owner
				const project = await projectsAPI.getProject(id);
				// Load organization users for assignment options
				const users = await organizationsAPI.listOrgUsers(orgId);

				if (project.userId) {
					const owner = users.find((u) => u.id === project.userId);
					if (owner) {
						setCurrentOwner(owner);
					}
				}

				setAssignableOwners(filterAssignableOwners(users, user?.id));
			} catch (error) {
				console.error("Failed to load owner data:", error);
			} finally {
				setIsLoadingOwner(false);
			}
		};

		void loadOwnerData();
	}, [id, user, authLoading]);

	const handleOwnerChange = async (newOwnerId: string) => {
		if (!newOwnerId || newOwnerId === currentOwner?.id) {
			return;
		}

		setIsUpdatingOwner(true);
		try {
			await projectsAPI.updateProject(id, { ownerUserId: newOwnerId });

			// Update local state with new owner
			const newOwner = assignableOwners.find((u) => u.id === newOwnerId);
			if (newOwner) {
				setCurrentOwner(newOwner);
				toast.success(`Assigned to ${newOwner.firstName} ${newOwner.lastName}`);
				void refreshStreamsList({ forceRefresh: true });
			}
		} catch (error) {
			console.error("Failed to update owner:", error);
			toast.error(getErrorMessage(error, "Failed to update assignment"));
		} finally {
			setIsUpdatingOwner(false);
		}
	};

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

		if (questionnaireSaveStatus === "saving") {
			return;
		}

		const saveTimer = setTimeout(() => {
			void saveQuestionnaireAnswers(id);
		}, QUESTIONNAIRE_AUTOSAVE_DELAY_MS);

		return () => clearTimeout(saveTimer);
	}, [
		id,
		questionnaireAnswersDirty,
		questionnaireSaveStatus,
		saveQuestionnaireAnswers,
	]);

	const phaseCompletion = useMemo(
		() => buildPhaseCompletion(phaseProgress),
		[phaseProgress],
	);

	// Compute completion percent per phase for stepper progress rings
	const phaseCompletionPercent = useMemo(() => {
		const result = {} as Record<StreamPhase, number>;
		for (const phase of [1, 2, 3, 4] as StreamPhase[]) {
			const questions = STREAM_WORKSPACE_QUESTIONS_BY_PHASE[phase];
			const completed = questions.filter((q) =>
				Boolean(questionnaireAnswers[q.id]?.trim()),
			).length;
			result[phase] = Math.round((completed / questions.length) * 100);
		}
		return result;
	}, [questionnaireAnswers]);

	// Overall completion across all 31 questions
	const totalCompleted = useMemo(
		() =>
			STREAM_WORKSPACE_QUESTIONS.filter((q) =>
				Boolean(questionnaireAnswers[q.id]?.trim()),
			).length,
		[questionnaireAnswers],
	);

	// Active phase summary stats
	const activePhaseSummary = useMemo(() => {
		const questions = STREAM_WORKSPACE_QUESTIONS_BY_PHASE[activePhase];
		const completed = questions.filter((q) =>
			Boolean(questionnaireAnswers[q.id]?.trim()),
		).length;
		const pendingAI = questionnaireSuggestions.filter(
			(s) =>
				s.status === "pending" && questions.some((q) => q.id === s.questionId),
		).length;
		const percent = Math.round((completed / questions.length) * 100);
		const phaseMeta = STREAM_WORKSPACE_PHASES.find(
			(p) => p.phase === activePhase,
		);
		return {
			completed,
			total: questions.length,
			pendingAI,
			percent,
			phaseMeta,
		};
	}, [activePhase, questionnaireAnswers, questionnaireSuggestions]);

	const materialName =
		baseFields.find((field) => field.fieldId === "material_name")?.value ??
		null;
	const streamTitle = resolveStreamDetailTitle({
		projectName,
		materialName,
	});

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
			const href = buildOfferDetailHandoffHref({
				projectId: response.offer.projectId,
				insightsRefreshFailed: response.insightsRefreshFailed,
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

	const completeDiscoveryDisabled = resolveCompleteDiscoveryDisabled({
		completeDiscoveryStatus,
		questionnaireAnswersDirty,
		questionnaireSaveStatus,
	});

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
			<div className="flex flex-col gap-6">
				{/* Header */}
				<header className="animate-fade-in-up">
					<div className="flex flex-col gap-1.5">
						<p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
							Waste Streams &rsaquo; Discovery Workspace &rsaquo;{" "}
							<span className="font-bold text-foreground">{streamTitle}</span>
						</p>
						<div className="flex items-start justify-between gap-4">
							<div className="flex flex-col gap-0.5">
								<h1 className="font-display text-[1.65rem] font-bold tracking-tight text-foreground leading-tight">
									{streamTitle}
								</h1>
								<div className="flex items-center gap-2.5 flex-wrap">
									<p className="text-sm text-muted-foreground">
										Discovery workspace
									</p>
									<Badge
										variant="outline"
										className="h-5 px-1.5 text-[10px] font-medium border-border/50"
									>
										{totalCompleted}/{STREAM_WORKSPACE_QUESTIONS.length} fields
									</Badge>
									{/* Owner assignment */}
									{isLoadingOwner ? (
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
											<span>Loading...</span>
										</div>
									) : currentOwner ? (
										<div className="flex items-center gap-2">
											<AutoTeamAvatar
												name={`${currentOwner.firstName} ${currentOwner.lastName}`}
												size="sm"
											/>
											<span className="text-xs text-muted-foreground">
												{currentOwner.firstName} {currentOwner.lastName}
											</span>
											{canManageOwner && (
												<InlineOwnerSelector
													owners={assignableOwners}
													selectedOwnerId={currentOwner.id}
													onOwnerChange={handleOwnerChange}
													disabled={isUpdatingOwner}
													triggerButton={
														<button
															type="button"
															className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted-foreground/15 hover:text-foreground"
															disabled={isUpdatingOwner}
														>
															<Pencil className="h-3 w-3" />
															Change
														</button>
													}
												/>
											)}
										</div>
									) : (
										canManageOwner && (
											<InlineOwnerSelector
												owners={assignableOwners}
												selectedOwnerId={null}
												onOwnerChange={handleOwnerChange}
												disabled={isUpdatingOwner}
												triggerButton={
													<button
														type="button"
														className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted-foreground/15 hover:text-foreground"
														disabled={isUpdatingOwner}
													>
														<Pencil className="h-3 w-3" />
														Assign
													</button>
												}
											/>
										)
									)}
								</div>
							</div>
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
					phaseCompletionPercent={phaseCompletionPercent}
					onPhaseSelect={handlePhaseSelect}
				/>

				{/* Phase Summary Bar */}
				{!loading ? (
					<div className="flex items-center justify-between gap-4 rounded-xl bg-surface-container-low/60 px-5 py-3">
						<div className="flex items-center gap-3 min-w-0">
							<p className="text-sm font-semibold text-foreground shrink-0">
								Phase {activePhase}:{" "}
								<span className="text-muted-foreground font-normal">
									{activePhaseSummary.phaseMeta?.label}
								</span>
							</p>
							<span className="text-muted-foreground/40 text-sm">·</span>
							<p className="text-xs text-muted-foreground shrink-0">
								{activePhaseSummary.completed} of {activePhaseSummary.total}{" "}
								fields
								{activePhaseSummary.pendingAI > 0 ? (
									<span className="text-primary font-medium">
										{" "}
										· {activePhaseSummary.pendingAI} AI ready
									</span>
								) : null}
							</p>
						</div>
						<div className="flex items-center gap-2.5 shrink-0">
							<Progress
								value={activePhaseSummary.percent}
								className={cn(
									"w-24 h-1.5",
									activePhaseSummary.percent === 100 && "[&>div]:bg-success",
								)}
							/>
							<span className="text-xs font-medium tabular-nums text-muted-foreground w-8 text-right">
								{activePhaseSummary.percent}%
							</span>
						</div>
					</div>
				) : null}

				{/* Error state */}
				{error ? (
					<Card className="border-0 bg-destructive/5 shadow-xs">
						<CardContent className="py-4 text-sm text-destructive">
							Failed to hydrate workspace detail: {error}
						</CardContent>
					</Card>
				) : null}

				{/* Main Content Grid */}
				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
					{/* Form Column */}
					<div className="flex flex-col gap-5">
						{loading ? (
							<div className="rounded-xl bg-surface-container-lowest p-8 text-sm text-muted-foreground shadow-xs">
								Loading workspace questionnaire...
							</div>
						) : (
							<>
								<StreamWorkspaceForm
									activePhase={activePhase}
									answers={questionnaireAnswers}
									suggestions={questionnaireSuggestions}
									reviewingSuggestions={reviewSuggestionsStatus === "saving"}
									onAnswerChange={handleQuestionChange}
									onReviewSuggestion={handleSuggestionReview}
								/>

								{/* Phase Navigation — sticky at bottom */}
								<div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-3">
									<div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/80 px-4 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur-sm">
										<div>
											{prevPhase && prevPhaseMeta ? (
												<Button
													type="button"
													variant="ghost"
													className="gap-2 text-muted-foreground hover:text-foreground"
													onClick={() => handlePhaseSelect(prevPhase)}
												>
													<ArrowLeft className="size-4" aria-hidden />
													Phase {prevPhase}
												</Button>
											) : null}
										</div>
										<p
											className={cn(
												"text-[11px]",
												questionnaireSaveStatus === "error" ||
													reviewSuggestionsStatus === "error"
													? "text-destructive"
													: "text-muted-foreground/60",
											)}
										>
											{saveStatusLabel}
										</p>
										<div>
											{nextPhase && nextPhaseMeta ? (
												<Button
													type="button"
													className="gap-2 bg-primary px-6 text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
													onClick={() => handlePhaseSelect(nextPhase)}
												>
													Phase {nextPhase}
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
													{discoveryCompleted
														? "Update Discovery"
														: "Complete Discovery"}
													<ArrowRight className="size-4" aria-hidden />
												</Button>
											) : null}
										</div>
									</div>
								</div>
							</>
						)}
					</div>

					{/* Sidebar — sticky on desktop */}
					<aside className="flex flex-col gap-5 xl:sticky xl:top-6 xl:self-start">
						<StreamQuickCaptureCard
							onOpenQuickCapture={handleOpenQuickCapture}
						/>
						{workspaceQuickCaptureFeedback ? (
							<div
								className={cn(
									"rounded-xl p-4 shadow-xs",
									workspaceQuickCaptureFeedback.tone === "error"
										? "border border-destructive/30 bg-destructive/5"
										: workspaceQuickCaptureFeedback.tone === "success"
											? "border border-success/30 bg-success/10"
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
					<DialogTitle className="sr-only">
						{discoveryCompleted ? "Update Discovery" : "Complete Discovery"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						Finalize this stream discovery and open the Offer detail.
					</DialogDescription>
					<div className="space-y-2 border-b border-border/30 bg-surface-container-low px-6 py-5 text-center">
						<p className="text-xs uppercase tracking-[0.08em] text-secondary">
							Phase 4 handoff
						</p>
						<h2 className="font-display text-2xl font-semibold text-foreground">
							{discoveryCompleted ? "Update Discovery?" : "Complete Discovery?"}
						</h2>
						<p className="text-sm text-muted-foreground">
							{discoveryCompleted
								? "This refreshes discovery context and opens the Offer detail for next-step action."
								: "This confirms discovery and opens the Offer detail for next-step action."}
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
									: discoveryCompleted
										? "Update Discovery"
										: "Complete Discovery"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
