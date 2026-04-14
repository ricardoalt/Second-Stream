const pageTitleMap: Record<string, string> = {
	"/dashboard": "Dashboard",
	"/streams": "Waste Streams",
	"/leads": "Lead Portfolio",
	"/clients": "Client Portfolio",
	"/offers": "Offers Pipeline",
	"/offers/archive": "Historical Archive",
	"/settings/team": "Team Management",
	"/admin/organizations": "Organizations",
	"/admin/users": "Platform Admins",
	"/admin/feedback": "User Feedback",
	"/admin/proposal-ratings": "Proposal Ratings",
};

export function getTopBarTitle(pathname: string): string {
	if (pathname.startsWith("/streams/")) return "Stream Workspace";
	if (pathname.startsWith("/leads/")) {
		if (pathname.endsWith("/contacts")) return "Lead Contacts";
		if (pathname.endsWith("/locations")) return "Lead Locations";
		return "Lead Profile";
	}

	if (pathname.startsWith("/clients/")) {
		if (pathname.endsWith("/contacts")) return "Company Contacts";
		if (pathname.endsWith("/locations")) return "Company Locations";
		return "Client Profile";
	}

	if (pathname.startsWith("/offers/")) return "Offer Detail";
	return pageTitleMap[pathname] ?? "Workspace";
}
