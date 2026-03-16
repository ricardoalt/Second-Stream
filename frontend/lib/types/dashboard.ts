/**
 * Dashboard triage types — mirrors backend DashboardListResponse contract.
 *
 * Backend uses camelCase serialization (BaseSchema.alias_generator=to_camel_case).
 * All field names here must match the runtime JSON response shape.
 *
 * Rules:
 * - `counts` are always used for tab badges (union-scoped).
 * - `items` + `total` + `page` + `pages` are main-list pagination
 *   (may be persisted-only in bucket=total).
 * - `draftPreview` only appears for bucket=total.
 * - `proposalFollowUpState` filter must be cleared when leaving the proposal bucket.
 */

import {
	AlertTriangle,
	CheckCircle2,
	FileSearch,
	Layers,
	Send,
} from "lucide-react";
import type { ComponentType } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENUMS / LITERALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type DashboardBucket =
	| "total"
	| "needs_confirmation"
	| "missing_information"
	| "intelligence_report"
	| "proposal";

export type DashboardRowKind = "persisted_stream" | "draft_item";

export type ProposalFollowUpState =
	| "uploaded"
	| "waiting_to_send"
	| "waiting_response"
	| "under_negotiation"
	| "accepted"
	| "rejected";

export type DraftSourceType = "bulk_import" | "voice_interview";
export type DraftStatus = "pending_review" | "accepted" | "amended";
export type DraftKind = "linked" | "orphan_stream" | "location_only";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROW SCHEMAS (camelCase — matches backend JSON output)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DraftTarget {
	targetKind: "confirmation_flow";
	runId: string;
	itemId: string;
	sourceType: DraftSourceType;
	entrypointType: "company" | "location";
	entrypointId: string;
}

export interface PersistedStreamRow {
	kind: "persisted_stream";
	bucket: DashboardBucket;
	projectId: string;
	streamName: string;
	wasteCategoryLabel: string | null;
	ownerDisplayName: string | null;
	companyId: string | null;
	companyLabel: string | null;
	locationLabel: string | null;
	archivedAt: string | null;
	volumeSummary: string | null;
	lastActivityAt: string;
	pendingConfirmation: boolean;
	missingRequiredInfo: boolean;
	missingFields: string[];
	intelligenceReady: boolean;
	proposalFollowUpState: ProposalFollowUpState | null;
	canEditProposalFollowUp: boolean;
}

export interface DraftItemRow {
	kind: "draft_item";
	bucket: "total" | "needs_confirmation";
	itemId: string;
	runId: string;
	groupId: string | null;
	streamName: string;
	companyId: string | null;
	companyLabel: string | null;
	locationLabel: string | null;
	volumeSummary: string | null;
	lastActivityAt: string;
	sourceType: DraftSourceType;
	draftStatus: DraftStatus;
	confidence: number | null;
	draftKind: DraftKind;
	confirmable: boolean;
	target: DraftTarget | null;
}

export type DraftConfirmationFieldKey =
	| "company"
	| "location"
	| "materialType"
	| "materialName"
	| "composition"
	| "volume"
	| "frequency"
	| "primaryContact";

export type DraftConfirmationFieldSource =
	| "ai_detected"
	| "manual_override"
	| "pending";

export interface DraftConfirmationFieldState {
	key: DraftConfirmationFieldKey;
	label: string;
	initialValue: string;
	value: string;
	source: DraftConfirmationFieldSource;
	required: boolean;
	editable: boolean;
	editabilityReason?: string;
	placeholder?: string;
}

export type DraftConfirmationLocationState =
	| {
			mode: "locked";
			name: string;
			city: string;
			state: string;
			address: string;
	  }
	| {
			mode: "existing";
			locationId: string;
			name: string;
			city: string;
			state: string;
			address: string;
	  }
	| {
			mode: "create_new";
			name: string;
			city: string;
			state: string;
			address: string;
	  };

export type DraftConfirmationFieldMap = Record<
	DraftConfirmationFieldKey,
	DraftConfirmationFieldState
>;

export interface DraftConfirmationContract {
	draftItemId: string;
	runId: string;
	sourceType: DraftSourceType;
	groupId: string | null;
	companyId: string | null;
	locationId: string | null;
	initialLocationState: DraftConfirmationLocationState;
	locationState: DraftConfirmationLocationState;
	fields: DraftConfirmationFieldMap;
}

export type DashboardRow = PersistedStreamRow | DraftItemRow;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESPONSE SCHEMAS (camelCase — matches backend JSON output)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DashboardCounts {
	/** Global filtered total; includes secondary drafts like `location_only`. */
	total: number;
	/** Pending confirmation workload; includes `linked`, `orphan_stream`, `location_only`. */
	needsConfirmation: number;
	missingInformation: number;
	intelligenceReport: number;
	proposal: number;
}

export interface DraftPreviewSlice {
	items: DraftItemRow[];
	total: number;
}

export interface DashboardListResponse {
	bucket: DashboardBucket;
	counts: DashboardCounts;
	items: DashboardRow[];
	/** Secondary list rows (non-main queue), e.g. `location_only`. */
	secondaryDraftRows: DraftItemRow[];
	/** Total items in the main list for the active bucket (pagination). */
	total: number;
	page: number;
	size: number;
	pages: number;
	/** Only present when bucket = "total". */
	draftPreview: DraftPreviewSlice | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BUCKET TAB CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BucketTabConfig {
	id: DashboardBucket;
	label: string;
	icon: ComponentType<{ className?: string }>;
	/** Key on DashboardCounts to read the badge number */
	countKey: keyof DashboardCounts;
	/** Short description shown below the count in stat-card view */
	description: string;
	/** Tiny status label shown next to the count (e.g. "active", "draft") */
	statusLabel: string;
}

export const BUCKET_TABS: BucketTabConfig[] = [
	{
		id: "total",
		label: "Total Waste Streams",
		icon: Layers,
		countKey: "total",
		description: "All active waste streams across every stage",
		statusLabel: "active",
	},
	{
		id: "needs_confirmation",
		label: "Needs Confirmation",
		icon: AlertTriangle,
		countKey: "needsConfirmation",
		description: "Discovery drafts awaiting review and confirmation",
		statusLabel: "draft",
	},
	{
		id: "missing_information",
		label: "Missing Information",
		icon: FileSearch,
		countKey: "missingInformation",
		description: "Streams that need additional data before they can progress",
		statusLabel: "waiting",
	},
	{
		id: "intelligence_report",
		label: "Intelligence Report",
		icon: CheckCircle2,
		countKey: "intelligenceReport",
		description: "Streams with completed analysis ready for insights",
		statusLabel: "ready",
	},
	{
		id: "proposal",
		label: "Proposal",
		icon: Send,
		countKey: "proposal",
		description:
			"Streams in commercial follow-up with proposals sent or pending",
		statusLabel: "sent",
	},
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROPOSAL FOLLOW-UP LABELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PROPOSAL_FOLLOW_UP_LABELS: Record<ProposalFollowUpState, string> =
	{
		uploaded: "Uploaded",
		waiting_to_send: "Waiting to Send",
		waiting_response: "Waiting Response",
		under_negotiation: "Under Negotiation",
		accepted: "Accepted",
		rejected: "Rejected",
	};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPE GUARDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function isPersistedStream(
	row: DashboardRow,
): row is PersistedStreamRow {
	return row.kind === "persisted_stream";
}

export function isDraftItem(row: DashboardRow): row is DraftItemRow {
	return row.kind === "draft_item";
}
