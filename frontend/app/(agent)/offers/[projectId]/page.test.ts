import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
	mapProjectFollowUpToOfferStage,
	selectDeterministicOfferProposal,
} from "@/components/features/offers/utils";
import type { ProjectDetail } from "@/lib/project-types";
import type { ProposalDTO } from "@/lib/types/proposal-dto";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const { apiClient } = await import("@/lib/api/client");
const { offersAPI } = await import("@/lib/api/offers");
const { projectsAPI } = await import("@/lib/api/projects");

const originalGetProject = projectsAPI.getProject;
const originalPatch = apiClient.patch;
const originalUpdateOfferFollowUpState = offersAPI.updateOfferFollowUpState;
const originalGetOfferDetail = offersAPI.getOfferDetail;

function buildProposal(
	overrides?: Partial<ProposalDTO> & { id: string; createdAt: string },
): ProposalDTO {
	return {
		id: overrides?.id ?? "proposal-1",
		version: overrides?.version ?? "v1.0",
		title: overrides?.title ?? "Offer v1",
		proposalType: overrides?.proposalType ?? "Technical",
		status: overrides?.status ?? "Current",
		createdAt: overrides?.createdAt,
		author: overrides?.author ?? "AI",
		capex: overrides?.capex ?? 15000,
		opex: overrides?.opex ?? 7000,
	};
}

function buildProjectDetail(overrides?: Partial<ProjectDetail>): ProjectDetail {
	return {
		id: overrides?.id ?? "project-1",
		name: overrides?.name ?? "Project Alpha",
		sector: overrides?.sector ?? "Industrial",
		subsector: overrides?.subsector ?? "Pharmaceuticals",
		client: overrides?.client ?? "Acme Corp",
		location: overrides?.location ?? "Houston, TX",
		locationId: overrides?.locationId ?? "location-1",
		companyName: overrides?.companyName ?? "Acme Corp",
		locationName: overrides?.locationName ?? "Houston",
		status: overrides?.status ?? "In Preparation",
		progress: overrides?.progress ?? 35,
		proposalFollowUpState: overrides?.proposalFollowUpState ?? null,
		createdAt: overrides?.createdAt ?? "2026-03-20T00:00:00.000Z",
		updatedAt: overrides?.updatedAt ?? "2026-03-27T00:00:00.000Z",
		projectType: overrides?.projectType ?? "Assessment",
		description: overrides?.description ?? "",
		proposalsCount: overrides?.proposalsCount ?? 0,
		filesCount: overrides?.filesCount ?? 0,
		technicalSections: overrides?.technicalSections ?? [],
		proposals: overrides?.proposals ?? [],
		timeline: overrides?.timeline ?? [],
		files: overrides?.files ?? [],
	};
}

describe("offer detail runtime behavior", () => {
	beforeEach(() => {
		projectsAPI.getProject = originalGetProject;
		apiClient.patch = originalPatch;
		offersAPI.updateOfferFollowUpState = originalUpdateOfferFollowUpState;
		offersAPI.getOfferDetail = originalGetOfferDetail;
	});

	afterEach(() => {
		projectsAPI.getProject = originalGetProject;
		apiClient.patch = originalPatch;
		offersAPI.updateOfferFollowUpState = originalUpdateOfferFollowUpState;
		offersAPI.getOfferDetail = originalGetOfferDetail;
	});

	it("maps backend follow-up states to offer labels", () => {
		expect(mapProjectFollowUpToOfferStage("uploaded")).toBe("requires_data");
		expect(mapProjectFollowUpToOfferStage("waiting_to_send")).toBe(
			"proposal_ready",
		);
		expect(mapProjectFollowUpToOfferStage("waiting_response")).toBe(
			"offer_sent",
		);
		expect(mapProjectFollowUpToOfferStage("under_negotiation")).toBe(
			"in_negotiation",
		);
		expect(mapProjectFollowUpToOfferStage("accepted")).toBe("accepted");
		expect(mapProjectFollowUpToOfferStage("rejected")).toBe("declined");
	});

	it("selects current proposal before newer non-current proposals", () => {
		const selected = selectDeterministicOfferProposal([
			buildProposal({
				id: "proposal-draft",
				createdAt: "2026-03-23T00:00:00.000Z",
				status: "Draft",
			}),
			buildProposal({
				id: "proposal-current",
				createdAt: "2026-03-22T00:00:00.000Z",
				status: "Current",
			}),
		]);

		expect(selected?.id).toBe("proposal-current");
	});

	it("hydrates direct /offers/[projectId] detail with effective backend follow-up state", async () => {
		projectsAPI.getProject = mock(async () =>
			buildProjectDetail({
				id: "project-442",
				proposalFollowUpState: null,
				proposals: [
					buildProposal({
						id: "proposal-current",
						createdAt: "2026-03-20T00:00:00.000Z",
						status: "Current",
					}),
				],
				proposalsCount: 1,
			}),
		);

		const detail = await offersAPI.getOfferDetail("project-442");

		expect(detail.projectId).toBe("project-442");
		expect(detail.proposal.id).toBe("proposal-current");
		expect(detail.proposalFollowUpState).toBe("uploaded");
	});

	it("wires follow-up transition mutations to the canonical backend endpoint", async () => {
		const patchSpy = mock(async () => ({
			projectId: "project-442",
			proposalFollowUpState: "waiting_response" as const,
			updatedAt: "2026-03-28T02:00:00.000Z",
		}));
		apiClient.patch = patchSpy as typeof apiClient.patch;

		const response = await offersAPI.updateOfferFollowUpState(
			"project-442",
			"waiting_response",
		);

		expect(patchSpy).toHaveBeenCalledWith(
			"/projects/project-442/proposal-follow-up-state",
			{ state: "waiting_response" },
		);
		expect(response.proposalFollowUpState).toBe("waiting_response");
	});

	it("refreshes detail state after a successful transition mutation", async () => {
		const updateSpy = mock(async () => ({
			projectId: "project-442",
			proposalFollowUpState: "under_negotiation" as const,
			updatedAt: "2026-03-28T02:01:00.000Z",
		}));
		const refreshedDetail = {
			projectId: "project-442",
			projectName: "Project Alpha",
			companyLabel: "Acme Corp",
			locationLabel: "Houston",
			proposalFollowUpState: "under_negotiation" as const,
			proposal: buildProposal({
				id: "proposal-current",
				createdAt: "2026-03-20T00:00:00.000Z",
				status: "Current",
			}),
		};
		const getDetailSpy = mock(async () => refreshedDetail);

		offersAPI.updateOfferFollowUpState =
			updateSpy as typeof offersAPI.updateOfferFollowUpState;
		offersAPI.getOfferDetail = getDetailSpy as typeof offersAPI.getOfferDetail;

		const response = await offersAPI.transitionOfferFollowUpState(
			"project-442",
			"under_negotiation",
		);

		expect(updateSpy).toHaveBeenCalledWith("project-442", "under_negotiation");
		expect(getDetailSpy).toHaveBeenCalledWith("project-442");
		expect(response).toEqual(refreshedDetail);
	});
});
