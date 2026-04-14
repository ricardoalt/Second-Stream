export type CompanyLifecycle = "lead" | "client";
export type CompanySubpageSection = "contacts" | "locations";

type BreadcrumbItem = {
	label: string;
	href?: string;
};

const lifecycleNav = {
	lead: {
		listLabel: "Leads",
		listHref: "/leads",
		detailFallbackLabel: "Lead",
		detailBasePath: "/leads",
	},
	client: {
		listLabel: "Clients",
		listHref: "/clients",
		detailFallbackLabel: "Client",
		detailBasePath: "/clients",
	},
} as const;

const sectionLabel: Record<CompanySubpageSection, string> = {
	contacts: "Contacts",
	locations: "Locations",
};

export function getCompanySubpageRoute(
	lifecycle: CompanyLifecycle,
	companyId: string,
	section: CompanySubpageSection,
): string {
	return `${lifecycleNav[lifecycle].detailBasePath}/${companyId}/${section}`;
}

export function getCompanySubpageBreadcrumbs(params: {
	lifecycle: CompanyLifecycle;
	companyId: string;
	section: CompanySubpageSection;
	companyName?: string | null;
}): BreadcrumbItem[] {
	const { lifecycle, companyId, section, companyName } = params;
	const nav = lifecycleNav[lifecycle];

	return [
		{ label: nav.listLabel, href: nav.listHref },
		{
			label: companyName?.trim() || nav.detailFallbackLabel,
			href: `${nav.detailBasePath}/${companyId}`,
		},
		{ label: sectionLabel[section] },
	];
}
