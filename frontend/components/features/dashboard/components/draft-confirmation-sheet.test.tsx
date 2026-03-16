import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type {
	DraftConfirmationFieldKey,
	DraftConfirmationLocationState,
} from "@/lib/types/dashboard";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const sheetModule = await import("./draft-confirmation-sheet");

function buildLocationState(
	overrides?: Partial<DraftConfirmationLocationState>,
): DraftConfirmationLocationState {
	return {
		mode: "locked",
		name: "Plant A",
		city: "Monterrey",
		state: "NL",
		address: "Av 1",
		...overrides,
	};
}

function buildContract() {
	return {
		draftItemId: "draft-1",
		runId: "run-1",
		sourceType: "bulk_import" as const,
		groupId: "group-1",
		companyId: "company-1",
		locationId: null,
		initialLocationState: buildLocationState(),
		locationState: buildLocationState(),
		fields: {
			company: buildField("company"),
			location: { ...buildField("location"), editable: true },
			materialType: buildField("materialType"),
			materialName: buildField("materialName"),
			composition: buildField("composition"),
			volume: buildField("volume"),
			frequency: buildField("frequency"),
			primaryContact: buildField("primaryContact"),
		},
	};
}

function buildContext(params?: {
	parentItemId?: string | null;
	hasParentLocationItem?: boolean;
}) {
	const { parentItemId = null, hasParentLocationItem = parentItemId !== null } =
		params ?? {};

	return {
		run: {
			entrypointType: "company" as const,
		},
		projectItem: {
			parentItemId,
		},
		parentLocationItem: hasParentLocationItem
			? {
					id: "location-1",
				}
			: null,
	};
}

function buildField(fieldKey: DraftConfirmationFieldKey) {
	return {
		key: fieldKey,
		label: "Field Label",
		initialValue: "",
		value: "",
		source: "pending" as const,
		required: true,
		editable: true,
		placeholder: "Pending",
	};
}

describe("DraftConfirmationSheet helpers", () => {
	it("autofocus runs once per draft id", () => {
		expect(
			sheetModule.shouldAutoFocusDraft({
				loading: false,
				draftItemId: "draft-1",
				lastFocusedDraftId: null,
			}),
		).toBe(true);

		expect(
			sheetModule.shouldAutoFocusDraft({
				loading: false,
				draftItemId: "draft-1",
				lastFocusedDraftId: "draft-1",
			}),
		).toBe(false);
	});

	it("field rows do not render per-field confirm reject controls", () => {
		const html = renderToStaticMarkup(
			<sheetModule.ConfirmationFieldRow
				field={buildField("materialName")}
				isResolved={false}
				error={undefined}
				onValueChange={() => {}}
				submitting={false}
			/>,
		);

		expect(html).toContain("Field Label");
		expect(html).not.toContain("Confirm");
		expect(html).not.toContain("Reject");
	});

	it("orphan drafts require explicit location resolution", () => {
		expect(
			sheetModule.requiresExplicitLocationResolution({
				contract: buildContract(),
				context: buildContext(),
			}),
		).toBe(true);

		expect(
			sheetModule.getExplicitLocationResolutionForSubmit({
				contract: buildContract(),
				context: buildContext(),
				locationResolution: null,
			}),
		).toBeUndefined();
	});

	it("linked drafts can submit without explicit location resolution when untouched", () => {
		expect(
			sheetModule.requiresExplicitLocationResolution({
				contract: buildContract(),
				context: buildContext({ parentItemId: "location-1" }),
			}),
		).toBe(false);

		expect(
			sheetModule.getExplicitLocationResolutionForSubmit({
				contract: buildContract(),
				context: buildContext({ parentItemId: "location-1" }),
				locationResolution: null,
			}),
		).toBeUndefined();
	});

	it("stale parent id without loaded parent location behaves like orphan", () => {
		expect(
			sheetModule.requiresExplicitLocationResolution({
				contract: buildContract(),
				context: buildContext({
					parentItemId: "location-stale",
					hasParentLocationItem: false,
				}),
			}),
		).toBe(true);

		expect(
			sheetModule.getExplicitLocationResolutionForSubmit({
				contract: buildContract(),
				context: buildContext({
					parentItemId: "location-stale",
					hasParentLocationItem: false,
				}),
				locationResolution: null,
			}),
		).toBeUndefined();
	});
});
