import { describe, expect, it } from "bun:test";
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
		const initialTerminal = buildSession({
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
