import type { ClientProfile } from "@/lib/mappers/company-client";
import type { AddressType } from "@/lib/types/company";

export type EditClientFormValues = {
	companyName: string;
	industry: string;
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
	profile: Pick<ClientProfile, "name" | "industry" | "primaryContact">,
): EditClientFormValues {
	return {
		companyName: profile.name,
		industry: profile.industry,
		contactName: profile.primaryContact?.name ?? "",
		contactTitle: profile.primaryContact?.title ?? "",
		contactEmail: profile.primaryContact?.email ?? "",
		contactPhone: profile.primaryContact?.phone ?? "",
	};
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
