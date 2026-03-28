"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	STREAM_WORKSPACE_QUESTIONS_BY_PHASE,
	type StreamQuestionDefinition,
	type StreamWorkspacePhase,
} from "@/config/stream-questionnaire";
import type {
	WorkspaceQuestionId,
	WorkspaceQuestionSuggestion,
	WorkspaceQuestionSuggestionReviewScope,
} from "@/lib/types/workspace";

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

	const [sectionExpanded, setSectionExpanded] = useState<
		Record<string, boolean>
	>({});
	const [locallyEditedQuestions, setLocallyEditedQuestions] = useState<
		Record<string, true>
	>({});

	useEffect(() => {
		setSectionExpanded((current) => {
			const next = { ...current };
			for (const section of sections) {
				if (typeof next[section.section] !== "boolean") {
					next[section.section] = true;
				}
			}
			return next;
		});
	}, [sections]);

	useEffect(() => {
		setLocallyEditedQuestions((current) => {
			let changed = false;
			const next = { ...current };
			for (const questionId of Object.keys(next)) {
				if (!pendingSuggestions.has(questionId)) {
					delete next[questionId];
					changed = true;
				}
			}
			return changed ? next : current;
		});
	}, [pendingSuggestions]);

	return (
		<div className="flex flex-col gap-4">
			{phasePendingSuggestionCount > 0 ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
					<div className="flex items-center gap-2 text-sm text-foreground">
						<Badge variant="secondary" className="rounded-full">
							AI suggestions pending
						</Badge>
						<span>{phasePendingSuggestionCount} field(s) in this phase</span>
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={reviewingSuggestions}
							onClick={() =>
								onReviewSuggestion("reject", {
									kind: "phase",
									phase: activePhase,
								})
							}
						>
							Reject all (phase)
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={reviewingSuggestions}
							onClick={() =>
								onReviewSuggestion("accept", {
									kind: "phase",
									phase: activePhase,
								})
							}
						>
							Accept all (phase)
						</Button>
					</div>
				</div>
			) : null}

			{sections.map((section) => {
				const isExpanded = sectionExpanded[section.section] ?? true;
				const sectionPendingSuggestionCount =
					countPendingSuggestionsForQuestions(
						section.questions,
						pendingSuggestions,
					);
				const answeredCount = section.questions.filter(
					(question) =>
						resolveDisplayedAnswerValue(
							answers[question.id] ?? "",
							pendingSuggestions.get(question.id),
							Boolean(locallyEditedQuestions[question.id]),
						).trim().length > 0,
				).length;

				return (
					<section
						key={section.section}
						className="rounded-xl border bg-surface-container-lowest"
					>
						<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
							<button
								type="button"
								onClick={() =>
									setSectionExpanded((current) => ({
										...current,
										[section.section]: !isExpanded,
									}))
								}
								className="flex flex-1 items-center justify-between gap-3 text-left"
							>
								<div>
									<p className="text-xs uppercase tracking-[0.08em] text-secondary">
										Section
									</p>
									<h3 className="text-sm font-semibold text-foreground">
										{section.section}
									</h3>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="secondary" className="rounded-full">
										{answeredCount}/{section.questions.length} answered
									</Badge>
									{sectionPendingSuggestionCount > 0 ? (
										<Badge variant="secondary" className="rounded-full">
											{sectionPendingSuggestionCount} AI pending
										</Badge>
									) : null}
									{isExpanded ? (
										<ChevronDown
											aria-hidden
											className="size-4 text-secondary"
										/>
									) : (
										<ChevronRight
											aria-hidden
											className="size-4 text-secondary"
										/>
									)}
								</div>
							</button>

							{sectionPendingSuggestionCount > 0 ? (
								<div className="flex items-center gap-2">
									<Button
										type="button"
										size="sm"
										variant="outline"
										disabled={reviewingSuggestions}
										onClick={() =>
											onReviewSuggestion("reject", {
												kind: "section",
												section: section.section,
											})
										}
									>
										Reject all
									</Button>
									<Button
										type="button"
										size="sm"
										disabled={reviewingSuggestions}
										onClick={() =>
											onReviewSuggestion("accept", {
												kind: "section",
												section: section.section,
											})
										}
									>
										Accept all
									</Button>
								</div>
							) : null}
						</div>

						{isExpanded ? (
							<div className="grid gap-4 border-t px-4 py-4 md:grid-cols-2">
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
						) : null}
					</section>
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
						value={renderedValue}
						onChange={(event) => handleChange(event.target.value)}
						placeholder="Enter response"
						rows={4}
					/>
				);
			case "boolean": {
				const selectProps = renderedValue ? { value: renderedValue } : {};
				return (
					<Select {...selectProps} onValueChange={handleChange}>
						<SelectTrigger>
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
						type="number"
						value={renderedValue}
						onChange={(event) => handleChange(event.target.value)}
						placeholder="Enter number"
					/>
				);
			case "date":
				return (
					<Input
						type="date"
						value={renderedValue}
						onChange={(event) => handleChange(event.target.value)}
					/>
				);
			case "single_select":
			case "short_text":
				return (
					<Input
						value={renderedValue}
						onChange={(event) => handleChange(event.target.value)}
						placeholder="Enter response"
					/>
				);
		}
	})();

	return (
		<div className="space-y-2 rounded-lg bg-surface-container-low p-3 md:col-span-1">
			<div className="space-y-1">
				<p className="text-xs uppercase tracking-[0.08em] text-secondary">
					Q{question.number}
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<p className="text-sm font-medium text-foreground">
						{question.label}
					</p>
					{question.required ? (
						<Badge variant="secondary" className="rounded-full text-[10px]">
							Required
						</Badge>
					) : null}
					{suggestion ? (
						<Badge className="rounded-full text-[10px]">AI suggested</Badge>
					) : null}
				</div>
			</div>
			{control}
			{suggestion ? (
				<div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-2">
					{suggestion.hasConflict ? (
						<p className="text-xs text-muted-foreground">
							Current confirmed answer kept. AI alternative:
							<span className="ml-1 font-medium text-foreground">
								{suggestion.suggestedValue}
							</span>
						</p>
					) : (
						<p className="text-xs text-muted-foreground">
							AI value is shown inline. Accept to confirm or reject to clear it.
						</p>
					)}
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
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
