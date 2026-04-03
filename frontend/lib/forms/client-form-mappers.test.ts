import { describe, expect, it } from "bun:test";
import {
	buildEditClientContactPayload,
	buildEditClientInitialValues,
	buildLocationFormDefaults,
} from "@/lib/forms/client-form-mappers";

describe("client-form-mappers", () => {
	it("builds edit-client initial values from profile data", () => {
		const values = buildEditClientInitialValues({
			name: "Northstar",
			industry: "Manufacturing",
			primaryContact: {
				name: "Avery",
				title: "Plant Manager",
				email: "avery@example.com",
				phone: "+1 555 000 1234",
			},
		});

		expect(values).toEqual({
			companyName: "Northstar",
			industry: "Manufacturing",
			contactName: "Avery",
			contactTitle: "Plant Manager",
			contactEmail: "avery@example.com",
			contactPhone: "+1 555 000 1234",
		});
	});

	it("omits blank contact fields from edit payload", () => {
		const payload = buildEditClientContactPayload({
			companyName: "Northstar",
			industry: "Manufacturing",
			contactName: "",
			contactTitle: "",
			contactEmail: "ops@example.com",
			contactPhone: "",
		});

		expect(payload).toEqual({ email: "ops@example.com" });
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
