/**
 * Dashboard API client — dedicated endpoint for dashboard triage projection.
 * Backend: GET /projects/dashboard
 */

import type { ArchivedFilter } from "@/lib/api/companies";
import type {
	DashboardBucket,
	DashboardListResponse,
	DraftItemRow,
	ProposalFollowUpState,
} from "@/lib/types/dashboard";
import { fetchWithClientDataCache } from "@/lib/utils/client-data-cache";
import { isDraftItem } from "@/lib/types/dashboard";
import { apiClient } from "./client";

const DASHBOARD_CACHE_TTL_MS = 45_000;

export interface DashboardParams {
	bucket?: DashboardBucket | undefined;
	page?: number | undefined;
	size?: number | undefined;
	search?: string | undefined;
	archived?: ArchivedFilter | undefined;
	companyId?: string | undefined;
	discoverySessionId?: string | undefined;
	proposalFollowUpState?: ProposalFollowUpState | undefined;
	signal?: AbortSignal | undefined;
}

export interface ProposalFollowUpStateUpdateResponse {
	projectId: string;
	proposalFollowUpState: ProposalFollowUpState;
	updatedAt: string;
}

export const dashboardAPI = {
	async getDashboard(params?: DashboardParams): Promise<DashboardListResponse> {
		const searchParams = new URLSearchParams();

		if (params?.bucket) searchParams.append("bucket", params.bucket);
		if (params?.page) searchParams.append("page", params.page.toString());
		if (params?.size) searchParams.append("size", params.size.toString());
		if (params?.search) searchParams.append("search", params.search);
		if (params?.archived) searchParams.append("archived", params.archived);
		if (params?.companyId) searchParams.append("company_id", params.companyId);
		if (params?.discoverySessionId)
			searchParams.append("discovery_session_id", params.discoverySessionId);
		if (params?.proposalFollowUpState)
			searchParams.append(
				"proposal_follow_up_state",
				params.proposalFollowUpState,
			);

		const query = searchParams.toString();
		const url = query ? `/projects/dashboard?${query}` : "/projects/dashboard";

		if (params?.signal) {
			return apiClient.request<DashboardListResponse>(url, {
				method: "GET",
				signal: params.signal,
			});
		}

		const cacheKey = `dashboard:${url}`;

		return fetchWithClientDataCache({
			key: cacheKey,
			ttlMs: DASHBOARD_CACHE_TTL_MS,
			fetcher: () =>
				apiClient.request<DashboardListResponse>(url, {
					method: "GET",
					...(params?.signal ? { signal: params.signal } : {}),
				}),
		});
	},

	async updateProposalFollowUpState(
		projectId: string,
		state: ProposalFollowUpState,
	): Promise<ProposalFollowUpStateUpdateResponse> {
		return apiClient.patch<ProposalFollowUpStateUpdateResponse>(
			`/projects/${projectId}/proposal-follow-up-state`,
			{ state },
		);
	},
};

export async function fetchCandidates(
	sessionId: string,
): Promise<DraftItemRow[]> {
	const response = await dashboardAPI.getDashboard({
		bucket: "needs_confirmation",
		discoverySessionId: sessionId,
		size: 100,
	});

	return response.items.filter(isDraftItem);
}
