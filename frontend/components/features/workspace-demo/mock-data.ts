// ── Workspace Demo — Mock Data ────────────────────────────────────────────────
// Hardcoded data matching the v5 final HTML mockup (Acme Paint Sludge — Houston)
// Used exclusively by workspace-demo components. No backend connection.
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ──────────────────────────────────────────────────────────────────

export type PointState = "confirmed" | "needs-review" | "missing" | "conflict";

// Change event — what AI changed and why (linked to evidence)
export interface BriefChange {
	id: string;
	pointId: string;
	field: "text" | "sub" | "state" | "refs";
	previousValue: string;
	currentValue: string;
	triggeredBy: string;
	triggeredByType: EvidenceItemType;
	timestamp: string;
}

// Capture bar processing state machine
export type CaptureState = "idle" | "processing" | "mapped";

// Result after evidence ingestion — what was mapped to which points
export interface CaptureResult {
	inputSummary: string;
	mappedPoints: string[];
	mappedLabels: string[];
}

// Adaptive primary action in header
export type PrimaryActionType = "review" | "refresh" | "complete";

export interface BriefPoint {
	id: string;
	text: string;
	sub?: string;
	state: PointState;
	refs?: number[];
	updated?: boolean;
	changeId?: string; // links to BriefChange
	actions: ("Accept" | "Incorrect" | "Verify" | "Add note")[];
}

export interface BriefSection {
	label: string;
	points: BriefPoint[];
}

export interface RecommendedAction {
	id: string;
	num: string;
	label: string;
	why: string;
}

export type EvidenceItemType =
	| "PDF"
	| "DOC"
	| "NOTE"
	| "VOICE"
	| "PHOTO"
	| "EMAIL";

export interface EvidenceItem {
	type: EvidenceItemType;
	name: string;
	extract: string;
	meta?: string;
}

export interface ContextPanel {
	label: "Evidence" | "What's needed";
	pointText: string;
	evidence: EvidenceItem[];
	extraEvidence?: EvidenceItem[];
	insight?: string;
	hasAsk?: boolean;
	askPlaceholder?: string;
}

export type FieldStatus = "complete" | "review" | "incomplete";

export interface StructuredField {
	id: string;
	label: string;
	value?: string;
	empty?: boolean;
	source?: string;
	sourceType?: "AI" | "UPLOADED" | "MANUAL";
	conflict?: string;
	action: "Edit" | "Add" | "Resolve";
}

export interface FieldGroup {
	id: string;
	title: string;
	status: FieldStatus;
	statusText: string;
	defaultOpen?: boolean;
	fields: StructuredField[];
}

// ── Stream Metadata ────────────────────────────────────────────────────────

export const DEMO_STREAM = {
	title: "Acme Paint Sludge — Houston",
	company: "Acme Industrial",
	owner: "M. Torres",
	status: "Pending review" as const,
	statusVariant: "warning" as const,
	briefVersion: "v3",
	briefTime: "11:42 AM",
	readinessPercent: 58,
};

// ── Executive Summary ──────────────────────────────────────────────────────

export const DEMO_EXEC_SUMMARY = {
	lead: "Paint sludge with absorbents — recurring weekly load from Acme Industrial Houston.",
	detail:
		"Material profile and logistics are largely understood. A solids percentage conflict between the lab report and transport manifest is blocking outlet shortlisting.",
	flag: "Hold outlet outreach until the solids conflict is resolved.",
};

// ── Discovery Brief Sections ───────────────────────────────────────────────

export const DEMO_BRIEF_SECTIONS: BriefSection[] = [
	{
		label: "What we know",
		points: [
			{
				id: "material",
				text: "Material family is paint sludge with absorbents",
				state: "confirmed",
				refs: [1],
				actions: ["Accept", "Incorrect"],
			},
			{
				id: "volume",
				text: "Estimated volume is 42–50 tons per month",
				sub: "Manifests and contract cap disagree on upper bound",
				state: "needs-review",
				refs: [2, 3],
				updated: true,
				changeId: "chg-volume",
				actions: ["Accept", "Incorrect", "Verify"],
			},
			{
				id: "frequency",
				text: "Pickup is weekly, Thursdays",
				state: "confirmed",
				refs: [4],
				actions: ["Accept", "Incorrect"],
			},
			{
				id: "ph",
				text: "pH range is approximately 6.2–7.1",
				sub: "Inferred from a similar facility — no direct sample",
				state: "needs-review",
				refs: [5],
				updated: true,
				changeId: "chg-ph",
				actions: ["Accept", "Verify"],
			},
		],
	},
	{
		label: "What is missing",
		points: [
			{
				id: "epa",
				text: "EPA waste code has not been confirmed at location level",
				sub: "Required for outlet eligibility and transport classification",
				state: "missing",
				actions: ["Add note"],
			},
			{
				id: "dwell",
				text: "Storage dwell time tolerance is unknown",
				state: "missing",
				actions: ["Add note"],
			},
		],
	},
	{
		label: "Conflicts",
		points: [
			{
				id: "solids",
				text: "Solids percentage: lab report reads 32%, manifest reads 18%",
				sub: "Blocks outlet pricing and compatibility assessment",
				state: "conflict",
				refs: [1, 6],
				actions: ["Verify", "Add note"],
			},
		],
	},
];

// ── Recommended Next Actions ───────────────────────────────────────────────

export const DEMO_RECOMMENDED_ACTIONS: RecommendedAction[] = [
	{
		id: "action-sample",
		num: "01",
		label: "Request fresh sample with chain-of-custody",
		why: "Resolves solids conflict, unlocks outlet filtering",
	},
	{
		id: "action-epa",
		num: "02",
		label: "Confirm EPA waste code with compliance lead",
		why: "Required before outlet outreach — 5 min call",
	},
];

// ── Context Panels (for evidence rail) ────────────────────────────────────

export const DEMO_CONTEXT_PANELS: Record<string, ContextPanel> = {
	solids: {
		label: "Evidence",
		pointText: "Solids percentage conflict",
		evidence: [
			{
				type: "PDF",
				name: "Lab Report #LR-884",
				extract: '"32% solids" — page 3',
			},
		],
		extraEvidence: [
			{
				type: "DOC",
				name: "Manifest #TM-220",
				extract: '"18% solids" — line 12',
			},
		],
		insight:
			"Outlet compatibility and pricing depend on solids %. Must be resolved before shortlisting.",
		hasAsk: true,
		askPlaceholder: "Which source should we trust?",
	},
	volume: {
		label: "Evidence",
		pointText: "Estimated monthly volume",
		evidence: [
			{
				type: "DOC",
				name: "Manifests Jan–Mar",
				extract: "42, 48, 50 tons respectively",
			},
		],
		extraEvidence: [
			{
				type: "NOTE",
				name: "Contract terms",
				extract: '"Contract caps at 38t"',
			},
		],
		insight:
			"38-ton figure is a contractual cap — actual throughput has exceeded it consistently.",
		hasAsk: true,
		askPlaceholder: "Why the discrepancy?",
	},
	material: {
		label: "Evidence",
		pointText: "Material classification",
		evidence: [
			{
				type: "PDF",
				name: "Lab Report #LR-884",
				extract: '"Paint sludge with absorbents" — p2',
			},
		],
	},
	frequency: {
		label: "Evidence",
		pointText: "Pickup schedule",
		evidence: [
			{
				type: "DOC",
				name: "Service agreement",
				extract: "Thursdays, 7 AM–12 PM",
			},
		],
	},
	ph: {
		label: "Evidence",
		pointText: "pH range",
		evidence: [
			{
				type: "PDF",
				name: "Historical dossier — similar site",
				extract: "pH 6.0–7.3 observed",
				meta: "2024 · analogy, not direct",
			},
		],
		insight: "No direct sample for this stream. Verify before outlet outreach.",
		hasAsk: true,
		askPlaceholder: "How confident is this inference?",
	},
	epa: {
		label: "What's needed",
		pointText: "EPA waste code",
		evidence: [],
		insight:
			"Could be D001 (ignitability) or D007 (chromium). Determines outlet eligibility, transport class, and pricing.",
		hasAsk: true,
		askPlaceholder: "What changes if it's D001 vs D007?",
	},
	dwell: {
		label: "What's needed",
		pointText: "Storage dwell time",
		evidence: [],
		insight:
			"No information yet. Confirm with generator contact how long waste sits before pickup.",
	},
};

// ── Structured Capture Groups ──────────────────────────────────────────────

export const DEMO_FIELD_GROUPS: FieldGroup[] = [
	{
		id: "material-composition",
		title: "Material & composition",
		status: "review",
		statusText: "Needs review",
		defaultOpen: true,
		fields: [
			{
				id: "material-type",
				label: "Material type",
				value: "Paint sludge with absorbents",
				source: "Lab Report #LR-884",
				sourceType: "AI",
				action: "Edit",
			},
			{
				id: "hazard-class",
				label: "Hazard class",
				empty: true,
				action: "Add",
			},
			{
				id: "solids-pct",
				label: "Solids %",
				value: "18% — 32%",
				source: "2 sources disagree",
				sourceType: "AI",
				conflict: "Conflict: lab report vs manifest",
				action: "Resolve",
			},
			{
				id: "ph-range",
				label: "pH range",
				value: "~6.2–7.1",
				source: "Inferred from similar site (unverified)",
				sourceType: "AI",
				action: "Edit",
			},
			{
				id: "epa-code",
				label: "EPA waste code",
				value: "Not confirmed at location level",
				empty: true,
				action: "Add",
			},
		],
	},
	{
		id: "volume-frequency",
		title: "Volume & frequency",
		status: "review",
		statusText: "Needs review",
		fields: [
			{
				id: "monthly-volume",
				label: "Monthly volume",
				value: "42–50 tons",
				source: "Manifests + contract terms (cap discrepancy)",
				sourceType: "AI",
				action: "Edit",
			},
			{
				id: "pickup-frequency",
				label: "Pickup frequency",
				value: "Weekly, Thursdays",
				source: "Service agreement",
				sourceType: "AI",
				action: "Edit",
			},
			{
				id: "container-type",
				label: "Container type",
				empty: true,
				action: "Add",
			},
			{
				id: "dwell-time",
				label: "Dwell time",
				empty: true,
				action: "Add",
			},
		],
	},
	{
		id: "handling-logistics",
		title: "Handling & logistics",
		status: "incomplete",
		statusText: "Missing info",
		fields: [
			{
				id: "current-hauler",
				label: "Current hauler",
				empty: true,
				action: "Add",
			},
			{
				id: "storage-method",
				label: "Storage method",
				empty: true,
				action: "Add",
			},
			{
				id: "access-notes",
				label: "Access notes",
				value: "—",
				empty: true,
				action: "Add",
			},
		],
	},
	{
		id: "compliance-docs",
		title: "Compliance & documentation",
		status: "complete",
		statusText: "On file",
		fields: [
			{
				id: "manifests",
				label: "Manifests",
				value: "3 documents",
				source: "Jan, Feb, Mar",
				sourceType: "UPLOADED",
				action: "Edit",
			},
			{
				id: "lab-reports",
				label: "Lab reports",
				value: "1 document",
				source: "LR-884 (Apr 10)",
				sourceType: "UPLOADED",
				action: "Edit",
			},
			{
				id: "service-agreement",
				label: "Service agreement",
				value: "1 document",
				source: "Current contract",
				sourceType: "UPLOADED",
				action: "Edit",
			},
		],
	},
];

// ── Pending Review Items ───────────────────────────────────────────────────

export const DEMO_PENDING_ITEMS = [
	{ id: "solids", label: "Solids % conflict", severity: "conflict" as const },
	{
		id: "ph",
		label: "pH inferred, not sampled",
		severity: "review" as const,
	},
	{ id: "volume", label: "Volume cap ambiguity", severity: "review" as const },
];

// ── Brief Changes (AI causality data) ─────────────────────────────────────

export const DEMO_BRIEF_CHANGES: BriefChange[] = [
	{
		id: "chg-volume",
		pointId: "volume",
		field: "text",
		previousValue: "Estimated volume is 38–42 tons per month",
		currentValue: "Estimated volume is 42–50 tons per month",
		triggeredBy: "Manifests Jan–Mar",
		triggeredByType: "DOC",
		timestamp: "11:42 AM",
	},
	{
		id: "chg-ph",
		pointId: "ph",
		field: "sub",
		previousValue: "",
		currentValue: "Inferred from a similar facility — no direct sample",
		triggeredBy: "Historical dossier — similar site",
		triggeredByType: "PDF",
		timestamp: "11:40 AM",
	},
];

// ── Capture Result (post-ingestion feedback) ───────────────────────────────

export const DEMO_CAPTURE_RESULT: CaptureResult = {
	inputSummary: "Lab Report #LR-884",
	mappedPoints: ["volume", "ph"],
	mappedLabels: ["Monthly volume updated", "pH qualifier added"],
};

// ── Recent Updates (for rail default state) ────────────────────────────────

export type RecentUpdateType = "brief" | "evidence" | "correction";

export interface RecentUpdate {
	id: string;
	type: RecentUpdateType;
	label: string;
	detail: string;
	time: string;
}

export const DEMO_RECENT_UPDATES: RecentUpdate[] = [
	{
		id: "ru-1",
		type: "brief",
		label: "Brief refreshed — v3",
		detail: "2 points updated from new manifests",
		time: "11:42 AM",
	},
	{
		id: "ru-2",
		type: "evidence",
		label: "Lab Report #LR-884 ingested",
		detail: "Solids % conflict detected",
		time: "11:40 AM",
	},
	{
		id: "ru-3",
		type: "correction",
		label: "Volume qualifier added",
		detail: "Field agent noted contract cap discrepancy",
		time: "Yesterday",
	},
];

// ── Readiness ──────────────────────────────────────────────────────────────

export interface ReadinessModel {
	percent: number;
	label: string;
	blockers: string[];
	changedCount: number;
	reviewCount: number;
}

export const DEMO_READINESS: ReadinessModel = {
	percent: 58,
	label: "In progress",
	blockers: ["Solids % conflict unresolved", "EPA waste code missing"],
	changedCount: 2,
	reviewCount: 3,
};

// ── Helper ─────────────────────────────────────────────────────────────────

export function getPendingReviewCount(): number {
	return DEMO_BRIEF_SECTIONS.flatMap((s) => s.points).filter(
		(p) => p.state === "needs-review" || p.state === "conflict",
	).length;
}
