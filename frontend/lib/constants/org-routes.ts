/**
 * Organization Context Route Configuration
 *
 * Uses an ALLOWLIST pattern (routes that DON'T require org) instead of a blocklist.
 * This is safer: new routes require org context by default, reducing bugs.
 *
 * Super admins must select an organization before accessing protected routes.
 * Regular users are auto-scoped to their organization.
 */

/**
 * Routes that DON'T require organization context for super admins.
 * All other authenticated routes require org selection.
 */
export const ORG_EXEMPT_ROUTES = [
	// Auth routes (public)
	"/login",
	"/register",
	"/forgot-password",
	"/reset-password",

	// Superadmin console routes (handle org selection in-layout)
	"/admin",

	// User-specific pages (not org-scoped)
	"/profile",
	"/settings",
] as const;

/**
 * Check if a route is exempt from organization context requirement.
 * Returns true if the route doesn't need org selection for super admins.
 */
export function isOrgExemptRoute(pathname: string): boolean {
	return ORG_EXEMPT_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
}

export type OrgExemptRoute = (typeof ORG_EXEMPT_ROUTES)[number];
