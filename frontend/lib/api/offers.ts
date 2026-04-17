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
	offerId: string;
	projectId: string | null;
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
	offerId: string;
	projectId: string | null;
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
	offerId: string;
	projectId: string | null;
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
	offerId: string;
	projectId: string | null;
	displayTitle: string | null;
	sourceType: "stream" | "manual";
	contextCard: {
		title: "Stream snapshot" | "Offer context";
		description: string | null;
		fields: Array<{ label: string; value: string | null }>;
	};
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
	offerId: string;
	projectId: string | null;
	followUpState: ProposalFollowUpState;
	updatedAt: string;
}

export type ManualOfferInitialStatus =
	| "uploaded"
	| "waiting_to_send"
	| "waiting_response"
	| "under_negotiation";

export interface CreateManualOfferPayload {
	client: string;
	location: string;
	title: string;
	initialStatus: ManualOfferInitialStatus;
	file: File;
}

export const offersAPI = {
	async getPipeline(): Promise<OfferPipelineResponseDTO> {
		return fetchWithClientDataCache({
			key: "offers:pipeline",
			ttlMs: OFFERS_CACHE_TTL_MS,
			fetcher: () =>
				apiClient.get<OfferPipelineResponseDTO>("/offers/pipeline"),
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
					`/offers/archive${suffix}`,
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

	async getOfferDetail(offerId: string): Promise<OfferDetailDTO> {
		return apiClient.get<OfferDetailDTO>(`/offers/${offerId}`);
	},

	async createManualOffer(
		payload: CreateManualOfferPayload,
	): Promise<OfferDetailDTO> {
		return apiClient.uploadFile<OfferDetailDTO>("/offers", payload.file, {
			client: payload.client,
			location: payload.location,
			title: payload.title,
			initial_status: payload.initialStatus,
		});
	},

	async updateOfferFollowUpState(
		offerId: string,
		state: ProposalFollowUpState,
	): Promise<OfferFollowUpStateUpdateResponse> {
		const response = await apiClient.patch<{
			offerId: string;
			projectId: string;
			followUpState: ProposalFollowUpState;
			updatedAt: string;
		}>(`/offers/${offerId}/status`, { state });

		return {
			offerId: response.offerId,
			projectId: response.projectId,
			followUpState: response.followUpState,
			updatedAt: response.updatedAt,
		};
	},

	async refreshOfferInsights(projectId: string): Promise<OfferDetailDTO> {
		return apiClient.post<OfferDetailDTO>(
			`/projects/${projectId}/offer/refresh-insights`,
		);
	},

	async uploadOfferDocument(offerId: string, file: File) {
		return apiClient.uploadFile(`/offers/${offerId}/document`, file);
	},

	async transitionOfferFollowUpState(
		offerId: string,
		nextState: ProposalFollowUpState,
	): Promise<OfferDetailDTO> {
		await offersAPI.updateOfferFollowUpState(offerId, nextState);
		return offersAPI.getOfferDetail(offerId);
	},
};
