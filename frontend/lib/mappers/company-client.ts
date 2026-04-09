/**
 * Mapper: Company backend types → Client UI types
 *
 * This module defines the thin client-facing types used by the Clients family
 * and maps backend Company/Location/CompanyContact data into them.
 *
 * Design decision: Client UI = backend Company. There is no separate "Client"
 * entity. The mapper bridges the naming gap and extracts the primary contact.
 */

import type {
	AccountStatus,
	CompanyContact,
	CompanyDetail,
	CompanySummary,
	CustomerType,
	LocationSummary,
} from "@/lib/types/company";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLIENT-FACING TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Primary contact extracted from CompanyDetail.contacts. */
export type PrimaryContact = {
	id: string;
	name: string;
	email: string;
	phone: string;
	title: string;
};

/** Row in the portfolio table. */
export type PortfolioRow = {
	id: string;
	name: string;
	industry: string;
	sector: string;
	locationCount: number;
	primaryContact: PrimaryContact | null;
	createdAt: string;
	updatedAt: string;
};

/** Full profile view sourced from CompanyDetail. */
export type ClientProfile = {
	id: string;
	name: string;
	industry: string;
	customerType: CustomerType;
	accountStatus: AccountStatus | null;
	sector: string;
	subsector: string | null;
	notes: string;
	locationCount: number;
	locations: LocationSummary[];
	contacts: CompanyContact[];
	primaryContact: PrimaryContact | null;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Extracts the primary contact from a list of CompanyContacts. */
export function extractPrimaryContact(
	contacts: CompanyContact[],
): PrimaryContact | null {
	const primary = contacts.find((c) => c.isPrimary);
	if (!primary) return null;
	return {
		id: primary.id,
		name: primary.name ?? "",
		email: primary.email ?? "",
		phone: primary.phone ?? "",
		title: primary.title ?? "",
	};
}

/** Maps a CompanySummary to a portfolio table row. */
export function toPortfolioRow(company: CompanySummary): PortfolioRow {
	return {
		id: company.id,
		name: company.name,
		industry: company.industry,
		sector: company.sector,
		locationCount: company.locationCount,
		primaryContact: null, // Not available from summary endpoint
		createdAt: company.createdAt,
		updatedAt: company.updatedAt,
	};
}

/**
 * Maps a CompanySummary + detail contacts to a portfolio row with contact.
 * Used when the full CompanyDetail is fetched (profile page back-populates list).
 */
export function toPortfolioRowWithContact(
	company: CompanyDetail,
): PortfolioRow {
	return {
		id: company.id,
		name: company.name,
		industry: company.industry,
		sector: company.sector,
		locationCount: company.locationCount,
		primaryContact: extractPrimaryContact(company.contacts),
		createdAt: company.createdAt,
		updatedAt: company.updatedAt,
	};
}

/** Maps a CompanyDetail to a full client profile. */
export function toClientProfile(company: CompanyDetail): ClientProfile {
	return {
		id: company.id,
		name: company.name,
		industry: company.industry,
		customerType: company.customerType,
		accountStatus: company.accountStatus ?? null,
		sector: company.sector,
		subsector: company.subsector,
		notes: company.notes ?? "",
		locationCount: company.locationCount,
		locations: company.locations,
		contacts: company.contacts,
		primaryContact: extractPrimaryContact(company.contacts),
		archivedAt: company.archivedAt ?? null,
		createdAt: company.createdAt,
		updatedAt: company.updatedAt,
	};
}

/** Formats a truthful offers-count signal for client stream rows. */
export function formatOffersCountSignal(count: number): string {
	const normalizedCount = Number.isFinite(count)
		? Math.max(0, Math.floor(count))
		: 0;

	if (normalizedCount === 1) {
		return "1 offer";
	}

	return `${normalizedCount} offers`;
}
