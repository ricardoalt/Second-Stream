import type {
	DashboardInsight,
	MissingInformationStream,
	MonthlyPipelineKpi,
	OfferFollowUpState,
	OfferStageFeaturedItem,
} from "./field-agent-dashboard.types";

export const LEGACY_DASHBOARD_HERO_KPIS_MOCKS: MonthlyPipelineKpi[] = [
	{
		id: "pipeline-value",
		label: "Monthly pipeline",
		value: "$820K",
		helpText: "Current qualified value",
		gaugeValue: 72,
	},
	{
		id: "active-streams",
		label: "Active streams",
		value: "24",
		helpText: "In discovery and offer motion",
		gaugeValue: 64,
	},
	{
		id: "awaiting-info",
		label: "Missing information",
		value: "7",
		helpText: "Need client follow-up",
		gaugeValue: 29,
	},
];

export const DASHBOARD_AI_INSIGHTS_PLACEHOLDERS: DashboardInsight[] = [
	{
		id: "insight-1",
		title: "Follow up with Andina Health before 16:00",
		description:
			"Transport manifest is the only blocker. A same-day reminder likely clears this stream into offer drafting.",
		severity: "warning",
	},
	{
		id: "insight-2",
		title: "Two sent offers are aging past response SLA",
		description:
			"A short commercial nudge can recover momentum in waiting_response streams with high readiness scores.",
		severity: "info",
	},
	{
		id: "insight-3",
		title: "Negotiation cluster has strong close potential",
		description:
			"Three in-negotiation opportunities already have complete compliance artifacts and can be prioritized for closure.",
		severity: "success",
	},
];

export const LEGACY_MISSING_INFORMATION_STREAMS_MOCKS: MissingInformationStream[] =
	[
		{
			id: "mis-001",
			streamName: "Infectious Solid Waste",
			clientName: "Andina Health Group",
			siteName: "Downtown Clinic",
			statusLabel: "Blocked",
			priority: "critical",
			missingItems: ["Transport manifest", "Generator signature"],
			nextAction: "Send high-priority reminder",
			lastTouched: "4h ago",
		},
		{
			id: "mis-002",
			streamName: "Spent Coolant Blend",
			clientName: "Roca Manufacturing",
			siteName: "Plant 02",
			statusLabel: "Pending",
			priority: "normal",
			missingItems: ["Safety data sheet", "Containment photo evidence"],
			nextAction: "Schedule 10-min validation call",
			lastTouched: "1d ago",
		},
		{
			id: "mis-003",
			streamName: "Catalyst Slurry Residue",
			clientName: "Solaris Industrial",
			siteName: "North Processing Site",
			statusLabel: "Action required",
			priority: "high",
			missingItems: ["Disposal certificate", "Updated monthly volume"],
			nextAction: "Request update via client profile",
			lastTouched: "2d ago",
		},
	];

export const LEGACY_OFFER_FOLLOW_UP_COUNTS_MOCKS: Record<
	OfferFollowUpState,
	number
> = {
	uploaded: 5,
	waiting_to_send: 4,
	waiting_response: 6,
	under_negotiation: 3,
	accepted: 4,
	declined: 1,
	rejected: 1,
};

export const LEGACY_OFFER_PIPELINE_FEATURED_ITEMS_MOCKS: Partial<
	Record<OfferFollowUpState, OfferStageFeaturedItem[]>
> = {
	waiting_response: [
		{
			id: "sent-1",
			primaryText: "Andina Health • Infectious Solid Waste",
			secondaryText: "Sent 2d ago • Follow-up due today",
		},
		{
			id: "sent-2",
			primaryText: "Roca Manufacturing • Spent Coolant Blend",
			secondaryText: "Sent 3d ago • Pricing clarification pending",
		},
	],
	accepted: [
		{
			id: "accepted-1",
			primaryText: "Solaris Industrial • Catalyst Slurry Residue",
			secondaryText: "Accepted yesterday • Onboarding kickoff Monday",
		},
		{
			id: "accepted-2",
			primaryText: "Nordic Foods • Organic Sludge",
			secondaryText: "Accepted this week • Contract signature in progress",
		},
	],
};
