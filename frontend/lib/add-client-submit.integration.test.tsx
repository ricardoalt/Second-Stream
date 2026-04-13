import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientCreateBanner } from "@/components/features/clients/client-create-banner";
import { submitAddClientAndBuildHandoff } from "@/lib/add-client-submit";
import type { AddClientFormData } from "@/lib/forms/schemas";

const baseData: AddClientFormData = {
	name: "Northstar",
	sector: "manufacturing_industrial",
	subsector: "metal_fabrication",
	customerType: "generator",
	accountStatus: "lead",
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

function getCreateStateFromHandoffUrl(handoffUrl: string): string | null {
	return new URL(handoffUrl, "https://secondstream.local").searchParams.get(
		"create",
	);
}

describe("add client submit handoff integration", () => {
	it("submits successfully and renders success banner for handoff route", async () => {
		const createCompany = mock(async () => ({
			id: "company-1",
			name: "Northstar",
		}));
		const createCompanyContact = mock(async () => ({ id: "contact-1" }));
		const createLocation = mock(async () => ({ id: "location-1" }));

		const result = await submitAddClientAndBuildHandoff(baseData, {
			createCompany: createCompany as never,
			createCompanyContact: createCompanyContact as never,
			createLocation: createLocation as never,
		});

		expect(result.handoffUrl).toBe("/leads/company-1?create=success");

		const createState = getCreateStateFromHandoffUrl(result.handoffUrl);
		const markup = renderToStaticMarkup(
			<ClientCreateBanner createState={createState} />,
		);

		expect(
			markup.includes("Primary contact and first location are ready"),
		).toBe(true);
	});

	it("submits partial-contact handoff and renders follow-up banner", async () => {
		const createCompany = mock(async () => ({
			id: "company-1",
			name: "Northstar",
		}));
		const createCompanyContact = mock(async () => {
			throw new Error("contact failed");
		});
		const createLocation = mock(async () => ({ id: "location-1" }));

		const result = await submitAddClientAndBuildHandoff(baseData, {
			createCompany: createCompany as never,
			createCompanyContact: createCompanyContact as never,
			createLocation: createLocation as never,
		});

		expect(result.handoffUrl).toBe("/leads/company-1?create=partial-contact");
		expect(createLocation).not.toHaveBeenCalled();

		const createState = getCreateStateFromHandoffUrl(result.handoffUrl);
		const markup = renderToStaticMarkup(
			<ClientCreateBanner createState={createState} />,
		);

		expect(markup.includes("we couldn&#x27;t save the primary contact")).toBe(
			true,
		);
	});

	it("submits partial-location handoff and renders location follow-up banner", async () => {
		const createCompany = mock(async () => ({
			id: "company-1",
			name: "Northstar",
		}));
		const createCompanyContact = mock(async () => ({ id: "contact-1" }));
		const createLocation = mock(async () => {
			throw new Error("location failed");
		});

		const result = await submitAddClientAndBuildHandoff(baseData, {
			createCompany: createCompany as never,
			createCompanyContact: createCompanyContact as never,
			createLocation: createLocation as never,
		});

		expect(result.handoffUrl).toBe("/leads/company-1?create=partial-location");
		expect(createCompanyContact).toHaveBeenCalledTimes(1);
		expect(createLocation).toHaveBeenCalledTimes(1);

		const createState = getCreateStateFromHandoffUrl(result.handoffUrl);
		const markup = renderToStaticMarkup(
			<ClientCreateBanner createState={createState} />,
		);

		expect(markup.includes("we couldn&#x27;t save the first location")).toBe(
			true,
		);
	});
});
