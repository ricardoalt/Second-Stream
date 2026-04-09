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

	it("uses placeholder when AI suggestion is unresolved", () => {
		expect(
			companyComboboxModule.resolveCompanyTriggerLabel({
				selectedCompanyName: null,
				suggestedValue: "EXXON",
				isSuggestedAccepted: false,
				placeholder: "Select company",
			}),
		).toBe("Select company");
	});

	it("shows clean suggested value after accepting AI suggestion", () => {
		expect(
			companyComboboxModule.resolveCompanyTriggerLabel({
				selectedCompanyName: null,
				suggestedValue: "EXXON",
				isSuggestedAccepted: true,
				placeholder: "Select company",
			}),
		).toBe("EXXON");
	});

	it("exposes auto-create badge state only when AI suggestion is accepted", () => {
		expect(
			companyComboboxModule.resolveCompanyTriggerState({
				selectedCompanyName: null,
				suggestedValue: "EXXON",
				isSuggestedAccepted: true,
				placeholder: "Select company",
			}),
		).toEqual({
			label: "EXXON",
			showAutoCreateBadge: true,
		});

		expect(
			companyComboboxModule.resolveCompanyTriggerState({
				selectedCompanyName: "Existing Co",
				suggestedValue: "EXXON",
				isSuggestedAccepted: true,
				placeholder: "Select company",
			}),
		).toEqual({
			label: "Existing Co",
			showAutoCreateBadge: false,
		});
	});

	it("keeps AI suggestion entry available even after selecting an existing company", () => {
		expect(companyComboboxModule.hasCompanyAiSuggestion("EXXON")).toBe(true);

		expect(companyComboboxModule.hasCompanyAiSuggestion("   ")).toBe(false);
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
