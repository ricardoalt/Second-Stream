import type { ClientProfile } from "@/lib/mappers/company-client";
import {
	getSectorConfig,
	isSectorId,
	isSubsectorInSector,
} from "@/lib/sectors-config";
import type { AddressType, CompanyUpdate } from "@/lib/types/company";

export type EditClientFormValues = {
	companyName: string;
	sector: string;
	subsector?: string | null;
	accountStatus: "active" | "prospect";
	companyNotes: string;
	contactName: string;
	contactTitle: string;
	contactEmail: string;
	contactPhone: string;
};

type LocationDraft = {
	name: string;
	addressType: AddressType;
	city: string;
	state: string;
	address?: string;
	zipCode?: string | null;
	notes?: string;
};

export function buildEditClientInitialValues(
	profile: ClientProfile,
): EditClientFormValues {
	return {
		companyName: profile.name,
		sector: profile.sector,
		subsector: profile.subsector ?? "",
		accountStatus: profile.accountStatus ?? "active",
		companyNotes: profile.notes,
		contactName: profile.primaryContact?.name ?? "",
		contactTitle: profile.primaryContact?.title ?? "",
		contactEmail: profile.primaryContact?.email ?? "",
		contactPhone: profile.primaryContact?.phone ?? "",
	};
}

function resolveIndustryLabel(sector: string, subsector: string): string {
	if (!isSectorId(sector)) {
		throw new Error("Please select a valid sector");
	}

	if (subsector.length === 0) {
		return getSectorConfig(sector)?.label ?? sector;
	}

	if (!isSubsectorInSector(sector, subsector)) {
		throw new Error("Please select a valid subsector for the selected sector.");
	}

	const subsectorLabel = getSectorConfig(sector)?.subsectors.find(
		(item) => item.id === subsector,
	)?.label;

	if (subsectorLabel) {
		return subsectorLabel;
	}

	throw new Error("Unable to derive company industry from selected taxonomy.");
}

export function buildEditClientCompanyPayload(values: EditClientFormValues) {
	const sector = values.sector.trim();
	const subsector = values.subsector?.trim() ?? "";
	if (!isSectorId(sector)) {
		throw new Error("Please select a valid sector");
	}

	return {
		name: values.companyName.trim(),
		industry: resolveIndustryLabel(sector, subsector),
		sector,
		subsector: subsector.length > 0 ? subsector : null,
		accountStatus: values.accountStatus,
		notes: values.companyNotes.trim(),
	} satisfies CompanyUpdate;
}

export function buildEditClientContactPayload(
	values: EditClientFormValues,
): Record<string, string> {
	const payload: Record<string, string> = {};
	if (values.contactName.trim()) payload.name = values.contactName.trim();
	if (values.contactTitle.trim()) payload.title = values.contactTitle.trim();
	if (values.contactEmail.trim()) payload.email = values.contactEmail.trim();
	if (values.contactPhone.trim()) payload.phone = values.contactPhone.trim();
	return payload;
}

export function hasEditClientPrimaryContactDraft(
	values: EditClientFormValues,
): boolean {
	return (
		values.contactName.trim().length > 0 ||
		values.contactTitle.trim().length > 0 ||
		values.contactEmail.trim().length > 0 ||
		values.contactPhone.trim().length > 0
	);
}

export function buildLocationFormDefaults(location?: LocationDraft) {
	return {
		name: location?.name ?? "",
		addressType: location?.addressType ?? "headquarters",
		city: location?.city ?? "",
		state: location?.state ?? "",
		address: location?.address ?? "",
		zipCode: location?.zipCode ?? "",
		notes: location?.notes ?? "",
	};
}
