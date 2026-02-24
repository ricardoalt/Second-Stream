export async function pollVoiceInterviewUntilReady(params: {
	voiceInterviewId: string;
	runId: string;
	getDetails: (voiceInterviewId: string) => Promise<{
		status:
			| "review_ready"
			| "partial_finalized"
			| "finalized"
			| "failed"
			| string;
		errorCode: string | null;
	}>;
	onReady: (payload: {
		runId: string;
		voiceInterviewId: string;
	}) => Promise<void>;
	onSuccess: (message: string) => void;
	onError: (message: string) => void;
	onCloseAfterReady: () => void;
	onDone: () => void;
	maxAttempts?: number;
	intervalMs?: number;
}): Promise<void> {
	const {
		voiceInterviewId,
		runId,
		getDetails,
		onReady,
		onSuccess,
		onError,
		onCloseAfterReady,
		onDone,
		maxAttempts = 120,
		intervalMs = 3000,
	} = params;
	try {
		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			const details = await getDetails(voiceInterviewId);
			if (
				details.status === "review_ready" ||
				details.status === "partial_finalized" ||
				details.status === "finalized"
			) {
				await onReady({ runId, voiceInterviewId });
				onSuccess("Voice interview ready for review");
				onCloseAfterReady();
				return;
			}
			if (details.status === "failed") {
				onError(details.errorCode ?? "Voice interview failed");
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
		onError("Voice interview is still processing. Refresh later.");
	} catch (error) {
		onError(error instanceof Error ? error.message : "Voice polling failed");
	} finally {
		onDone();
	}
}
