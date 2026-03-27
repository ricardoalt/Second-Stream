import type {
	FollowUpPriority,
	StreamRow,
} from "@/components/features/streams/types";

export const PRIORITY_HEURISTIC_VERSION = "frontend-v2";

export type MissingInformationType =
	| "compliance_documentation"
	| "approval_workflow"
	| "technical_profile"
	| "general_follow_up";

const PRIORITY_RANK: Record<FollowUpPriority, number> = {
	low: 0,
	medium: 1,
	high: 2,
	urgent: 3,
};

export function compareFollowUpPriority(
	left: FollowUpPriority,
	right: FollowUpPriority,
): number {
	return PRIORITY_RANK[right] - PRIORITY_RANK[left];
}

function deriveMissingInformationType(
	stream: StreamRow,
): MissingInformationType {
	const missingFields = (stream.missingFields ?? []).map((field) =>
		field.toLowerCase(),
	);

	if (
		stream.status === "missing_info" ||
		missingFields.some((field) =>
			/(sds|coa|hazard|mandate|container|documentation|document)/.test(field),
		)
	) {
		return "compliance_documentation";
	}

	if (
		stream.status === "blocked" ||
		missingFields.some((field) => /(approval|sign-off|review)/.test(field))
	) {
		return "approval_workflow";
	}

	if (
		missingFields.some((field) =>
			/(analysis|lab|profile|classification|flash point)/.test(field),
		)
	) {
		return "technical_profile";
	}

	return "general_follow_up";
}

function scoreMissingInformationType(type: MissingInformationType): number {
	switch (type) {
		case "compliance_documentation":
			return 8;
		case "approval_workflow":
			return 6;
		case "technical_profile":
			return 4;
		case "general_follow_up":
			return 2;
	}
}

export function computeFollowUpPriority(stream: StreamRow): FollowUpPriority {
	const days = stream.daysSinceLastActivity ?? 0;
	const typeScore = scoreMissingInformationType(
		deriveMissingInformationType(stream),
	);
	const weightedScore = days + typeScore;

	if (weightedScore >= 24) {
		return "urgent";
	}

	if (weightedScore >= 16) {
		return "high";
	}

	if (weightedScore >= 8) {
		return "medium";
	}

	return "low";
}
