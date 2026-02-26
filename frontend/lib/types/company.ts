/**
 * Company and Location types matching backend schemas
 */

import type { Sector, Subsector } from "@/lib/sectors-config";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPANY TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CompanyBase {
	name: string;
	industry: string;
	sector: Sector;
	subsector: Subsector;
	customerType: CustomerType;
	contactName?: string;
	contactEmail?: string;
	contactPhone?: string;
	notes?: string;
	tags?: string[];
}

export const CUSTOMER_TYPES = ["buyer", "generator", "both"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
	buyer: "Buyer",
	generator: "Generator",
	both: "Both",
};

export interface CompanyCreate extends CompanyBase {}

export interface CompanyUpdate extends Partial<CompanyBase> {}

export interface CompanySummary extends CompanyBase {
	id: string;
	locationCount: number;
	createdAt: string;
	updatedAt: string;
	createdByUserId?: string;
	archivedAt?: string | null;
	archivedByUserId?: string | null;
}

export interface CompanyDetail extends CompanySummary {
	locations: LocationSummary[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCATION TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface LocationBase {
	name: string;
	city: string;
	state: string;
	address?: string;
	latitude?: number;
	longitude?: number;
	notes?: string;
	addressType: AddressType;
	zipCode?: string | null;
}

export const ADDRESS_TYPES = [
	"headquarters",
	"pickup",
	"delivery",
	"billing",
] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
	headquarters: "Headquarters",
	pickup: "Pick-up",
	delivery: "Delivery",
	billing: "Billing",
};

export interface LocationCreate extends LocationBase {
	companyId: string;
}

export interface LocationUpdate extends Partial<LocationBase> {}

export interface LocationSummary extends LocationBase {
	id: string;
	companyId: string;
	fullAddress: string;
	projectCount: number;
	createdAt: string;
	updatedAt: string;
	createdByUserId?: string;
	archivedAt?: string | null;
	archivedByUserId?: string | null;
	archivedByParentId?: string | null;
}

export interface LocationDetail extends LocationSummary {
	company?: CompanySummary;
	projects?: Array<{
		id: string;
		name: string;
		status: string;
		createdAt: string;
	}>;
	contacts?: LocationContact[];
	incomingMaterials?: IncomingMaterial[];
}

export interface LocationContact {
	id: string;
	locationId: string;
	name: string;
	email?: string;
	phone?: string;
	title?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INCOMING MATERIALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const INCOMING_MATERIAL_CATEGORIES = [
	"chemicals",
	"metals",
	"wood",
	"oil",
	"packaging",
	"plastics",
	"glass",
	"paper",
	"textiles",
	"other",
] as const;

export type IncomingMaterialCategory =
	(typeof INCOMING_MATERIAL_CATEGORIES)[number];

export const INCOMING_MATERIAL_CATEGORY_LABELS: Record<
	IncomingMaterialCategory,
	string
> = {
	chemicals: "Chemicals",
	metals: "Metals",
	wood: "Wood",
	oil: "Oil",
	packaging: "Packaging",
	plastics: "Plastics",
	glass: "Glass",
	paper: "Paper",
	textiles: "Textiles",
	other: "Other",
};

export interface IncomingMaterial {
	id: string;
	locationId: string;
	name: string;
	category: IncomingMaterialCategory;
	volumeFrequency: string;
	qualitySpec?: string;
	currentSupplier?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORM TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CompanyFormData {
	name: string;
	industry: string;
	sector: Sector | "";
	subsector: Subsector | "";
	customerType: CustomerType | "";
	contactName: string;
	contactEmail: string;
	contactPhone: string;
	notes?: string;
}

export interface LocationFormData {
	name: string;
	city: string;
	state: string;
	address: string;
	addressType: AddressType;
	zipCode: string;
	notes?: string;
}
