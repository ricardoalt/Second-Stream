export type StreamPhase = 1 | 2 | 3 | 4;

export type StreamStatus =
	| "draft"
	| "active"
	| "missing_info"
	| "in_review"
	| "ready_for_offer"
	| "blocked"
	| "completed";

export type StreamRow = {
	id: string;
	name: string;
	client: string;
	location: string;
	agent: string;
	wasteType: string;
	volume: string;
	lastUpdated: string;
	phase: StreamPhase;
	status: StreamStatus;
};

export type DraftStreamRow = {
	id: string;
	materialType: string;
	processMethod: string;
	volume: string;
	units: string;
	location: string;
	lastEdited: string;
};

export type FollowUpPriority = "urgent" | "overdue" | "upcoming";

export type FollowUpItem = {
	id: string;
	streamName: string;
	client: string;
	reason: string;
	nextAction: string;
	dueDate: string;
	daysSinceLastActivity: number;
	priority: FollowUpPriority;
	missingFields: string[];
};

export type StreamAttachment = {
	id: string;
	name: string;
	type: "SDS" | "COA" | "Lab report" | "Email" | "Quote";
	date: string;
	status: "verified" | "pending";
};

export type StreamTimelineEvent = {
	id: string;
	actor: string;
	actorRole: "agent" | "admin" | "client" | "system";
	message: string;
	timestamp: string;
};

export type StreamDetail = {
	id: string;
	name: string;
	client: string;
	location: string;
	status: StreamStatus;
	phase: StreamPhase;
	wasteType: string;
	volume: string;
	frequency: string;
	assignedAgent: string;
	firstLiftTarget: string;
	regulatoryClass: string;
	attachments: StreamAttachment[];
	timeline: StreamTimelineEvent[];
};
