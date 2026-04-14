"use client";

import { use } from "react";
import { CompanyContactsPageContent } from "@/components/features/companies/company-contacts-page-content";
import { companiesAPI, locationsAPI } from "@/lib/api/companies";

export default function ClientContactsPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = use(props.params);
	const companyId = Array.isArray(params.id) ? params.id[0] : params.id;

	return (
		<CompanyContactsPageContent
			companyId={companyId}
			lifecycle="client"
			loadCompany={(id) => companiesAPI.get(id)}
			loadLocationSummaries={(id) => locationsAPI.listByCompany(id, "active")}
			loadLocationDetail={(locationId) =>
				locationsAPI.get(locationId, "active")
			}
		/>
	);
}
