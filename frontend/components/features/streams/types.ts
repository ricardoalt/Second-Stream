import type { DraftItemRow, PersistedStreamRow } from "@/lib/types/dashboard";

export type StreamPhase = 1 | 2 | 3 | 4;

export type StreamStatus =
	| "draft"
	| "active"
	| "missing_info"
	| "in_review"
	| "ready_for_offer"
	| "blocked"
	| "completed";

export type FollowUpPriority = "urgent" | "high" | "medium" | "low";

export type KpiUnavailableReason =
	| "pending_backend_contract"
	| "not_collected_in_ui";

export type WasteStreamsKpiKey =
	| "activeStreams"
	| "criticalAlerts"
	| "monthlyVolume"
	| "openOffers";

export type WasteStreamsKpis = {
	activeStreams: number | null;
	criticalAlerts: number | null;
	monthlyVolume: number | null;
	openOffers: number | null;
	unavailableReasons?: Partial<
		Record<WasteStreamsKpiKey, KpiUnavailableReason>
	>;
};

export type StreamRow = {
	id: string;
	name: string;
	client: string;
	clientId?: string;
	location: string;
	locationId?: string;
	agent: string;
	/**
	 * Owner name - used to show owner badge for org admins
	 */
	ownerName?: string;
	/**
	 * Owner user id from backend persisted stream projection.
	 */
	ownerUserId?: string;
	/**
	 * Creator display name, used for fallback owner copy when
	 * an explicit assignment is missing.
	 */
	creatorName?: string;
	/**
	 * Explicit ownership flag from backend.
	 */
	hasExplicitOwner?: boolean;
	wasteType: string;
	volume: string;
	lastUpdated: string;
	phase?: StreamPhase;
	status: StreamStatus;
	processMethod?: string;
	units?: string;
	frequency?: string;
	lastEdited?: string;
	daysSinceLastActivity?: number;
	missingFields?: string[];
	/**
	 * Optional from source data; UI should derive a value with
	 * `computeFollowUpPriority` when this is missing.
	 */
	priority?: FollowUpPriority;
	reason?: string;
	nextAction?: string;
	dueDate?: string;
};

export type StreamsAdapterSourceRow = PersistedStreamRow | DraftItemRow;

export type StreamsAdapterRow = Pick<StreamRow, "id" | "status"> &
	Partial<Omit<StreamRow, "id" | "status" | "phase">> & {
		phase?: StreamPhase;
	};

export function isDraftStream(stream: StreamRow): boolean {
	return stream.status === "draft";
}

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
