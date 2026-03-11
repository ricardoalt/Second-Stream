import type { ProjectStatus } from "./project-types";

// Re-export for convenience
export type { ProjectStatus };

export const PROJECT_STATUS_FLOW: ProjectStatus[] = [
	"In Preparation",
	"Generating Proposal",
	"Proposal Ready",
	"In Development",
	"Completed",
	"On Hold",
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
	"In Preparation": "In Preparation",
	"Generating Proposal": "Generating Proposal",
	"Proposal Ready": "Proposal Ready",
	"In Development": "In Development",
	Completed: "Completed",
	"On Hold": "On Hold",
};

export const PROJECT_STATUS_DESCRIPTIONS: Record<ProjectStatus, string> = {
	"In Preparation": "Complete the technical sheet and validate base data.",
	"Generating Proposal": "The agent is generating waste upcycling analysis.",
	"Proposal Ready": "Review the generated report and share with your team.",
	"In Development": "Iterate with detailed design, BOM, and next phases.",
	Completed: "Project finalized and documented.",
	"On Hold": "Project paused pending further notice.",
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
	"In Preparation": "bg-muted text-muted-foreground",
	"Generating Proposal": "bg-chart-2 text-white",
	"Proposal Ready": "bg-primary text-primary-foreground",
	"In Development": "bg-secondary text-secondary-foreground",
	Completed: "bg-success text-success-foreground",
	"On Hold": "bg-destructive text-destructive-foreground",
};

export const PROJECT_STATUS_STEP: Record<ProjectStatus, number> =
	PROJECT_STATUS_FLOW.reduce(
		(acc, status, index) => {
			acc[status] = index + 1;
			return acc;
		},
		{} as Record<ProjectStatus, number>,
	);

export const PROJECT_STATUS_GROUPS = {
	all: [...PROJECT_STATUS_FLOW],
	active: [
		"In Preparation",
		"Generating Proposal",
		"Proposal Ready",
		"In Development",
	] as ProjectStatus[],
	completed: ["Completed"] as ProjectStatus[],
	onhold: ["On Hold"] as ProjectStatus[],
} as const;

export const isActiveProjectStatus = (status: ProjectStatus) =>
	PROJECT_STATUS_GROUPS.active.includes(status);

export const getProjectStatusLabel = (status: ProjectStatus) =>
	PROJECT_STATUS_LABELS[status] ?? status;

export const getProjectStatusDescription = (status: ProjectStatus) =>
	PROJECT_STATUS_DESCRIPTIONS[status] ?? "";

export const getProjectStatusStep = (status: ProjectStatus) =>
	PROJECT_STATUS_STEP[status] ?? 1;

// Dashboard-specific configuration (centralized to avoid magic numbers)

export const DASHBOARD_THRESHOLDS = {
	readyForProposalProgress: 70,
	stalledDaysWithoutUpdate: 7,
	lowProgressAttention: 50,
	weeklyInsightWindowDays: 7,
} as const;
