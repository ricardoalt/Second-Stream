import {
	Building2,
	FileText,
	Home,
	Layers,
	UserRoundSearch,
	Users,
} from "lucide-react";

const FIELD_AGENT_NAV_ITEMS = [
	{ href: "/dashboard", label: "Dashboard", icon: Home },
	{ href: "/leads", label: "Leads", icon: UserRoundSearch },
	{ href: "/streams", label: "Streams", icon: Layers },
	{ href: "/clients", label: "Clients", icon: Building2 },
	{ href: "/offers", label: "Offers", icon: FileText },
];

const ADMIN_NAV_ITEMS = [
	...FIELD_AGENT_NAV_ITEMS,
	{ href: "/settings/team", label: "Team Management", icon: Users },
];

const SUPERADMIN_NAV_ITEMS = [
	...ADMIN_NAV_ITEMS,
	{ href: "/admin/organizations", label: "Organizations", icon: Building2 },
];

export type SidebarRole = "field-agent" | "org-admin" | "superadmin";

export function getSidebarNavItems(role: SidebarRole) {
	if (role === "superadmin") {
		return SUPERADMIN_NAV_ITEMS;
	}

	if (role === "org-admin") {
		return ADMIN_NAV_ITEMS;
	}

	return FIELD_AGENT_NAV_ITEMS;
}
