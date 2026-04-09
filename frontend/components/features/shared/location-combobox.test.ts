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

	it("uses placeholder when AI suggestion is unresolved", () => {
		expect(
			locationComboboxModule.resolveLocationTriggerLabel({
				selectedLocationLabel: null,
				suggestedValue: "Baton Rouge - Baton Rouge",
				isSuggestedAccepted: false,
				canCreateFromSuggestion: true,
				placeholder: "Select location",
			}),
		).toBe("Select location");
	});

	it("shows clean suggested value when AI location suggestion was accepted", () => {
		expect(
			locationComboboxModule.resolveLocationTriggerLabel({
				selectedLocationLabel: null,
				suggestedValue: "Baton Rouge - Baton Rouge",
				isSuggestedAccepted: true,
				canCreateFromSuggestion: true,
				placeholder: "Select location",
			}),
		).toBe("Baton Rouge - Baton Rouge");
	});

	it("uses placeholder when AI location suggestion is incomplete", () => {
		expect(
			locationComboboxModule.resolveLocationTriggerLabel({
				selectedLocationLabel: null,
				suggestedValue: "Baton Rouge - Baton Rouge",
				isSuggestedAccepted: false,
				canCreateFromSuggestion: false,
				placeholder: "Select location",
			}),
		).toBe("Select location");
	});

	it("returns AI suggestion row metadata for complete and incomplete suggestions", () => {
		expect(
			locationComboboxModule.resolveLocationAiSuggestionState({
				suggestedValue: "Baton Rouge - Baton Rouge",
				canCreateFromSuggestion: true,
			}),
		).toEqual({
			hasSuggestion: true,
			normalizedSuggestedValue: "Baton Rouge - Baton Rouge",
			secondaryText: "Auto-create on confirm",
			disabled: false,
		});

		expect(
			locationComboboxModule.resolveLocationAiSuggestionState({
				suggestedValue: "Baton Rouge - Baton Rouge",
				canCreateFromSuggestion: false,
			}),
		).toEqual({
			hasSuggestion: true,
			normalizedSuggestedValue: "Baton Rouge - Baton Rouge",
			secondaryText: "Needs city/state",
			disabled: true,
		});
	});

	it("keeps AI suggestion entry available even after selecting an existing location", () => {
		expect(
			locationComboboxModule.hasLocationAiSuggestion(
				"Baton Rouge - Baton Rouge",
			),
		).toBe(true);

		expect(locationComboboxModule.hasLocationAiSuggestion("   ")).toBe(false);
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
