export type DiscoverySessionStatus =
	| "draft"
	| "uploading"
	| "processing"
	| "review_ready"
	| "partial_failure"
	| "failed";

export type DiscoverySourceType = "file" | "audio" | "text";

export type DiscoverySourceStatus =
	| "uploaded"
	| "processing"
	| "review_ready"
	| "failed";

export interface DiscoverySource {
	id: string;
	sourceType: DiscoverySourceType;
	status: DiscoverySourceStatus;
	sourceFilename: string | null;
	contentType: string | null;
	sizeBytes: number | null;
	textLength: number | null;
	textPreview: string | null;
	importRunId: string | null;
	voiceInterviewId: string | null;
	processingError: string | null;
	createdAt: string;
	updatedAt: string;
}

export type CandidateStatus = "pending" | "confirmed" | "skipped";

export type DraftCandidate = {
	itemId: string;
	runId: string;
	clientId: string | null;
	locationId: string | null;
	material: string;
	volume: string | null;
	frequency?: string | null;
	units?: string | null;
	locationLabel: string | null;
	source: string;
	confidence: number | null;
	status: CandidateStatus;
};

export interface DiscoverySessionSummary {
	totalSources: number;
	fileSources: number;
	audioSources: number;
	textSources: number;
	locationsFound: number;
	wasteStreamsFound: number;
	draftsNeedingConfirmation: number;
	failedSources: number;
}

export interface DiscoverySessionResult {
	id: string;
	companyId: string;
	status: DiscoverySessionStatus;
	startedAt: string | null;
	completedAt: string | null;
	processingError: string | null;
	sources: DiscoverySource[];
	summary: DiscoverySessionSummary;
	createdAt: string;
	updatedAt: string;
}

export type DiscoverySessionCreateResponse = DiscoverySessionResult;
