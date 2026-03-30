import { describe, expect, it, mock } from "bun:test";
import {
	buildClientCreateHandoffUrl,
	runAddClientFlow,
	toCompanyPayload,
	toFirstLocationPayload,
} from "@/lib/add-client-flow";
import type { AddClientFormData } from "@/lib/forms/schemas";

const baseData: AddClientFormData = {
	name: "Northstar",
	sector: "manufacturing_industrial",
	subsector: "metal_fabrication",
	customerType: "generator",
	accountStatus: "prospect",
	companyNotes: "",
	contactName: "Avery",
	contactTitle: "Plant Manager",
	contactEmail: "avery@example.com",
	contactPhone: "+1 555 000 1234",
	locationName: "Primary Facility",
	locationAddress: "100 Main St",
	locationCity: "Austin",
	locationState: "TX",
	locationZipCode: "78701",
};

describe("add-client flow", () => {
	it("returns full success when all three steps succeed", async () => {
		const createCompany = mock(async () => ({
			id: "company-1",
			name: "Northstar",
		}));
		const createCompanyContact = mock(async () => ({ id: "contact-1" }));
		const createLocation = mock(async () => ({ id: "location-1" }));

		const result = await runAddClientFlow(baseData, {
			createCompany: createCompany as never,
			createCompanyContact: createCompanyContact as never,
			createLocation: createLocation as never,
		});

		expect(result).toEqual({
			companyId: "company-1",
			createState: "success",
		});
		expect(createCompany).toHaveBeenCalledTimes(1);
		expect(createCompanyContact).toHaveBeenCalledTimes(1);
		expect(createLocation).toHaveBeenCalledTimes(1);
	});

	it("uses headquarters address type for first location", () => {
		const payload = toFirstLocationPayload("company-1", {
			...baseData,
			customerType: "both",
		});

		expect(payload.addressType).toBe("headquarters");
	});

	it("derives backend industry from subsector label", () => {
		const payload = toCompanyPayload(baseData);

		expect(payload.industry).toBe("Metal Fabrication");
	});

	it("falls back to sector label when subsector is unknown", () => {
		expect(() =>
			toCompanyPayload({
				...baseData,
				subsector: "custom_subindustry",
			}),
		).toThrow("Invalid subsector for selected Add Client sector.");
	});

	it("uses safe fallback when sector and subsector are unknown", () => {
		expect(() =>
			toCompanyPayload({
				...baseData,
				sector: "unknown_sector",
				subsector: "custom_subindustry",
			}),
		).toThrow("Invalid sector for Add Client taxonomy.");
	});

	it("derives industry from selected sector taxonomy", () => {
		const payload = toCompanyPayload({
			...baseData,
			sector: "food_beverage",
			subsector: "other",
		});

		expect(payload.industry).toBe("Other");
		expect(payload.sector).toBe("food_beverage");
		expect(payload.subsector).toBe("other");
	});

	it("stops when primary contact creation fails", async () => {
		const createCompany = mock(async () => ({
			id: "company-1",
			name: "Northstar",
		}));
		const createCompanyContact = mock(async () => {
			throw new Error("contact failed");
		});
		const createLocation = mock(async () => ({ id: "location-1" }));

		const result = await runAddClientFlow(baseData, {
			createCompany: createCompany as never,
			createCompanyContact: createCompanyContact as never,
			createLocation: createLocation as never,
		});

		expect(result).toEqual({
			companyId: "company-1",
			createState: "partial-contact",
		});
		expect(createLocation).not.toHaveBeenCalled();
	});

	it("returns partial-location when location creation fails", async () => {
		const createCompany = mock(async () => ({
			id: "company-1",
			name: "Northstar",
		}));
		const createCompanyContact = mock(async () => ({ id: "contact-1" }));
		const createLocation = mock(async () => {
			throw new Error("location failed");
		});

		const result = await runAddClientFlow(baseData, {
			createCompany: createCompany as never,
			createCompanyContact: createCompanyContact as never,
			createLocation: createLocation as never,
		});

		expect(result).toEqual({
			companyId: "company-1",
			createState: "partial-location",
		});
		expect(createCompanyContact).toHaveBeenCalledTimes(1);
		expect(createLocation).toHaveBeenCalledTimes(1);
	});

	it("throws when company creation fails (caller keeps modal open)", async () => {
		const createCompany = mock(async () => {
			throw new Error("company failed");
		});
		const createCompanyContact = mock(async () => ({ id: "contact-1" }));
		const createLocation = mock(async () => ({ id: "location-1" }));

		await expect(
			runAddClientFlow(baseData, {
				createCompany: createCompany as never,
				createCompanyContact: createCompanyContact as never,
				createLocation: createLocation as never,
			}),
		).rejects.toThrow("company failed");
		expect(createCompanyContact).not.toHaveBeenCalled();
		expect(createLocation).not.toHaveBeenCalled();
	});

	it("returns success handoff URL", () => {
		expect(buildClientCreateHandoffUrl("abc", "success")).toBe(
			"/clients/abc?create=success",
		);
	});

	it("sends only mapped fields to backend payloads", async () => {
		const createCompany = mock(async () => ({
			id: "company-1",
			name: "Northstar",
		}));
		const createCompanyContact = mock(async () => ({ id: "contact-1" }));
		const createLocation = mock(async () => ({ id: "location-1" }));

		await runAddClientFlow(
			{
				...baseData,
				companyNotes: "  Important account  ",
				contactName: "",
				contactTitle: "",
				locationAddress: "",
			},
			{
				createCompany: createCompany as never,
				createCompanyContact: createCompanyContact as never,
				createLocation: createLocation as never,
			},
		);

		expect(createCompany.mock.calls[0]?.[0]).toEqual({
			name: "Northstar",
			industry: "Metal Fabrication",
			sector: "manufacturing_industrial",
			subsector: "metal_fabrication",
			customerType: "generator",
			accountStatus: "prospect",
			notes: "Important account",
		});
		expect(createCompanyContact.mock.calls[0]?.[1]).toEqual({
			email: "avery@example.com",
			phone: "+1 555 000 1234",
			isPrimary: true,
		});
		expect(createLocation.mock.calls[0]?.[1]).toEqual({
			companyId: "company-1",
			name: "Primary Facility",
			city: "Austin",
			state: "TX",
			zipCode: "78701",
			addressType: "headquarters",
		});
	});
});
