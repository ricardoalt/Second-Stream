import { describe, expect, it } from "bun:test";
import {
	buildEditClientCompanyPayload,
	buildEditClientContactPayload,
	buildEditClientInitialValues,
	buildLocationFormDefaults,
	hasEditClientPrimaryContactDraft,
} from "@/lib/forms/client-form-mappers";
import type { CompanyUpdate } from "@/lib/types/company";

describe("client-form-mappers", () => {
	it("builds edit-client initial values from profile data", () => {
		const values = buildEditClientInitialValues({
			id: "company-1",
			name: "Northstar",
			industry: "Manufacturing",
			sector: "manufacturing_industrial",
			subsector: "metal_fabrication",
			notes: "Strategic account",
			accountStatus: "prospect",
			locationCount: 0,
			locations: [],
			contacts: [],
			archivedAt: null,
			createdAt: "2026-04-07T00:00:00.000Z",
			updatedAt: "2026-04-07T00:00:00.000Z",
			customerType: "generator",
			primaryContact: {
				id: "contact-1",
				name: "Avery",
				title: "Plant Manager",
				email: "avery@example.com",
				phone: "+1 555 000 1234",
			},
		});

		expect(values).toEqual({
			companyName: "Northstar",
			sector: "manufacturing_industrial",
			subsector: "metal_fabrication",
			accountStatus: "prospect",
			companyNotes: "Strategic account",
			contactName: "Avery",
			contactTitle: "Plant Manager",
			contactEmail: "avery@example.com",
			contactPhone: "+1 555 000 1234",
		});
	});

	it("omits blank contact fields from edit payload", () => {
		const payload = buildEditClientContactPayload({
			companyName: "Northstar",
			sector: "manufacturing_industrial",
			subsector: "metal_fabrication",
			accountStatus: "active",
			companyNotes: "",
			contactName: "",
			contactTitle: "",
			contactEmail: "ops@example.com",
			contactPhone: "",
		});

		expect(payload).toEqual({ email: "ops@example.com" });
	});

	it("maps edit form values to company update payload", () => {
		const payload = buildEditClientCompanyPayload({
			companyName: "  Northstar  ",
			sector: "manufacturing_industrial",
			subsector: "metal_fabrication",
			accountStatus: "prospect",
			companyNotes: "  Priority account  ",
			contactName: "",
			contactTitle: "",
			contactEmail: "",
			contactPhone: "",
		});

		expect(payload).toEqual({
			name: "Northstar",
			industry: "Metal Fabrication",
			sector: "manufacturing_industrial",
			subsector: "metal_fabrication",
			accountStatus: "prospect",
			notes: "Priority account",
		});
	});

	it("produces a payload assignable to CompanyUpdate without casts", () => {
		const payload = buildEditClientCompanyPayload({
			companyName: "Northstar",
			sector: "manufacturing_industrial",
			subsector: "metal_fabrication",
			accountStatus: "active",
			companyNotes: "",
			contactName: "",
			contactTitle: "",
			contactEmail: "",
			contactPhone: "",
		});

		const companyUpdate: CompanyUpdate = payload;
		expect(companyUpdate.sector).toBe("manufacturing_industrial");
	});

	it("rejects sector values outside supported taxonomy", () => {
		expect(() =>
			buildEditClientCompanyPayload({
				companyName: "Northstar",
				sector: "unknown",
				subsector: "metal_fabrication",
				accountStatus: "active",
				companyNotes: "",
				contactName: "",
				contactTitle: "",
				contactEmail: "",
				contactPhone: "",
			}),
		).toThrow("Please select a valid sector");
	});

	it("detects when edit primary contact has at least one field", () => {
		expect(
			hasEditClientPrimaryContactDraft({
				companyName: "Northstar",
				sector: "manufacturing_industrial",
				subsector: "metal_fabrication",
				accountStatus: "active",
				companyNotes: "",
				contactName: "",
				contactTitle: "",
				contactEmail: "",
				contactPhone: "",
			}),
		).toBe(false);

		expect(
			hasEditClientPrimaryContactDraft({
				companyName: "Northstar",
				sector: "manufacturing_industrial",
				subsector: "metal_fabrication",
				accountStatus: "active",
				companyNotes: "",
				contactName: "Avery",
				contactTitle: "",
				contactEmail: "",
				contactPhone: "",
			}),
		).toBe(true);
	});

	it("provides defaults for new location form", () => {
		const values = buildLocationFormDefaults();

		expect(values).toEqual({
			name: "",
			addressType: "headquarters",
			city: "",
			state: "",
			address: "",
			zipCode: "",
			notes: "",
		});
	});

	it("hydrates location form defaults in edit mode", () => {
		const values = buildLocationFormDefaults({
			name: "Main Warehouse",
			addressType: "pickup",
			city: "Austin",
			state: "TX",
			address: "100 Main St",
			zipCode: "78701",
			notes: "Dock 3",
		});

		expect(values).toEqual({
			name: "Main Warehouse",
			addressType: "pickup",
			city: "Austin",
			state: "TX",
			address: "100 Main St",
			zipCode: "78701",
			notes: "Dock 3",
		});
	});
});
