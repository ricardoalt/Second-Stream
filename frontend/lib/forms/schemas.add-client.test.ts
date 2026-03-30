import { describe, expect, it } from "bun:test";
import { addClientSchema } from "@/lib/forms/schemas";

const validData = {
	name: "Northstar",
	sector: "manufacturing_industrial",
	subsector: "metal_fabrication",
	customerType: "generator",
	accountStatus: "active",
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

describe("addClientSchema taxonomy validation", () => {
	it("accepts valid sector/subsector pair from modal taxonomy", () => {
		const parsed = addClientSchema.safeParse(validData);
		expect(parsed.success).toBe(true);
	});

	it("rejects unknown sector values", () => {
		const parsed = addClientSchema.safeParse({
			...validData,
			sector: "unknown_sector",
		});

		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0]?.message).toBe(
				"Please select a valid sector",
			);
		}
	});

	it("rejects subsector outside selected sector taxonomy", () => {
		const parsed = addClientSchema.safeParse({
			...validData,
			sector: "manufacturing_industrial",
			subsector: "hospitals",
		});

		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0]?.path).toEqual(["subsector"]);
			expect(parsed.error.issues[0]?.message).toBe(
				"Please select a valid subsector for the selected sector.",
			);
		}
	});
});
