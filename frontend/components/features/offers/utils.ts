import type { OfferStage } from "@/components/features/offers/types";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import type { ProposalDTO } from "@/lib/types/proposal-dto";

const PROPOSAL_FOLLOW_UP_TRANSITIONS: Record<
	ProposalFollowUpState,
	ProposalFollowUpState[]
> = {
	uploaded: ["waiting_to_send"],
	waiting_to_send: ["waiting_response", "rejected"],
	waiting_response: [
		"waiting_to_send",
		"under_negotiation",
		"accepted",
		"rejected",
	],
	under_negotiation: ["waiting_response", "accepted", "rejected"],
	accepted: [],
	rejected: [],
};

export const OFFER_FOLLOW_UP_LABELS: Record<ProposalFollowUpState, string> = {
	uploaded: "Offer drafted",
	waiting_to_send: "Ready to send",
	waiting_response: "Awaiting response",
	under_negotiation: "In negotiation",
	accepted: "Accepted",
	rejected: "Declined",
};

export const PROPOSAL_FOLLOW_UP_LABELS = OFFER_FOLLOW_UP_LABELS;

export function mapProjectFollowUpToOfferStage(
	state: ProposalFollowUpState,
): OfferStage {
	if (state === "uploaded") {
		return "requires_data";
	}
	if (state === "waiting_to_send") {
		return "proposal_ready";
	}
	if (state === "waiting_response") {
		return "offer_sent";
	}
	if (state === "under_negotiation") {
		return "in_negotiation";
	}
	if (state === "accepted") {
		return "accepted";
	}
	return "declined";
}

export function resolveEffectiveProposalFollowUpState(
	storedState: ProposalFollowUpState | null | undefined,
	proposalCount: number,
): ProposalFollowUpState | null {
	if (storedState) {
		return storedState;
	}
	if (proposalCount <= 0) {
		return null;
	}
	return "uploaded";
}

export function getAllowedProposalFollowUpTransitions(
	state: ProposalFollowUpState,
): ProposalFollowUpState[] {
	return PROPOSAL_FOLLOW_UP_TRANSITIONS[state];
}

export function selectDeterministicOfferProposal(
	proposals: ProposalDTO[],
): ProposalDTO | null {
	const nonArchived = proposals.filter(
		(proposal) => proposal.status !== "Archived",
	);
	if (nonArchived.length === 0) {
		return null;
	}

	const current = nonArchived.filter(
		(proposal) => proposal.status === "Current",
	);
	const candidates = current.length > 0 ? current : nonArchived;

	return (
		[...candidates].sort((a, b) => {
			const tsA = Number.isNaN(Date.parse(a.createdAt))
				? 0
				: Date.parse(a.createdAt);
			const tsB = Number.isNaN(Date.parse(b.createdAt))
				? 0
				: Date.parse(b.createdAt);
			if (tsA !== tsB) {
				return tsB - tsA;
			}
			return b.id.localeCompare(a.id);
		})[0] ?? null
	);
}
