import { describe, expect, it } from "bun:test";
import { editClientSchema } from "@/lib/forms/schemas";

const baseData = {
	companyName: "Northstar",
	sector: "manufacturing_industrial",
	subsector: "metal_fabrication",
	accountStatus: "active",
	companyNotes: "",
	contactName: "Avery",
	contactTitle: "Plant Manager",
	contactEmail: "avery@example.com",
	contactPhone: "+1 555 000 1234",
};

describe("editClientSchema validation", () => {
	it("accepts valid sector/subsector/account status values", () => {
		const parsed = editClientSchema.safeParse(baseData);
		expect(parsed.success).toBe(true);
	});

	it("rejects unknown sector values", () => {
		const parsed = editClientSchema.safeParse({
			...baseData,
			sector: "unknown_sector",
		});

		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0]?.message).toBe(
				"Please select a valid sector",
			);
		}
	});

	it("rejects subsector outside selected taxonomy", () => {
		const parsed = editClientSchema.safeParse({
			...baseData,
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

	it("accepts empty optional contact fields", () => {
		const parsed = editClientSchema.safeParse({
			...baseData,
			contactName: "",
			contactTitle: "",
			contactEmail: "",
			contactPhone: "",
		});

		expect(parsed.success).toBe(true);
	});
});
