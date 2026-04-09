import { describe, expect, it } from "bun:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const locationComboboxModule = await import("./location-combobox");

describe("location combobox labels", () => {
	it("shows existing location name when a real selection exists", () => {
		expect(
			locationComboboxModule.resolveLocationTriggerLabel({
				selectedLocationLabel: "Baton Rouge - Baton Rouge",
				suggestedValue: "Baton Rouge - Baton Rouge",
				placeholder: "Select location",
			}),
		).toBe("Baton Rouge - Baton Rouge");
	});

	it("shows unresolved AI suggestion copy without pretending selection", () => {
		expect(
			locationComboboxModule.resolveLocationTriggerLabel({
				selectedLocationLabel: null,
				suggestedValue: "Baton Rouge - Baton Rouge",
				isSuggestedAccepted: false,
				canCreateFromSuggestion: true,
				placeholder: "Select location",
			}),
		).toBe("AI suggested: Baton Rouge - Baton Rouge (not selected)");
	});

	it("shows create-new intent when AI location suggestion was accepted", () => {
		expect(
			locationComboboxModule.resolveLocationTriggerLabel({
				selectedLocationLabel: null,
				suggestedValue: "Baton Rouge - Baton Rouge",
				isSuggestedAccepted: true,
				canCreateFromSuggestion: true,
				placeholder: "Select location",
			}),
		).toBe('Create "Baton Rouge - Baton Rouge" from AI suggestion');
	});

	it("shows incomplete state when AI suggestion cannot be created yet", () => {
		expect(
			locationComboboxModule.resolveLocationTriggerLabel({
				selectedLocationLabel: null,
				suggestedValue: "Baton Rouge - Baton Rouge",
				isSuggestedAccepted: false,
				canCreateFromSuggestion: false,
				placeholder: "Select location",
			}),
		).toBe(
			"AI suggested: Baton Rouge - Baton Rouge (add city/state to create)",
		);
	});

	it("falls back to placeholder when no selection or suggestion exists", () => {
		expect(
			locationComboboxModule.resolveLocationTriggerLabel({
				selectedLocationLabel: null,
				suggestedValue: null,
				isSuggestedAccepted: false,
				canCreateFromSuggestion: false,
				placeholder: "Select location",
			}),
		).toBe("Select location");
	});
});
