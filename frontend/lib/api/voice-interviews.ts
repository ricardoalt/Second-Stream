import { apiClient } from "./client";

export type VoiceInterviewStatus =
	| "uploaded"
	| "queued"
	| "transcribing"
	| "extracting"
	| "review_ready"
	| "partial_finalized"
	| "finalized"
	| "failed";

export interface VoiceInterviewCreateResponse {
	voiceInterviewId: string;
	bulkImportRunId: string;
	status: VoiceInterviewStatus;
}

export interface VoiceInterviewDetails {
	id: string;
	bulkImportRunId: string;
	status: VoiceInterviewStatus;
	errorCode: string | null;
	failedStage: "transcribing" | "extracting" | null;
	processingAttempts: number;
	audioRetentionExpiresAt: string;
	transcriptRetentionExpiresAt: string;
}

export interface VoiceInterviewRetryResponse {
	id: string;
	status: VoiceInterviewStatus;
	processingAttempts: number;
	failedStage: "transcribing" | "extracting" | null;
}

export interface VoiceInterviewAudioUrlResponse {
	audioUrl: string;
	expiresInSeconds: number;
}

export interface VoiceInterviewTranscriptSegment {
	text: string;
	startSec: number;
	endSec: number;
	speakerLabel: string | null;
}

export interface VoiceInterviewTranscriptResponse {
	transcriptText: string;
	segments: VoiceInterviewTranscriptSegment[];
}

const BASE = "/voice-interviews";

export const voiceInterviewsApi = {
	async create(payload: {
		audioFile: File;
		companyId: string;
		locationId?: string;
		consentGiven: boolean;
	}): Promise<VoiceInterviewCreateResponse> {
		const formData = new FormData();
		formData.append("audio_file", payload.audioFile);
		formData.append("company_id", payload.companyId);
		formData.append("consent_given", String(payload.consentGiven));
		if (payload.locationId) {
			formData.append("location_id", payload.locationId);
		}
		return apiClient.post<VoiceInterviewCreateResponse>(BASE, formData);
	},

	async get(id: string): Promise<VoiceInterviewDetails> {
		return apiClient.get<VoiceInterviewDetails>(`${BASE}/${id}`);
	},

	async retry(
		id: string,
		idempotencyKey: string,
	): Promise<VoiceInterviewRetryResponse> {
		return apiClient.post<VoiceInterviewRetryResponse>(
			`${BASE}/${id}/retry`,
			undefined,
			{
				"Idempotency-Key": idempotencyKey,
			},
		);
	},

	async getAudioUrl(id: string): Promise<VoiceInterviewAudioUrlResponse> {
		return apiClient.get<VoiceInterviewAudioUrlResponse>(
			`${BASE}/${id}/audio-url`,
		);
	},

	async getTranscript(id: string): Promise<VoiceInterviewTranscriptResponse> {
		return apiClient.get<VoiceInterviewTranscriptResponse>(
			`${BASE}/${id}/transcript`,
		);
	},
};
