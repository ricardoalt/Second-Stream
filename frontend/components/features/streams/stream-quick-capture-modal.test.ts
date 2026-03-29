import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const modalModule = await import("./stream-quick-capture-modal");
const { projectsAPI } = await import("@/lib/api/projects");
const { workspaceAPI } = await import("@/lib/api/workspace");
const { useWorkspaceStore } = await import("@/lib/stores/workspace-store");

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

const originalUploadFile = projectsAPI.uploadFile;
const originalWorkspaceHydrate = workspaceAPI.hydrate;
const originalRefreshInsights = workspaceAPI.refreshInsights;

function buildHydrateResponse(fileId: string) {
	return {
		projectId: "project-1",
		baseFields: [],
		customFields: [],
		evidenceItems: [
			{
				id: fileId,
				filename: "quick-capture.txt",
				category: "general",
				processingStatus: "completed",
				uploadedAt: "2026-03-28T00:00:00.000Z",
				summary: null,
				facts: [],
				processingError: null,
			},
		],
		contextNote: null,
		questionnaireAnswers: {},
		questionnaireSuggestions: [],
		phaseProgress: { "1": false, "2": false, "3": false, "4": false },
		firstIncompletePhase: 1,
		derived: {
			summary: null,
			facts: [],
			missingInformation: [],
			informationCoverage: 0,
			readiness: { isReady: false, missingBaseFields: [] },
			lastRefreshedAt: null,
		},
	};
}

function buildRefreshResponse() {
	return {
		derived: {
			summary: "Updated",
			facts: [],
			missingInformation: [],
			informationCoverage: 12,
			readiness: { isReady: false, missingBaseFields: [] },
			lastRefreshedAt: "2026-03-28T00:00:00.000Z",
		},
		proposalBatch: {
			batchId: "batch-1",
			generatedAt: "2026-03-28T00:00:00.000Z",
			proposals: [],
		},
		questionnaireSuggestions: [],
	};
}

describe("stream quick capture modal orchestration", () => {
	beforeEach(() => {
		useWorkspaceStore.getState().reset();
		projectsAPI.uploadFile = originalUploadFile;
		workspaceAPI.hydrate = originalWorkspaceHydrate;
		workspaceAPI.refreshInsights = originalRefreshInsights;
	});

	afterEach(() => {
		projectsAPI.uploadFile = originalUploadFile;
		workspaceAPI.hydrate = originalWorkspaceHydrate;
		workspaceAPI.refreshInsights = originalRefreshInsights;
	});

	it("builds deterministic completion and retry feedback copy", () => {
		expect(
			modalModule.resolveQuickCaptureModalStatusMessage({
				quickCaptureStatus: "completed",
				backgroundHydrateError: null,
				uploadSessionFileCount: 0,
			}),
		).toEqual({
			variant: "success",
			text: "Quick Capture complete. Workspace evidence and suggestions were refreshed.",
		});

		expect(
			modalModule.resolveQuickCaptureModalStatusMessage({
				quickCaptureStatus: "pending",
				backgroundHydrateError: null,
				uploadSessionFileCount: 2,
			}),
		).toEqual({
			variant: "pending",
			text: "Waiting for 2 captured file(s) to appear in workspace evidence...",
		});

		expect(
			modalModule.resolveQuickCaptureModalStatusMessage({
				quickCaptureStatus: "retry_required",
				backgroundHydrateError: "Retry manually",
				uploadSessionFileCount: 0,
			}),
		).toEqual({
			variant: "error",
			text: "Retry manually",
		});
	});

	it("reuses workspace hydrate pipeline without direct analysis trigger", () => {
		expect(
			quickCaptureModalSource.includes("registerUploadedFile(upload.id)"),
		).toBe(true);
		expect(quickCaptureModalSource.includes("await hydrate(projectId)")).toBe(
			true,
		);
		expect(quickCaptureModalSource.includes("runAnalysis(")).toBe(false);
		expect(quickCaptureModalSource.includes("confirmProposals(")).toBe(false);
	});

	it("runs raw-text quick capture end-to-end through modal/store orchestration", async () => {
		const uploadMock = mock(async () => ({
			id: "text-file-1",
			filename: "quick-capture.txt",
			file_size: 24,
			file_type: "text/plain",
			category: "general",
			processing_status: "queued" as const,
			uploaded_at: "2026-03-28T00:00:00.000Z",
			message: "queued",
		}));
		const hydrateMock = mock(async () => buildHydrateResponse("text-file-1"));
		const refreshMock = mock(async () => buildRefreshResponse());

		projectsAPI.uploadFile = uploadMock;
		workspaceAPI.hydrate = hydrateMock;
		workspaceAPI.refreshInsights = refreshMock;

		const textFile = modalModule.createTextCaptureFile(
			"Field note with solvent evidence",
		);
		await modalModule.uploadQuickCaptureBatch({
			projectId: "project-1",
			items: [textFile],
			uploadFile: projectsAPI.uploadFile,
			registerUploadedFile: useWorkspaceStore.getState().registerUploadedFile,
			hydrate: useWorkspaceStore.getState().hydrate,
		});

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(uploadMock).toHaveBeenCalledTimes(1);
		expect(uploadMock).toHaveBeenCalledWith("project-1", expect.any(File), {
			category: "general",
			process_with_ai: true,
		});
		expect(hydrateMock).toHaveBeenCalledTimes(1);
		expect(refreshMock).toHaveBeenCalledTimes(1);

		const state = useWorkspaceStore.getState();
		expect(state.quickCaptureStatus).toBe("completed");
		expect(state.uploadSessionFileIds).toEqual([]);
		expect(state.backgroundHydrateError).toBeNull();
	});
});
