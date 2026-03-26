/**
 * Centralized Route Definitions
 * Single source of truth for all application URLs
 */

export const routes = {
	home: "/",
	dashboard: "/dashboard",
	streams: {
		all: "/streams",
		detail: (id: string) => `/streams/${id}` as const,
	},
	clients: {
		all: "/clients",
		detail: (id: string) => `/clients/${id}` as const,
	},
	offers: {
		all: "/offers",
		detail: (id: string) => `/offers/${id}` as const,
		archive: "/offers/archive",
	},
	settings: "/settings",
	profile: "/profile",
	admin: {
		organizations: "/admin/organizations",
		users: "/admin/users",
		feedback: "/admin/feedback",
		proposalRatings: "/admin/proposal-ratings",
	},
} as const;

export type AppRoutes = typeof routes;
