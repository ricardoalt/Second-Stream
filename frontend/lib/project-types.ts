import type { DataSource } from "@/lib/constants";
import type { Sector } from "@/lib/sectors-config";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import type { ProposalDTO } from "@/lib/types/proposal-dto";
import type { TableSection } from "@/lib/types/technical-data";

// Define ProjectStatus here (moved from constants to avoid circular dependency)
export type ProjectStatus =
	| "In Preparation"
	| "Generating Proposal"
	| "Proposal Ready"
	| "In Development"
	| "Completed"
	| "On Hold";

// Type aliases for backwards compatibility
export type ProjectSector = Sector;
export type { DataSource };

export type ProjectSubsector = {
	Commercial: "Shopping Mall" | "Hotel" | "Office Building" | "Other";
	Residential: "Single Home" | "Multi-Family Complex" | "Other";
	Industrial: "Food & Beverage" | "Textile" | "Pharmaceuticals" | "Other";
	Municipal: "City Government Building" | "Public Utility" | "Other";
};

export interface ProjectSummary {
	id: string;
	name: string;
	// Inherited from Location → Company (read-only)
	sector: ProjectSector;
	subsector?: string;
	client: string; // Inherited from Company.name
	location: string; // Inherited from Location (name, city)
	// Required: Location relationship
	locationId: string; // Required - source of truth
	companyName?: string; // Computed from location.company
	locationName?: string; // Computed from location_rel
	// Standard fields
	status: ProjectStatus;
	progress: number;
	proposalFollowUpState?: ProposalFollowUpState | null;
	createdAt: string;
	updatedAt: string;
	// Ownership
	userId?: string; // Owner of the project (sales agent)
	// Archive fields
	archivedAt?: string | null;
	archivedByUserId?: string | null;
	archivedByParentId?: string | null;
	projectType: string;
	description: string;
	proposalsCount: number;
	filesCount: number;
	tags?: string[];
}

export interface ProposalComparison {
	fromVersionId: string;
	toVersionId: string;
	changes: Array<{
		id: string;
		section: string;
		field: string;
		oldValue: string | number | null;
		newValue: string | number | null;
		changeType: "added" | "modified" | "removed";
	}>;
}

export type VersionSource = "manual" | "import" | "ai" | "rollback";

export interface VersionChange {
	id: string;
	sectionId: string;
	fieldId: string;
	label: string;
	oldValue: string | number | string[] | null;
	newValue: string | number | string[] | null;
	unit?: string;
	source: VersionSource;
	changeType: "added" | "modified" | "removed";
}

export interface TechnicalDataVersion {
	id: string;
	projectId: string;
	versionLabel: string;
	createdAt: string;
	createdBy: string;
	source: VersionSource;
	notes?: string;
	snapshot: TableSection[];
	changes: VersionChange[];
}

export interface ProjectVersionSummary {
	id: string;
	projectId: string;
	versionLabel: string;
	type: "technical-data" | "proposal" | "file" | "decision";
	createdAt: string;
	createdBy: string;
	source: VersionSource;
	notes?: string;
}

export type TimelineEventType =
	| "version"
	| "proposal"
	| "edit"
	| "upload"
	| "assistant"
	| "import";

export interface TimelineEvent {
	id: string;
	type: TimelineEventType;
	title: string;
	description: string;
	user: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface ProjectFile {
	id: string;
	filename: string;
	file_size: number;
	file_type: string;
	category: string;
	uploaded_at: string;
	processed_text: boolean;
	ai_analysis: boolean;
	processing_status: string;
}

export interface ProjectFileDetail {
	id: string;
	project_id: string;
	filename: string;
	file_size: number;
	file_type: string;
	category: string;
	uploaded_at: string;
	processed_text: string | null;
	ai_analysis: Record<string, unknown> | null;
}

export interface ProjectDetail extends ProjectSummary {
	technicalSections: TableSection[];
	proposals: ProposalDTO[];
	timeline: TimelineEvent[];
	files: ProjectFile[];
	analytics?: {
		capexDelta?: number;
		opexDelta?: number;
		riskHighlights?: string[];
	};
}
