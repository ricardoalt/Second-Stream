import {
	resolveEffectiveProposalFollowUpState,
	selectDeterministicOfferProposal,
} from "@/components/features/offers/utils";
import { projectsAPI } from "@/lib/api/projects";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import type { ProposalDTO } from "@/lib/types/proposal-dto";
import { apiClient } from "./client";

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
	projectName: string;
	companyLabel: string | null;
	locationLabel: string | null;
	proposalFollowUpState: ProposalFollowUpState;
	proposal: ProposalDTO;
}

export interface OfferFollowUpStateUpdateResponse {
	projectId: string;
	proposalFollowUpState: ProposalFollowUpState;
	updatedAt: string;
}

export const offersAPI = {
	async getPipeline(): Promise<OfferPipelineResponseDTO> {
		return apiClient.get<OfferPipelineResponseDTO>("/projects/offers/pipeline");
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
		const response = await apiClient.get<OfferArchiveBackendResponseDTO>(
			`/projects/offers/archive${suffix}`,
		);

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
		const project = await projectsAPI.getProject(projectId);
		const selected = selectDeterministicOfferProposal(project.proposals);
		if (!selected) {
			throw new Error("No active offer proposal found for this project.");
		}

		const effectiveFollowUpState = resolveEffectiveProposalFollowUpState(
			project.proposalFollowUpState,
			project.proposals.length,
		);
		if (!effectiveFollowUpState) {
			throw new Error("Offer follow-up state is unavailable for this project.");
		}

		return {
			projectId: project.id,
			projectName: project.name,
			companyLabel: project.companyName ?? null,
			locationLabel: project.locationName ?? null,
			proposalFollowUpState: effectiveFollowUpState,
			proposal: selected,
		};
	},

	async updateOfferFollowUpState(
		projectId: string,
		state: ProposalFollowUpState,
	): Promise<OfferFollowUpStateUpdateResponse> {
		return apiClient.patch<OfferFollowUpStateUpdateResponse>(
			`/projects/${projectId}/proposal-follow-up-state`,
			{ state },
		);
	},

	async transitionOfferFollowUpState(
		projectId: string,
		nextState: ProposalFollowUpState,
	): Promise<OfferDetailDTO> {
		await offersAPI.updateOfferFollowUpState(projectId, nextState);
		return offersAPI.getOfferDetail(projectId);
	},
};
