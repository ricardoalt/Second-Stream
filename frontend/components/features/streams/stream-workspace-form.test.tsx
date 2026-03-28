import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { WorkspaceQuestionSuggestion } from "@/lib/types/workspace";
import {
	buildPendingSuggestionMap,
	resolveDisplayedAnswerValue,
	StreamWorkspaceForm,
} from "./stream-workspace-form";

const baseSuggestion: WorkspaceQuestionSuggestion = {
	questionId: "q1",
	suggestedValue: "AI inferred stream name",
	status: "pending",
	phase: 1,
	section: "Stream Snapshot",
	evidenceRefs: [],
	confidence: 88,
	updatedAt: "2026-03-27T00:00:00.000Z",
	hasConflict: false,
	confirmedAnswer: null,
};

describe("stream workspace form AI review", () => {
	it("keeps only pending suggestions in pending map", () => {
		const pending = buildPendingSuggestionMap([
			baseSuggestion,
			{ ...baseSuggestion, questionId: "q2", status: "rejected" },
		]);

		expect(pending.size).toBe(1);
		expect(pending.get("q1")?.suggestedValue).toBe("AI inferred stream name");
		expect(pending.has("q2")).toBe(false);
	});

	it("renders AI value inline unless it conflicts", () => {
		expect(resolveDisplayedAnswerValue("", baseSuggestion)).toBe(
			"AI inferred stream name",
		);
		expect(
			resolveDisplayedAnswerValue("Manual override", baseSuggestion, true),
		).toBe("Manual override");
		expect(
			resolveDisplayedAnswerValue("Human confirmed", {
				...baseSuggestion,
				hasConflict: true,
				suggestedValue: "Alternative value",
				confirmedAnswer: "Human confirmed",
			}),
		).toBe("Human confirmed");
	});

	it("shows field, section, and phase review controls for AI suggestions", () => {
		const markup = renderToStaticMarkup(
			<StreamWorkspaceForm
				activePhase={1}
				answers={{}}
				suggestions={[baseSuggestion]}
				reviewingSuggestions={false}
				onAnswerChange={() => {}}
				onReviewSuggestion={() => {}}
			/>,
		);

		expect(markup.includes("AI suggested")).toBe(true);
		expect(markup.includes("Accept")).toBe(true);
		expect(markup.includes("Reject")).toBe(true);
		expect(markup.includes("Accept all (phase)")).toBe(true);
		expect(markup.includes("Reject all (phase)")).toBe(true);
		expect(markup.includes("Accept all")).toBe(true);
		expect(markup.includes("Reject all")).toBe(true);
	});

	it("shows conflict alternative copy inline when confirmed answer exists", () => {
		const markup = renderToStaticMarkup(
			<StreamWorkspaceForm
				activePhase={1}
				answers={{ q1: "Human confirmed" }}
				suggestions={[
					{
						...baseSuggestion,
						hasConflict: true,
						confirmedAnswer: "Human confirmed",
						suggestedValue: "AI alternative",
					},
				]}
				reviewingSuggestions={false}
				onAnswerChange={() => {}}
				onReviewSuggestion={() => {}}
			/>,
		);

		expect(
			markup.includes("Current confirmed answer kept. AI alternative:"),
		).toBe(true);
		expect(markup.includes("AI alternative")).toBe(true);
	});
});
