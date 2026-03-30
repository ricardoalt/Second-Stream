import { describe, expect, it } from "bun:test";
import {
	extractPrimaryContact,
	formatOffersCountSignal,
	toClientProfile,
	toPortfolioRow,
	toPortfolioRowWithContact,
} from "@/lib/mappers/company-client";
import type {
	CompanyContact,
	CompanyDetail,
	CompanySummary,
} from "@/lib/types/company";

const baseContact = (overrides?: Partial<CompanyContact>): CompanyContact => ({
	id: overrides?.id ?? "contact-1",
	companyId: overrides?.companyId ?? "company-1",
	name: overrides?.name ?? "Avery Stone",
	email: overrides?.email ?? "avery@northstar.com",
	phone: overrides?.phone ?? "+1 555 000 1234",
	title: overrides?.title ?? "Plant Manager",
	notes: overrides?.notes,
	isPrimary: overrides?.isPrimary ?? false,
	createdAt: overrides?.createdAt ?? "2026-03-01T00:00:00.000Z",
	updatedAt: overrides?.updatedAt ?? "2026-03-02T00:00:00.000Z",
});

const baseCompanySummary = (
	overrides?: Partial<CompanySummary>,
): CompanySummary => ({
	id: overrides?.id ?? "company-1",
	name: overrides?.name ?? "Northstar Chemicals",
	industry: overrides?.industry ?? "Chemicals",
	sector: overrides?.sector ?? "chemicals_pharmaceuticals",
	subsector: overrides?.subsector ?? "chemical_manufacturing",
	customerType: overrides?.customerType ?? "generator",
	notes: overrides?.notes,
	tags: overrides?.tags,
	locationCount: overrides?.locationCount ?? 2,
	createdAt: overrides?.createdAt ?? "2026-03-01T00:00:00.000Z",
	updatedAt: overrides?.updatedAt ?? "2026-03-10T00:00:00.000Z",
	createdByUserId: overrides?.createdByUserId,
	archivedAt: overrides?.archivedAt,
	archivedByUserId: overrides?.archivedByUserId,
});

const baseCompanyDetail = (
	overrides?: Partial<CompanyDetail>,
): CompanyDetail => ({
	...baseCompanySummary(overrides),
	locations: overrides?.locations ?? [],
	contacts: overrides?.contacts ?? [],
});

describe("company-client mappers", () => {
	it("returns null when no primary contact exists", () => {
		const result = extractPrimaryContact([
			baseContact({ isPrimary: false }),
			baseContact({ id: "contact-2", isPrimary: false }),
		]);

		expect(result).toBeNull();
	});

	it("extracts primary contact and normalizes optional fields", () => {
		const result = extractPrimaryContact([
			baseContact({ isPrimary: false }),
			{
				id: "contact-primary",
				companyId: "company-1",
				isPrimary: true,
				createdAt: "2026-03-01T00:00:00.000Z",
				updatedAt: "2026-03-02T00:00:00.000Z",
			},
		]);

		expect(result).toEqual({
			id: "contact-primary",
			name: "",
			email: "",
			phone: "",
			title: "",
		});
	});

	it("maps CompanySummary to PortfolioRow with null primary contact", () => {
		const row = toPortfolioRow(baseCompanySummary());

		expect(row).toMatchObject({
			id: "company-1",
			name: "Northstar Chemicals",
			locationCount: 2,
			primaryContact: null,
		});
	});

	it("maps CompanyDetail to PortfolioRow including primary contact", () => {
		const row = toPortfolioRowWithContact(
			baseCompanyDetail({
				contacts: [baseContact({ isPrimary: true })],
			}),
		);

		expect(row.primaryContact?.name).toBe("Avery Stone");
		expect(row.primaryContact?.email).toBe("avery@northstar.com");
	});

	it("maps CompanyDetail to ClientProfile preserving company-backed fields", () => {
		const detail = baseCompanyDetail({
			notes: "High-volume account",
			contacts: [baseContact({ isPrimary: true })],
		});

		const profile = toClientProfile(detail);

		expect(profile.id).toBe(detail.id);
		expect(profile.name).toBe(detail.name);
		expect(profile.locationCount).toBe(detail.locationCount);
		expect(profile.contacts).toEqual(detail.contacts);
		expect(profile.primaryContact?.id).toBe("contact-1");
		expect(profile.notes).toBe("High-volume account");
	});

	it("formats truthful offers-count signals for related streams", () => {
		expect(formatOffersCountSignal(0)).toBe("0 offers");
		expect(formatOffersCountSignal(1)).toBe("1 offer");
		expect(formatOffersCountSignal(4)).toBe("4 offers");
		expect(formatOffersCountSignal(-2)).toBe("0 offers");
		expect(formatOffersCountSignal(Number.NaN)).toBe("0 offers");
	});
});
