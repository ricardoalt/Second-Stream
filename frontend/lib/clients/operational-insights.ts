import type { StreamRow } from "@/components/features/streams/types";
import type { ClientProfile } from "@/lib/mappers/company-client";

type AccountStatusBadgeVariant = "outline" | "success" | "warning" | "muted";

export type AccountStatusBadge = {
	label: string;
	variant: AccountStatusBadgeVariant;
};

export type OperationalAlert = {
	id: "missing-info" | "draft-streams" | "missing-primary-contact";
	title: string;
	description: string;
	tone: "critical" | "warning";
};

export type OperationalInsightsReviewAction = {
	tab: "missing-info" | "drafts" | "all";
	label:
		| "Review Missing Information"
		| "Review Draft Streams"
		| "Review All Streams";
};

export type OperationalInsights = {
	totalTrackedStreams: number;
	activeStreamsCount: number;
	readyForOfferCount: number;
	missingInfoStreamsCount: number;
	draftStreamsCount: number;
	facilitiesWithProjects: number;
	totalFacilities: number;
	facilityCoverage: number;
	dataCompleteness: number;
	accountStatus: AccountStatusBadge;
	realAlerts: OperationalAlert[];
	nextSteps: string[];
	accountNarrative: string;
	reviewAction: OperationalInsightsReviewAction;
};

type OperationalInsightsInput = {
	profile: ClientProfile;
	companyAllStreams: StreamRow[];
	companyDraftStreams: StreamRow[];
	companyMissingInfoStreams: StreamRow[];
};

export function deriveOperationalInsights({
	profile,
	companyAllStreams,
	companyDraftStreams,
	companyMissingInfoStreams,
}: OperationalInsightsInput): OperationalInsights {
	const totalTrackedStreams =
		companyAllStreams.length + companyDraftStreams.length;
	const activeStreamsCount = companyAllStreams.filter(
		(stream) => stream.status === "active",
	).length;
	const readyForOfferCount = companyAllStreams.filter(
		(stream) => stream.status === "ready_for_offer",
	).length;

	const facilitiesWithProjects = profile.locations.filter(
		(location) => location.projectCount > 0,
	).length;
	const totalFacilities = profile.locations.length;
	const facilityCoverage =
		totalFacilities > 0
			? Math.round((facilitiesWithProjects / totalFacilities) * 100)
			: 0;

	const missingInfoStreamsCount = companyMissingInfoStreams.length;
	const draftStreamsCount = companyDraftStreams.length;
	const dataCompleteness =
		totalTrackedStreams > 0
			? Math.max(
					0,
					Math.round(
						((totalTrackedStreams - missingInfoStreamsCount) /
							totalTrackedStreams) *
							100,
					),
				)
			: 100;

	const accountStatus = mapAccountStatus(profile);

	const realAlerts = buildRealAlerts({
		missingInfoStreamsCount,
		draftStreamsCount,
		hasPrimaryContact: Boolean(profile.primaryContact),
	});

	const nextSteps = buildNextSteps({
		missingInfoStreamsCount,
		draftStreamsCount,
		hasPrimaryContact: Boolean(profile.primaryContact),
		hasFacilitiesWithoutProjects: profile.locations.some(
			(location) => location.projectCount === 0,
		),
	});

	const accountNarrative = buildAccountNarrative({
		notes: profile.notes,
		companyName: profile.name,
		totalTrackedStreams,
		totalFacilities,
		missingInfoStreamsCount,
	});

	const reviewAction = deriveReviewAction({
		missingInfoStreamsCount,
		draftStreamsCount,
	});

	return {
		totalTrackedStreams,
		activeStreamsCount,
		readyForOfferCount,
		missingInfoStreamsCount,
		draftStreamsCount,
		facilitiesWithProjects,
		totalFacilities,
		facilityCoverage,
		dataCompleteness,
		accountStatus,
		realAlerts,
		nextSteps,
		accountNarrative,
		reviewAction,
	};
}

function mapAccountStatus(profile: ClientProfile): AccountStatusBadge {
	if (profile.archivedAt) {
		return { label: "Archived", variant: "outline" };
	}

	if (profile.accountStatus === "active") {
		return { label: "Active", variant: "success" };
	}

	if (profile.accountStatus === "prospect") {
		return { label: "Prospect", variant: "warning" };
	}

	return { label: "Status not set", variant: "muted" };
}

function buildRealAlerts({
	missingInfoStreamsCount,
	draftStreamsCount,
	hasPrimaryContact,
}: {
	missingInfoStreamsCount: number;
	draftStreamsCount: number;
	hasPrimaryContact: boolean;
}): OperationalAlert[] {
	return [
		...(missingInfoStreamsCount > 0
			? [
					{
						id: "missing-info" as const,
						title: "Missing information in streams",
						description: `${missingInfoStreamsCount} stream${missingInfoStreamsCount === 1 ? "" : "s"} need${missingInfoStreamsCount === 1 ? "s" : ""} follow-up details.`,
						tone: "critical" as const,
					},
				]
			: []),
		...(draftStreamsCount > 0
			? [
					{
						id: "draft-streams" as const,
						title: "Draft streams pending review",
						description: `${draftStreamsCount} draft stream${draftStreamsCount === 1 ? "" : "s"} await confirmation.`,
						tone: "warning" as const,
					},
				]
			: []),
		...(!hasPrimaryContact
			? [
					{
						id: "missing-primary-contact" as const,
						title: "Primary contact missing",
						description:
							"No primary contact is assigned for this company profile.",
						tone: "warning" as const,
					},
				]
			: []),
	].slice(0, 3);
}

function buildNextSteps({
	missingInfoStreamsCount,
	draftStreamsCount,
	hasPrimaryContact,
	hasFacilitiesWithoutProjects,
}: {
	missingInfoStreamsCount: number;
	draftStreamsCount: number;
	hasPrimaryContact: boolean;
	hasFacilitiesWithoutProjects: boolean;
}): string[] {
	return [
		...(missingInfoStreamsCount > 0
			? [
					`Resolve missing data for ${missingInfoStreamsCount} stream${missingInfoStreamsCount === 1 ? "" : "s"} in the follow-up board.`,
				]
			: []),
		...(draftStreamsCount > 0
			? [
					`Review and confirm ${draftStreamsCount} draft stream${draftStreamsCount === 1 ? "" : "s"}.`,
				]
			: []),
		...(!hasPrimaryContact
			? [
					"Assign a primary contact so outreach and approvals have a clear owner.",
				]
			: []),
		...(hasFacilitiesWithoutProjects
			? ["Review facilities with zero linked projects and validate coverage."]
			: []),
	].slice(0, 3);
}

function buildAccountNarrative({
	notes,
	companyName,
	totalTrackedStreams,
	totalFacilities,
	missingInfoStreamsCount,
}: {
	notes: string;
	companyName: string;
	totalTrackedStreams: number;
	totalFacilities: number;
	missingInfoStreamsCount: number;
}): string {
	if (notes.trim()) {
		return notes;
	}

	return `${companyName} currently has ${totalTrackedStreams} tracked waste stream${totalTrackedStreams === 1 ? "" : "s"} across ${totalFacilities} facilit${totalFacilities === 1 ? "y" : "ies"}. ${
		missingInfoStreamsCount > 0
			? `${missingInfoStreamsCount} stream${missingInfoStreamsCount === 1 ? " is" : "s are"} waiting on additional information.`
			: "No streams are currently blocked by missing information."
	}`;
}

function deriveReviewAction({
	missingInfoStreamsCount,
	draftStreamsCount,
}: {
	missingInfoStreamsCount: number;
	draftStreamsCount: number;
}): OperationalInsightsReviewAction {
	if (missingInfoStreamsCount > 0) {
		return {
			tab: "missing-info",
			label: "Review Missing Information",
		};
	}

	if (draftStreamsCount > 0) {
		return {
			tab: "drafts",
			label: "Review Draft Streams",
		};
	}

	return {
		tab: "all",
		label: "Review All Streams",
	};
}
