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
		 * Proyecto con tab específico
		 * @param id - Project ID
		 * @param tab - Tab to show
		 */
		tab: (id: string, tab: ProjectTab) => `/project/${id}?tab=${tab}` as const,

		/**
		 * Overview tab
		 */
		overview: (id: string) =>
			`/project/${id}?tab=${ProjectTab.Overview}` as const,

		/**
		 * Technical data tab
		 */
		technical: (id: string, options?: { quickstart?: boolean }) => {
			const base = `/project/${id}?tab=${ProjectTab.Technical}`;
			return options?.quickstart ? `${base}&quickstart=true` : base;
		},

		/**
		 * Proposals tab
		 */
		proposals: (id: string) =>
			`/project/${id}?tab=${ProjectTab.Proposals}` as const,

		/**
		 * Files tab
		 */
		files: (id: string) => `/project/${id}?tab=${ProjectTab.Files}` as const,

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
