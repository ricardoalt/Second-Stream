"use client";

import { use, useEffect, useState } from "react";
import { CompanyLocationsPageContent } from "@/components/features/companies/company-locations-page-content";
import { companiesAPI } from "@/lib/api/companies";
import { useLocationStore } from "@/lib/stores/location-store";

export default function LeadLocationsPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = use(props.params);
	const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
	const [companyName, setCompanyName] = useState<string | null>(null);
	const {
		locations,
		loading,
		error,
		loadLocationsByCompany,
		deleteLocation,
		clearError,
	} = useLocationStore();

	useEffect(() => {
		let isMounted = true;
		void companiesAPI
			.get(companyId)
			.then((company) => {
				if (isMounted) {
					setCompanyName(company.name);
				}
			})
			.catch(() => {
				if (isMounted) {
					setCompanyName(null);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [companyId]);

	return (
		<CompanyLocationsPageContent
			companyId={companyId}
			companyName={companyName}
			lifecycle="lead"
			locations={locations}
			loading={loading}
			error={error}
			loadLocationsByCompany={loadLocationsByCompany}
			deleteLocation={deleteLocation}
			clearError={clearError}
		/>
	);
}
