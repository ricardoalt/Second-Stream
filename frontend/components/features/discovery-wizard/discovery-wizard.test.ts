import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { routes } from "@/lib/routes";
import type { DiscoverySessionResult } from "@/lib/types/discovery";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const discoveryWizardModule = await import("./discovery-wizard");

function buildSession(
	overrides?: Partial<DiscoverySessionResult>,
): DiscoverySessionResult {
	return {
		id: "session-1",
		companyId: "company-1",
		status: "review_ready",
		startedAt: null,
		completedAt: null,
		processingError: null,
		sources: [],
		summary: {
			totalSources: 1,
			fileSources: 1,
			audioSources: 0,
			textSources: 0,
			locationsFound: 0,
			wasteStreamsFound: 0,
			draftsNeedingConfirmation: 0,
			failedSources: 0,
		},
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("confirmTerminalDiscoverySnapshot", () => {
	it("uses confirmed terminal snapshot when second fetch has final summary", async () => {
		const textSource = {
			id: "source-1",
			sourceType: "text" as const,
			status: "review_ready" as const,
			sourceFilename: null,
			contentType: null,
			sizeBytes: null,
			textLength: 42,
			textPreview: "Detected source text",
			importRunId: null,
			voiceInterviewId: null,
			processingError: null,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		};
		const initialTerminal = buildSession({
			sources: [textSource],
			summary: {
				totalSources: 1,
				fileSources: 1,
				audioSources: 0,
				textSources: 0,
				locationsFound: 0,
				wasteStreamsFound: 0,
				draftsNeedingConfirmation: 0,
				failedSources: 0,
			},
		});
		const confirmedTerminal = buildSession({
			sources: [textSource],
			summary: {
				totalSources: 1,
				fileSources: 1,
				audioSources: 0,
				textSources: 0,
				locationsFound: 2,
				wasteStreamsFound: 3,
				draftsNeedingConfirmation: 3,
				failedSources: 0,
			},
		});

		const result = await discoveryWizardModule.confirmTerminalDiscoverySnapshot(
			{
				sessionId: "session-1",
				terminalSession: initialTerminal,
				getSession: async () => confirmedTerminal,
			},
		);

		expect(result.summary.locationsFound).toBe(2);
		expect(result.summary.wasteStreamsFound).toBe(3);
		expect(result.summary.draftsNeedingConfirmation).toBe(3);
		expect(discoveryWizardModule.sourceStatusLabel("review_ready")).toBe(
			"Processed",
		);
		expect(discoveryWizardModule.sourceStatusLabel("failed")).toBe(
			"Needs attention",
		);
		expect(discoveryWizardModule.sourceStatusLabel("processing")).toBe(
			"Processing",
		);
		expect(discoveryWizardModule.sourceTypeLabel("file")).toBe("File");
		expect(discoveryWizardModule.sourceTypeLabel("audio")).toBe("Audio");
		expect(discoveryWizardModule.sourceTypeLabel("text")).toBe("Text");
		expect(discoveryWizardModule.sourceDisplayLabel(textSource)).toBe(
			"Detected source text",
		);
	});

	it("falls back to original failed payload if confirmation fetch errors", async () => {
		const failedSession = buildSession({
			status: "failed",
			processingError: "Extraction failed",
		});

		const result = await discoveryWizardModule.confirmTerminalDiscoverySnapshot(
			{
				sessionId: "session-1",
				terminalSession: failedSession,
				getSession: async () => {
					throw new Error("network");
				},
			},
		);

		expect(result.status).toBe("failed");
		expect(result.processingError).toBe("Extraction failed");
	});
});

describe("navigateToSessionScopedDashboard", () => {
	it("navigates to needs confirmation scoped by discovery session", () => {
		let openedSessionId: string | null = null;
		let closed = false;
		let pushedPath: string | null = null;

		discoveryWizardModule.navigateToSessionScopedDashboard({
			sessionId: "session-42",
			openNeedsConfirmationForSession: (sessionId: string) => {
				openedSessionId = sessionId;
			},
			closeWizard: () => {
				closed = true;
			},
			push: (href: string) => {
				pushedPath = href;
			},
		});

		expect(openedSessionId).toBe("session-42");
		expect(closed).toBe(true);
		expect(pushedPath).toBe(routes.dashboard);
	});
});

describe("ResultView", () => {
	it("renders only two metrics, helper copy, and analyzed sources", () => {
		const html = renderToStaticMarkup(
			createElement(discoveryWizardModule.ResultView, {
				result: buildSession({
					sources: [
						{
							id: "src-file",
							sourceType: "file",
							status: "review_ready",
							sourceFilename: "streams.csv",
							contentType: "text/csv",
							sizeBytes: 123,
							textLength: null,
							textPreview: null,
							importRunId: null,
							voiceInterviewId: null,
							processingError: null,
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-01-01T00:00:00Z",
						},
						{
							id: "src-audio",
							sourceType: "audio",
							status: "failed",
							sourceFilename: "voice.m4a",
							contentType: "audio/mp4",
							sizeBytes: 456,
							textLength: null,
							textPreview: null,
							importRunId: null,
							voiceInterviewId: null,
							processingError: "failed",
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-01-01T00:00:00Z",
						},
					],
					summary: {
						totalSources: 2,
						fileSources: 1,
						audioSources: 1,
						textSources: 0,
						locationsFound: 1,
						wasteStreamsFound: 3,
						draftsNeedingConfirmation: 3,
						failedSources: 1,
					},
				}),
				onGoToDashboard: () => {},
			}),
		);

		expect(html).toContain("Waste-streams found");
		expect(html).toContain("Locations found");
		expect(html).not.toContain(">drafts for review<");
		expect(html).toContain("Locations are prefilled inside each draft.");
		expect(html).toContain("Sources analyzed");
		expect(html).toContain("streams.csv");
		expect(html).toContain("voice.m4a");
		expect(html).toContain("Processed");
		expect(html).toContain("Needs attention");
	});
});
