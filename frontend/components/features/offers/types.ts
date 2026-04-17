export type OfferStage =
	| "requires_data"
	| "proposal_ready"
	| "offer_sent"
	| "in_negotiation"
	| "accepted"
	| "declined"
	| "expired";

export type ActiveOfferStage =
	| "requires_data"
	| "proposal_ready"
	| "offer_sent"
	| "in_negotiation";

export type OfferTimelineEvent = {
	id: string;
	title: string;
	description: string;
	timestamp: string;
	type: "system" | "client" | "agent";
};

export type OfferPipelineRecord = {
	offerId: string;
	projectId: string | null;
	reference: string;
	clientName: string;
	streamName: string;
	stage: OfferStage;
	valueUsd: number;
	updatedAt: string;
};

export type OfferRecord = {
	projectId: string;
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
