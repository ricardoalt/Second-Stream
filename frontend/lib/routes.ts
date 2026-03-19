/**
 * Centralized Route Definitions
 * Single source of truth para todas las URLs de la aplicación
 *
 * Uso:
 * import { routes } from '@/lib/routes'
 * router.push(routes.project.technical(projectId))
 */

import type { DraftTarget } from "@/lib/types/dashboard";

// ==============================================
// ROUTE BUILDER TYPES
// ==============================================

export type RouteBuilder<
	T extends Record<string, unknown> = Record<string, never>,
> = T extends Record<string, never> ? string : (params: T) => string;

// ==============================================
// TAB ENUMS
// ==============================================

export enum ProjectTab {
	Overview = "overview",
	Technical = "technical",
	Proposals = "proposals",
	Files = "files",
}

export enum ProposalView {
	Default = "default",
	PDF = "pdf",
	Edit = "edit",
}

export enum WorkspaceView {
	Workspace = "workspace",
	Files = "files",
}

// ==============================================
// MAIN ROUTES
// ==============================================

export const routes = {
	// Root
	home: "/",

	// Dashboard
	dashboard: "/dashboard",

	// Projects
	project: {
		/**
		 * Proyecto detail (vista general)
		 * @param id - Project ID
		 */
		detail: (id: string) => `/project/${id}` as const,

		/**
		 * Workspace default (replaces old tab navigation)
		 */
		tab: (id: string, _tab: ProjectTab) => `/project/${id}` as const,

		/**
		 * Workspace default (was Overview tab)
		 */
		overview: (id: string) => `/project/${id}` as const,

		/**
		 * Workspace default (was Technical/Questionnaire tab)
		 */
		technical: (id: string, _options?: { quickstart?: boolean }) =>
			`/project/${id}` as const,

		/**
		 * Workspace default (proposals hidden in v1, navigates to workspace)
		 */
		proposals: (id: string) => `/project/${id}` as const,

		/**
		 * Files view via workspace local switch
		 */
		files: (id: string) =>
			`/project/${id}?view=${WorkspaceView.Files}` as const,

		/**
		 * Intelligence Report standalone page
		 */
		intelligenceReport: (id: string) =>
			`/project/${id}/intelligence-report` as const,

		/**
		 * Proposal detail standalone page
		 */
		proposalDetail: (id: string) => `/project/${id}/proposal` as const,

		// Nested: Proposals
		proposal: {
			/**
			 * Proposal detail
			 * @param projectId - Project ID
			 * @param proposalId - Proposal ID
			 */
			detail: (projectId: string, proposalId: string) =>
				`/project/${projectId}/proposals/${proposalId}` as const,

			/**
			 * Proposal with specific view
			 */
			view: (projectId: string, proposalId: string, view: ProposalView) =>
				`/project/${projectId}/proposals/${proposalId}?view=${view}` as const,

			/**
			 * Proposal PDF view
			 */
			pdf: (projectId: string, proposalId: string) =>
				`/project/${projectId}/proposals/${proposalId}?view=${ProposalView.PDF}` as const,
		},
	},
} as const;

// ==============================================
// CONFIRMATION FLOW NAVIGATION
// ==============================================

/**
 * Build URL for draft item confirmation flow.
 *
 * The review UI always lives on `/companies/:companyId`. For location-backed
 * drafts, `target.entrypointId` is a location UUID — so we need the
 * row-level `companyId` passed separately.
 *
 * Returns `null` for orphan/unassigned drafts (no companyId) — callers
 * should render a disabled state instead of navigating.
 */
export function buildConfirmationFlowUrl(
	target: DraftTarget,
	/** Row-level companyId (null for orphan drafts). */
	companyId: string | null,
): string | null {
	if (!companyId) return null;

	const base = `/companies/${companyId}`;

	const params = new URLSearchParams({
		run_id: target.runId,
		source_type: target.sourceType,
	});

	return `${base}?${params.toString()}`;
}

// ==============================================
// TYPE EXPORTS
// ==============================================

export type AppRoutes = typeof routes;
