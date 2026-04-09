import { describe, expect, it } from "bun:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const companyComboboxModule = await import("./company-combobox");

describe("company combobox labels", () => {
	it("shows existing company name when a real selection exists", () => {
		expect(
			companyComboboxModule.resolveCompanyTriggerLabel({
				selectedCompanyName: "EXXON",
				suggestedValue: "EXXON",
				placeholder: "Select company",
			}),
		).toBe("EXXON");
	});

	it("shows unresolved AI suggestion copy without pretending selection", () => {
		expect(
			companyComboboxModule.resolveCompanyTriggerLabel({
				selectedCompanyName: null,
				suggestedValue: "EXXON",
				isSuggestedAccepted: false,
				placeholder: "Select company",
			}),
		).toBe("AI suggested: EXXON (not selected)");
	});

	it("shows explicit create-new intent after accepting AI suggestion", () => {
		expect(
			companyComboboxModule.resolveCompanyTriggerLabel({
				selectedCompanyName: null,
				suggestedValue: "EXXON",
				isSuggestedAccepted: true,
				placeholder: "Select company",
			}),
		).toBe('Create "EXXON" from AI suggestion');
	});

	it("falls back to placeholder when no selection or suggestion exists", () => {
		expect(
			companyComboboxModule.resolveCompanyTriggerLabel({
				selectedCompanyName: null,
				suggestedValue: null,
				isSuggestedAccepted: false,
				placeholder: "Select company",
			}),
		).toBe("Select company");
	});
});
