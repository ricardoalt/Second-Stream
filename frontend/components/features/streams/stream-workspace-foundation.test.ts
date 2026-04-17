import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	STREAM_WORKSPACE_PHASES,
	STREAM_WORKSPACE_QUESTIONS_BY_PHASE,
} from "@/config/stream-questionnaire";
import { groupQuestionsBySection } from "./stream-workspace-form";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const streamDetailModule = await import("./stream-detail-page-content");

const workspaceShellSource = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"streams",
		"stream-detail-page-content.tsx",
	),
	"utf8",
);

const quickCaptureModalSource = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"streams",
		"stream-quick-capture-modal.tsx",
	),
	"utf8",
);

const quickCaptureCardSource = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"streams",
		"stream-quick-capture-card.tsx",
	),
	"utf8",
);

const filesPageSource = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"streams",
		"stream-files-page-content.tsx",
	),
	"utf8",
);

const contactsPageSource = readFileSync(
	join(
		process.cwd(),
		"components",
		"features",
		"streams",
		"stream-contacts-page-content.tsx",
	),
	"utf8",
);

describe("stream workspace foundation verification", () => {
	it("defaults to first incomplete phase when phase was not manually selected", () => {
		expect(
			streamDetailModule.resolveWorkspaceActivePhase({
				activePhase: 4,
				firstIncompletePhase: 2,
				phaseManuallySelected: false,
			}),
		).toBe(2);
	});

	it("keeps manually selected phase instead of forcing first incomplete", () => {
		expect(
			streamDetailModule.resolveWorkspaceActivePhase({
				activePhase: 3,
				firstIncompletePhase: 1,
				phaseManuallySelected: true,
			}),
		).toBe(3);
	});

	it("renders progress summary from backend phase progress map", () => {
		const completion = streamDetailModule.buildPhaseCompletion({
			"1": true,
			"2": false,
			"3": true,
			"4": false,
		});

		expect(completion).toEqual({
			1: true,
			2: false,
			3: true,
			4: false,
		});
		expect(streamDetailModule.countCompletedPhases(completion)).toBe(2);
	});

	it("keeps canonical four-phase grouping and question ranges", () => {
		expect(STREAM_WORKSPACE_PHASES).toHaveLength(4);
		expect(STREAM_WORKSPACE_QUESTIONS_BY_PHASE[1]).toHaveLength(9);
		expect(STREAM_WORKSPACE_QUESTIONS_BY_PHASE[2]).toHaveLength(5);
		expect(STREAM_WORKSPACE_QUESTIONS_BY_PHASE[3]).toHaveLength(6);
		expect(STREAM_WORKSPACE_QUESTIONS_BY_PHASE[4]).toHaveLength(11);
	});

	it("groups phase 4 questions into Project Driver and Later-stage commercial fields", () => {
		const grouped = groupQuestionsBySection(
			STREAM_WORKSPACE_QUESTIONS_BY_PHASE[4],
		);

		expect(grouped.map((section) => section.section)).toEqual([
			"Project Driver",
			"Later-stage commercial fields",
		]);
		expect(grouped[0]?.questions).toHaveLength(5);
		expect(grouped[1]?.questions).toHaveLength(6);
	});

	it("keeps top stepper as the only phase progression control", () => {
		expect(
			workspaceShellSource.match(/<StreamPhaseStepper/g)?.length ?? 0,
		).toBe(1);
		expect(
			workspaceShellSource.includes("onPhaseSelect={handlePhaseSelect}"),
		).toBe(true);
	});

	it("renders Files and Contacts actions in workspace header", () => {
		expect(/>\s*Files\s*</.test(workspaceShellSource)).toBe(true);
		expect(/>\s*Contacts\s*</.test(workspaceShellSource)).toBe(true);
		expect(workspaceShellSource.includes("/files")).toBe(true);
		expect(workspaceShellSource.includes("/contacts")).toBe(true);
	});

	it("provides clear back-to-workspace affordance on support pages", () => {
		expect(/>\s*Back to workspace\s*</.test(filesPageSource)).toBe(true);
		expect(/>\s*Back to workspace\s*</.test(contactsPageSource)).toBe(true);
	});

	it("scopes right rail to Quick Capture only", () => {
		expect(workspaceShellSource.includes("<aside")).toBe(true);
		expect(workspaceShellSource.includes("<StreamQuickCaptureCard")).toBe(true);
		expect(workspaceShellSource.includes("Admin Communication")).toBe(false);
	});

	it("opens unified Quick Capture modal with files, audio, and raw text sections", () => {
		expect(workspaceShellSource.includes("setQuickCaptureOpen(true)")).toBe(
			true,
		);
		expect(workspaceShellSource.includes("<StreamQuickCaptureModal")).toBe(
			true,
		);
		expect(workspaceShellSource.includes("open={quickCaptureOpen}")).toBe(true);

		expect(/>\s*Quick Capture\s*</.test(quickCaptureModalSource)).toBe(true);
		expect(/>\s*Files\s*</.test(quickCaptureModalSource)).toBe(true);
		expect(/>\s*Audio\s*</.test(quickCaptureModalSource)).toBe(true);
		expect(/>\s*Raw text\s*</.test(quickCaptureModalSource)).toBe(true);
	});

	it("keeps workspace quick capture actions scoped to supported modes", () => {
		expect(quickCaptureCardSource.includes('label: "Upload"')).toBe(true);
		expect(quickCaptureCardSource.includes('label: "Voice"')).toBe(true);
		expect(quickCaptureCardSource.includes('label: "Paste"')).toBe(true);
		expect(quickCaptureCardSource.includes("audio")).toBe(true);
	});

	it("surfaces capture completion/recovery feedback in workspace shell", () => {
		expect(
			streamDetailModule.resolveWorkspaceQuickCaptureFeedback({
				quickCaptureStatus: "completed",
				backgroundHydrateError: null,
			}),
		).toEqual({
			tone: "success",
			title: "Capture completed",
			description:
				"Workspace evidence is visible and suggestions are up to date.",
		});

		expect(
			streamDetailModule.resolveWorkspaceQuickCaptureFeedback({
				quickCaptureStatus: "retry_required",
				backgroundHydrateError: "Retry now",
			}),
		).toEqual({
			tone: "error",
			title: "Manual retry needed",
			description: "Retry now",
			actionLabel: "Open Quick Capture",
		});
	});

	it("shows Complete Discovery CTA only in workspace shell", () => {
		expect(workspaceShellSource.includes("Complete Discovery")).toBe(true);
		expect(workspaceShellSource.includes("Update Discovery")).toBe(true);
		expect(workspaceShellSource.includes("Complete Discovery?")).toBe(true);
		expect(workspaceShellSource.includes("Update Discovery?")).toBe(true);
		expect(
			workspaceShellSource.includes(
				"This confirms discovery and opens the Offer detail",
			),
		).toBe(true);
		expect(
			workspaceShellSource.includes(
				"This refreshes discovery context and opens the Offer detail",
			),
		).toBe(true);
	});

	it("keeps Update Discovery enabled after completion while preserving save/submitting guards", () => {
		expect(
			streamDetailModule.resolveCompleteDiscoveryDisabled({
				completeDiscoveryStatus: "idle",
				questionnaireAnswersDirty: false,
				questionnaireSaveStatus: "idle",
			}),
		).toBe(false);

		expect(
			streamDetailModule.resolveCompleteDiscoveryDisabled({
				completeDiscoveryStatus: "submitting",
				questionnaireAnswersDirty: false,
				questionnaireSaveStatus: "idle",
			}),
		).toBe(true);

		expect(
			streamDetailModule.resolveCompleteDiscoveryDisabled({
				completeDiscoveryStatus: "idle",
				questionnaireAnswersDirty: true,
				questionnaireSaveStatus: "idle",
			}),
		).toBe(true);

		expect(
			streamDetailModule.resolveCompleteDiscoveryDisabled({
				completeDiscoveryStatus: "idle",
				questionnaireAnswersDirty: false,
				questionnaireSaveStatus: "saving",
			}),
		).toBe(true);
	});

	it("builds Offer detail href with offer context", () => {
		expect(
			streamDetailModule.buildOfferDetailHref({
				offerId: "offer-123",
			}),
		).toBe("/offers/offer-123");
	});

	it("keeps complete discovery aligned to offer-scoped handoff", () => {
		expect(workspaceShellSource.includes("response.offer.offerId")).toBe(true);
		expect(workspaceShellSource.includes("response.offer.proposalId")).toBe(
			false,
		);
	});
});
