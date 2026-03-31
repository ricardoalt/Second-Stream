"use client";

import { ClipboardList, Info, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	STREAM_WORKSPACE_PHASES,
	STREAM_WORKSPACE_QUESTIONS_BY_PHASE,
	type StreamQuestionDefinition,
	type StreamWorkspacePhase,
} from "@/config/stream-questionnaire";
import type {
	WorkspaceQuestionId,
	WorkspaceQuestionSuggestion,
	WorkspaceQuestionSuggestionReviewScope,
} from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

type StreamWorkspaceFormProps = {
	activePhase: StreamWorkspacePhase;
	answers: Record<string, string>;
	suggestions: WorkspaceQuestionSuggestion[];
	reviewingSuggestions: boolean;
	onAnswerChange: (questionId: string, value: string) => void;
	onReviewSuggestion: (
		action: "accept" | "reject",
		scope: WorkspaceQuestionSuggestionReviewScope,
	) => void;
};

type SectionGroup = {
	section: string;
	questions: StreamQuestionDefinition[];
};

export function buildPendingSuggestionMap(
	suggestions: WorkspaceQuestionSuggestion[],
): Map<string, WorkspaceQuestionSuggestion> {
	const pending = suggestions.filter(
		(suggestion) => suggestion.status === "pending",
	);
	return new Map(
		pending.map((suggestion) => [suggestion.questionId, suggestion]),
	);
}

export function resolveDisplayedAnswerValue(
	answer: string,
	suggestion: WorkspaceQuestionSuggestion | undefined,
	isLocallyEdited = false,
): string {
	if (!suggestion || suggestion.hasConflict || isLocallyEdited) {
		return answer;
	}
	return suggestion.suggestedValue;
}

function countPendingSuggestionsForQuestions(
	questions: StreamQuestionDefinition[],
	pendingSuggestions: Map<string, WorkspaceQuestionSuggestion>,
): number {
	let count = 0;
	for (const question of questions) {
		if (pendingSuggestions.has(question.id)) {
			count += 1;
		}
	}
	return count;
}

export function groupQuestionsBySection(
	questions: StreamQuestionDefinition[],
): SectionGroup[] {
	const grouped = new Map<string, StreamQuestionDefinition[]>();
	for (const question of questions) {
		const current = grouped.get(question.section) ?? [];
		current.push(question);
		grouped.set(question.section, current);
	}

	return Array.from(grouped.entries()).map(([section, sectionQuestions]) => ({
		section,
		questions: sectionQuestions,
	}));
}

export function StreamWorkspaceForm({
	activePhase,
	answers,
	suggestions,
	reviewingSuggestions,
	onAnswerChange,
	onReviewSuggestion,
}: StreamWorkspaceFormProps) {
	const phaseQuestions = STREAM_WORKSPACE_QUESTIONS_BY_PHASE[activePhase];
	const phaseMeta = STREAM_WORKSPACE_PHASES.find(
		(p) => p.phase === activePhase,
	);

	const sections = useMemo<SectionGroup[]>(
		() => groupQuestionsBySection(phaseQuestions),
		[phaseQuestions],
	);
	const pendingSuggestions = useMemo(
		() => buildPendingSuggestionMap(suggestions),
		[suggestions],
	);

	const phasePendingSuggestionCount = useMemo(
		() =>
			countPendingSuggestionsForQuestions(phaseQuestions, pendingSuggestions),
		[phaseQuestions, pendingSuggestions],
	);

	const [locallyEditedQuestions, setLocallyEditedQuestions] = useState<
		Record<string, true>
	>({});

	return (
		<div className="flex flex-col gap-8">
			{/* Phase Header */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<ClipboardList
						className="size-5 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					<h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
						Phase {activePhase}: {phaseMeta?.label}
					</h2>
				</div>
				{phaseMeta?.description ? (
					<p className="text-sm leading-relaxed text-muted-foreground">
						{phaseMeta.description}
					</p>
				) : null}
			</div>

			<Separator />

			{/* AI Suggestions Banner */}
			{phasePendingSuggestionCount > 0 ? (
				<div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
					<div className="flex items-center gap-2 text-sm">
						<Sparkles
							className="size-4 shrink-0 text-primary"
							aria-hidden
						/>
						<span className="font-medium text-foreground">
							{phasePendingSuggestionCount} AI suggestion
							{phasePendingSuggestionCount > 1 ? "s" : ""} ready
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 text-xs"
							disabled={reviewingSuggestions}
							onClick={() =>
								onReviewSuggestion("reject", {
									kind: "phase",
									phase: activePhase,
								})
							}
						>
							Reject all
						</Button>
						<Button
							type="button"
							size="sm"
							className="h-7 text-xs"
							disabled={reviewingSuggestions}
							onClick={() =>
								onReviewSuggestion("accept", {
									kind: "phase",
									phase: activePhase,
								})
							}
						>
							Accept all
						</Button>
					</div>
				</div>
			) : null}

			{/* Sections */}
			{sections.map((section, sectionIndex) => {
				const sectionPendingSuggestionCount =
					countPendingSuggestionsForQuestions(
						section.questions,
						pendingSuggestions,
					);

				return (
					<div key={section.section} className="flex flex-col gap-6">
						{/* Section divider — only between multiple sections */}
						{sectionIndex > 0 ? (
							<div className="flex items-center gap-3">
								<Separator className="flex-1" />
								<span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
									{section.section}
								</span>
								<Separator className="flex-1" />
								{sectionPendingSuggestionCount > 0 ? (
									<div className="flex items-center gap-1.5">
										<Button
											type="button"
											size="sm"
											variant="ghost"
											className="h-6 px-2 text-[10px]"
											disabled={reviewingSuggestions}
											onClick={() =>
												onReviewSuggestion("reject", {
													kind: "section",
													section: section.section,
												})
											}
										>
											Reject
										</Button>
										<Button
											type="button"
											size="sm"
											className="h-6 px-2 text-[10px]"
											disabled={reviewingSuggestions}
											onClick={() =>
												onReviewSuggestion("accept", {
													kind: "section",
													section: section.section,
												})
											}
										>
											Accept
										</Button>
									</div>
								) : null}
							</div>
						) : null}

						{/* Fields — single column, generous spacing */}
						<div className="flex flex-col gap-7">
							{section.questions.map((question) => (
								<QuestionField
									key={question.id}
									question={question}
									value={answers[question.id] ?? ""}
									suggestion={pendingSuggestions.get(question.id)}
									isLocallyEdited={Boolean(
										locallyEditedQuestions[question.id],
									)}
									reviewingSuggestions={reviewingSuggestions}
									onChange={onAnswerChange}
									onLocalEdit={(questionId) =>
										setLocallyEditedQuestions((current) => ({
											...current,
											[questionId]: true,
										}))
									}
									onReviewSuggestion={onReviewSuggestion}
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function QuestionField({
	question,
	value,
	suggestion,
	isLocallyEdited,
	reviewingSuggestions,
	onChange,
	onLocalEdit,
	onReviewSuggestion,
}: {
	question: StreamQuestionDefinition;
	value: string;
	suggestion: WorkspaceQuestionSuggestion | undefined;
	isLocallyEdited: boolean;
	reviewingSuggestions: boolean;
	onChange: (questionId: string, value: string) => void;
	onLocalEdit: (questionId: string) => void;
	onReviewSuggestion: (
		action: "accept" | "reject",
		scope: WorkspaceQuestionSuggestionReviewScope,
	) => void;
}) {
	const fieldId = `field-${question.id}`;

	const renderedValue = resolveDisplayedAnswerValue(
		value,
		suggestion,
		isLocallyEdited,
	);

	const handleChange = (nextValue: string) => {
		if (suggestion && !suggestion.hasConflict) {
			onLocalEdit(question.id);
		}
		onChange(question.id, nextValue);
	};

	const control = (() => {
		switch (question.type) {
			case "long_text":
			case "open_question":
				return (
					<Textarea
						id={fieldId}
						value={renderedValue}
						onChange={(event) => handleChange(event.target.value)}
						placeholder={question.label}
						rows={3}
						className={cn(
							"resize-none text-sm",
							suggestion && "border-primary/40 bg-primary/5",
						)}
					/>
				);
			case "boolean": {
				const selectProps = renderedValue ? { value: renderedValue } : {};
				return (
					<Select {...selectProps} onValueChange={handleChange}>
						<SelectTrigger
							id={fieldId}
							className={cn(
								"text-sm",
								suggestion && "border-primary/40 bg-primary/5",
							)}
						>
							<SelectValue placeholder="Select one" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="Yes">Yes</SelectItem>
							<SelectItem value="No">No</SelectItem>
							<SelectItem value="Unknown">Unknown</SelectItem>
						</SelectContent>
					</Select>
				);
			}
			case "number":
				return (
					<Input
						id={fieldId}
						type="number"
						value={renderedValue}
						onChange={(event) => handleChange(event.target.value)}
						placeholder="0.00"
						className={cn(
							"text-sm",
							suggestion && "border-primary/40 bg-primary/5",
						)}
					/>
				);
			case "date":
				return (
					<Input
						id={fieldId}
						type="date"
						value={renderedValue}
						onChange={(event) => handleChange(event.target.value)}
						className={cn(
							"text-sm",
							suggestion && "border-primary/40 bg-primary/5",
						)}
					/>
				);
			case "single_select":
			case "short_text":
				return (
					<Input
						id={fieldId}
						value={renderedValue}
						onChange={(event) => handleChange(event.target.value)}
						placeholder={question.label}
						className={cn(
							"text-sm",
							suggestion && "border-primary/40 bg-primary/5",
						)}
					/>
				);
		}
	})();

	return (
		<div className="flex flex-col gap-2">
			{/* Label row */}
			<div className="flex items-center gap-1.5">
				<label
					htmlFor={fieldId}
					className="text-sm font-medium text-foreground"
				>
					{question.label}
				</label>
				{question.required ? (
					<span className="text-xs text-destructive/70" aria-hidden>
						*
					</span>
				) : null}
				<Tooltip>
					<TooltipTrigger asChild>
						<button type="button" className="text-muted-foreground/50 transition-colors hover:text-muted-foreground">
							<Info className="size-3.5" aria-hidden />
							<span className="sr-only">More info about {question.label}</span>
						</button>
					</TooltipTrigger>
					<TooltipContent side="top" className="max-w-[240px] text-xs">
						{question.label}
					</TooltipContent>
				</Tooltip>
				{suggestion ? (
					<span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-primary">
						<Sparkles className="size-3" aria-hidden />
						AI suggested
					</span>
				) : null}
			</div>

			{control}

			{/* AI suggestion review panel */}
			{suggestion ? (
				<div className="flex items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
					<p className="text-xs text-muted-foreground">
						{suggestion.hasConflict ? (
							<>
								Your answer kept. AI alternative:{" "}
								<span className="font-medium text-foreground">
									{suggestion.suggestedValue}
								</span>
							</>
						) : (
							"AI value shown — accept to confirm or reject to clear."
						)}
					</p>
					<div className="flex shrink-0 items-center gap-1.5">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-6 px-2 text-[10px]"
							disabled={reviewingSuggestions}
							onClick={() =>
								onReviewSuggestion("reject", {
									kind: "field",
									question_id: question.id as WorkspaceQuestionId,
								})
							}
						>
							Reject
						</Button>
						<Button
							type="button"
							size="sm"
							className="h-6 px-2 text-[10px]"
							disabled={reviewingSuggestions}
							onClick={() =>
								onReviewSuggestion("accept", {
									kind: "field",
									question_id: question.id as WorkspaceQuestionId,
								})
							}
						>
							Accept
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
