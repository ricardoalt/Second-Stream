import { describe, expect, it } from "bun:test";
import {
	buildLocationResolutionPayload,
	getLocationResolutionErrorMessage,
	isLocationFieldResolved,
	resolveNonCreateLocationState,
} from "@/lib/location-resolution";
import type { DraftConfirmationLocationState } from "@/lib/types/dashboard";

describe("location resolution state", () => {
	const lockedBase: DraftConfirmationLocationState = {
		mode: "locked",
		name: "Plant A",
		city: "Monterrey",
		state: "NL",
		address: "Av 1",
	};

	it("treats reject as unresolved", () => {
		expect(isLocationFieldResolved("reject", lockedBase)).toBe(false);
	});

	it("requires city/state for locked mode", () => {
		const unresolved: DraftConfirmationLocationState = {
			...lockedBase,
			city: "",
		};
		expect(isLocationFieldResolved("confirm", unresolved)).toBe(false);
		expect(getLocationResolutionErrorMessage("confirm", unresolved)).toBe(
			"Location city is required",
		);
	});

	it("resolves existing mode only with stable id", () => {
		const unresolvedExisting: DraftConfirmationLocationState = {
			mode: "existing",
			locationId: "",
			name: "Existing",
			city: "Monterrey",
			state: "NL",
			address: "",
		};
		expect(isLocationFieldResolved("confirm", unresolvedExisting)).toBe(false);

		const resolvedExisting: DraftConfirmationLocationState = {
			...unresolvedExisting,
			locationId: "loc-123",
		};
		expect(isLocationFieldResolved("confirm", resolvedExisting)).toBe(true);
		expect(buildLocationResolutionPayload("confirm", resolvedExisting)).toEqual(
			{
				mode: "existing",
				locationId: "loc-123",
			},
		);
	});

	it("builds create-new payload only when required fields exist", () => {
		const createNewState: DraftConfirmationLocationState = {
			mode: "create_new",
			name: "New Plant",
			city: "Queretaro",
			state: "QRO",
			address: "  ",
		};

		expect(buildLocationResolutionPayload("confirm", createNewState)).toEqual({
			mode: "create_new",
			name: "New Plant",
			city: "Queretaro",
			state: "QRO",
			address: undefined,
		});
	});

	it("restores previous existing selection when leaving create_new", () => {
		const existingState: DraftConfirmationLocationState = {
			mode: "existing",
			locationId: "loc-1",
			name: "Existing Plant",
			city: "Monterrey",
			state: "NL",
			address: "Av 1",
		};
		const createNewState: DraftConfirmationLocationState = {
			mode: "create_new",
			name: "New Plant",
			city: "Queretaro",
			state: "QRO",
			address: "Av 2",
		};

		expect(
			resolveNonCreateLocationState(existingState, createNewState),
		).toEqual(existingState);
	});

	it("falls back to safe non-create mode on reopened create_new", () => {
		const reopenedCreateNew: DraftConfirmationLocationState = {
			mode: "create_new",
			name: "Reopened Plant",
			city: "Leon",
			state: "GTO",
			address: "",
		};

		const resolved = resolveNonCreateLocationState(null, reopenedCreateNew);
		expect(resolved.mode).toBe("locked");
		expect(resolved.name).toBe("Reopened Plant");
		expect(isLocationFieldResolved("confirm", resolved)).toBe(true);
	});
});
