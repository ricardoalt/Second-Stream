export type DashboardInsight = {
	id: string;
	title: string;
	description: string;
	severity: "info" | "warning" | "success";
};

export type MonthlyPipelineKpi = {
	id: string;
	label: string;
	value: string;
	helpText: string;
	gaugeValue: number;
};

export type MissingInformationStream = {
	id: string;
	streamName: string;
	clientName: string;
	siteName: string;
	statusLabel: "Blocked" | "Pending" | "Action required";
	priority: "critical" | "high" | "normal";
	missingItems: string[];
	nextAction: string;
	lastTouched: string;
};

export type OfferFollowUpState =
	| "uploaded"
	| "waiting_to_send"
	| "waiting_response"
	| "under_negotiation"
	| "accepted"
	| "declined"
	| "rejected";

export type OfferStageFeaturedItem = {
	id: string;
	primaryText: string;
	secondaryText: string;
};
