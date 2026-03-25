export type OfferStage =
	| "draft"
	| "submitted"
	| "under_review"
	| "accepted"
	| "rejected"
	| "expired";

export type OfferTimelineEvent = {
	id: string;
	title: string;
	description: string;
	timestamp: string;
	type: "system" | "client" | "agent";
};

export type OfferRecord = {
	id: string;
	reference: string;
	clientName: string;
	streamName: string;
	location: string;
	stage: OfferStage;
	valueUsd: number;
	createdAt: string;
	updatedAt: string;
	owner: string;
	executiveSummary: string;
	strategicInsights: string;
	complianceNotes: string[];
	pricing: {
		unitLabel: string;
		unitPriceUsd: number;
		monthlyVolume: string;
		netAnnualValueUsd: number;
		paymentTerms: string;
		expiresOn: string;
	};
	linkedStreams: Array<{
		id: string;
		name: string;
		status: string;
		location: string;
	}>;
	timeline: OfferTimelineEvent[];
};
