import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import { fetchWithClientDataCache } from "@/lib/utils/client-data-cache";
import { apiClient } from "./client";

const OFFERS_CACHE_TTL_MS = 60_000;

type OfferPipelineBackendState =
	| "uploaded"
	| "waiting_to_send"
	| "waiting_response"
	| "under_negotiation";

type OfferArchiveBackendState = "accepted" | "declined";
type OfferArchivePossiblyLegacyState = OfferArchiveBackendState | "rejected";

export interface OfferPipelineRowDTO {
	projectId: string;
	streamName: string;
	companyLabel: string | null;
	locationLabel: string | null;
	proposalFollowUpState: OfferPipelineBackendState;
	latestProposalId: string | null;
	latestProposalVersion: string | null;
	latestProposalTitle: string | null;
	valueUsd: number | null;
	lastActivityAt: string;
}

export interface OfferPipelineResponseDTO {
	counts: {
		total: number;
		uploaded: number;
		waitingToSend: number;
		waitingResponse: number;
		underNegotiation: number;
	};
	items: OfferPipelineRowDTO[];
}

export interface OfferArchiveRowDTO {
	projectId: string;
	streamName: string;
	companyLabel: string | null;
	locationLabel: string | null;
	proposalFollowUpState: OfferArchiveBackendState;
	latestProposalId: string | null;
	latestProposalVersion: string | null;
	latestProposalTitle: string | null;
	valueUsd: number | null;
	lastActivityAt: string;
	archivedAt: string;
}

interface OfferArchiveBackendRowDTO {
	projectId: string;
	streamName: string;
	companyLabel: string | null;
	locationLabel: string | null;
	proposalFollowUpState: OfferArchivePossiblyLegacyState;
	latestProposalId: string | null;
	latestProposalVersion: string | null;
	latestProposalTitle: string | null;
	valueUsd: number | null;
	lastActivityAt: string;
	archivedAt: string;
}

interface OfferArchiveBackendResponseDTO {
	counts: {
		total: number;
		accepted: number;
		declined: number;
	};
	items: OfferArchiveBackendRowDTO[];
}

export interface OfferArchiveResponseDTO {
	counts: {
		total: number;
		accepted: number;
		declined: number;
	};
	items: OfferArchiveRowDTO[];
}

export function normalizeOfferArchiveState(
	state: OfferArchivePossiblyLegacyState,
): OfferArchiveBackendState {
	return state === "rejected" ? "declined" : state;
}

export interface OfferDetailDTO {
	projectId: string;
	streamSnapshot: {
		materialType: string | null;
		materialName: string | null;
		composition: string | null;
		volume: string | null;
		frequency: string | null;
	};
	followUpState: ProposalFollowUpState | null;
	insights: {
		summary: string;
		keyPoints: string[];
		risks: string[];
		recommendations: string[];
		freshness: {
			generatedAt: string | null;
			sourceUpdatedAt: string | null;
			isStale: boolean;
		};
	} | null;
	offerDocument: {
		fileId: string;
		filename: string;
		mimeType: string | null;
		fileSize: number | null;
		uploadedAt: string;
	} | null;
}

export interface OfferFollowUpStateUpdateResponse {
	projectId: string;
	followUpState: ProposalFollowUpState;
	updatedAt: string;
}

export const offersAPI = {
	async getPipeline(): Promise<OfferPipelineResponseDTO> {
		return fetchWithClientDataCache({
			key: "offers:pipeline",
			ttlMs: OFFERS_CACHE_TTL_MS,
			fetcher: () =>
				apiClient.get<OfferPipelineResponseDTO>("/projects/offers/pipeline"),
		});
	},

	async getArchive(params?: {
		search?: string;
		status?: OfferArchiveBackendState;
	}): Promise<OfferArchiveResponseDTO> {
		const query = new URLSearchParams();
		if (params?.search && params.search.trim().length > 0) {
			query.set("search", params.search.trim());
		}
		if (params?.status) {
			query.set("status", params.status);
		}

		const suffix = query.size > 0 ? `?${query.toString()}` : "";
		const response = await fetchWithClientDataCache({
			key: `offers:archive:${suffix}`,
			ttlMs: OFFERS_CACHE_TTL_MS,
			fetcher: () =>
				apiClient.get<OfferArchiveBackendResponseDTO>(
					`/projects/offers/archive${suffix}`,
				),
		});

		return {
			counts: response.counts,
			items: response.items.map((item) => ({
				...item,
				proposalFollowUpState: normalizeOfferArchiveState(
					item.proposalFollowUpState,
				),
			})),
		};
	},

	async getOfferDetail(projectId: string): Promise<OfferDetailDTO> {
		return apiClient.get<OfferDetailDTO>(`/projects/${projectId}/offer`);
	},

	async updateOfferFollowUpState(
		projectId: string,
		state: ProposalFollowUpState,
	): Promise<OfferFollowUpStateUpdateResponse> {
		const response = await apiClient.patch<{
			projectId: string;
			proposalFollowUpState: ProposalFollowUpState;
			updatedAt: string;
		}>(`/projects/${projectId}/proposal-follow-up-state`, { state });

		return {
			projectId: response.projectId,
			followUpState: response.proposalFollowUpState,
			updatedAt: response.updatedAt,
		};
	},

	async refreshOfferInsights(projectId: string): Promise<OfferDetailDTO> {
		return apiClient.post<OfferDetailDTO>(
			`/projects/${projectId}/offer/refresh-insights`,
		);
	},

	async uploadOfferDocument(projectId: string, file: File) {
		return apiClient.uploadFile(`/projects/${projectId}/files`, file, {
			category: "offer_document",
			process_with_ai: false,
		});
	},

	async transitionOfferFollowUpState(
		projectId: string,
		nextState: ProposalFollowUpState,
	): Promise<OfferDetailDTO> {
		await offersAPI.updateOfferFollowUpState(projectId, nextState);
		return offersAPI.getOfferDetail(projectId);
	},
};
