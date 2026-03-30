import type { AddClientFormData } from "@/lib/forms/schemas";
import {
	getSectorConfig,
	isSectorId,
	isSubsectorInSector,
} from "@/lib/sectors-config";
import type {
	CompanyContact,
	CompanyCreate,
	CompanyDetail,
	LocationSummary,
} from "@/lib/types/company";

export type AddClientCreateState =
	| "success"
	| "partial-contact"
	| "partial-location";

export type AddClientFlowResult = {
	companyId: string;
	createState: AddClientCreateState;
};

export type AddClientFlowDeps = {
	createCompany: (payload: CompanyCreate) => Promise<CompanyDetail>;
	createCompanyContact: (
		companyId: string,
		payload: {
			name?: string;
			title?: string;
			email?: string;
			phone?: string;
			isPrimary: true;
		},
	) => Promise<CompanyContact>;
	createLocation: (
		companyId: string,
		payload: {
			companyId: string;
			name: string;
			address?: string;
			city: string;
			state: string;
			zipCode: string;
			addressType: "headquarters";
		},
	) => Promise<LocationSummary>;
};

function deriveIndustryLabel(sectorId: string, subsectorId: string): string {
	if (!isSectorId(sectorId)) {
		throw new Error("Invalid sector for Add Client taxonomy.");
	}

	if (!isSubsectorInSector(sectorId, subsectorId)) {
		throw new Error("Invalid subsector for selected Add Client sector.");
	}

	const subsectorLabel = getSectorConfig(sectorId)?.subsectors.find(
		(item) => item.id === subsectorId,
	)?.label;
	if (subsectorLabel) {
		return subsectorLabel;
	}

	const sectorLabel = getSectorConfig(sectorId)?.label;
	if (sectorLabel) {
		return sectorLabel;
	}

	throw new Error("Unable to derive Add Client industry from taxonomy.");
}

export function toCompanyPayload(data: AddClientFormData): CompanyCreate {
	const sector = data.sector.trim() as CompanyCreate["sector"];
	const subsector = data.subsector.trim() as CompanyCreate["subsector"];
	const industry = deriveIndustryLabel(sector, subsector);

	return {
		name: data.name.trim(),
		industry,
		sector,
		subsector,
		customerType: data.customerType,
		accountStatus: data.accountStatus,
		notes: data.companyNotes?.trim() ?? "",
	};
}

export function toPrimaryContactPayload(data: AddClientFormData): {
	name?: string;
	title?: string;
	email?: string;
	phone?: string;
	isPrimary: true;
} {
	return {
		...(data.contactName.trim() ? { name: data.contactName.trim() } : {}),
		...(data.contactTitle.trim() ? { title: data.contactTitle.trim() } : {}),
		...(data.contactEmail.trim() ? { email: data.contactEmail.trim() } : {}),
		...(data.contactPhone.trim() ? { phone: data.contactPhone.trim() } : {}),
		isPrimary: true,
	};
}

export function toFirstLocationPayload(
	companyId: string,
	data: AddClientFormData,
): {
	companyId: string;
	name: string;
	address?: string;
	city: string;
	state: string;
	zipCode: string;
	addressType: "headquarters";
} {
	return {
		companyId,
		name: data.locationName.trim(),
		...(data.locationAddress.trim()
			? { address: data.locationAddress.trim() }
			: {}),
		city: data.locationCity.trim(),
		state: data.locationState.trim(),
		zipCode: data.locationZipCode.trim(),
		addressType: "headquarters",
	};
}

export async function runAddClientFlow(
	data: AddClientFormData,
	deps: AddClientFlowDeps,
): Promise<AddClientFlowResult> {
	const company = await deps.createCompany(toCompanyPayload(data));

	try {
		await deps.createCompanyContact(company.id, toPrimaryContactPayload(data));
	} catch {
		return { companyId: company.id, createState: "partial-contact" };
	}

	try {
		await deps.createLocation(
			company.id,
			toFirstLocationPayload(company.id, data),
		);
	} catch {
		return { companyId: company.id, createState: "partial-location" };
	}

	return { companyId: company.id, createState: "success" };
}

export function buildClientCreateHandoffUrl(
	companyId: string,
	createState: AddClientCreateState,
): string {
	return `/clients/${companyId}?create=${createState}`;
}
