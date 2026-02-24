import { describe, expect, it } from "bun:test";
import { pollVoiceInterviewUntilReady } from "./voice-interview-polling";

describe("pollVoiceInterviewUntilReady", () => {
	it("unlocks actions on failed status", async () => {
		let doneCalls = 0;
		const errors: string[] = [];

		await pollVoiceInterviewUntilReady({
			voiceInterviewId: "v1",
			runId: "r1",
			getDetails: async () => ({ status: "failed", errorCode: "voice_failed" }),
			onReady: async () => {},
			onSuccess: () => {},
			onError: (message) => errors.push(message),
			onCloseAfterReady: () => {},
			onDone: () => {
				doneCalls += 1;
			},
			maxAttempts: 1,
			intervalMs: 0,
		});

		expect(doneCalls).toBe(1);
		expect(errors[0]).toBe("voice_failed");
	});

	it("unlocks actions on timeout", async () => {
		let doneCalls = 0;
		const errors: string[] = [];

		await pollVoiceInterviewUntilReady({
			voiceInterviewId: "v2",
			runId: "r2",
			getDetails: async () => ({ status: "queued", errorCode: null }),
			onReady: async () => {},
			onSuccess: () => {},
			onError: (message) => errors.push(message),
			onCloseAfterReady: () => {},
			onDone: () => {
				doneCalls += 1;
			},
			maxAttempts: 1,
			intervalMs: 0,
		});

		expect(doneCalls).toBe(1);
		expect(errors[0]).toBe(
			"Voice interview is still processing. Refresh later.",
		);
	});
});
