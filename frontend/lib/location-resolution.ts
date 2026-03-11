import type { BulkImportLocationResolution } from "@/lib/api/bulk-import";
import type { DraftConfirmationLocationState } from "@/lib/types/dashboard";

export function isLocationFieldResolved(
	decision: "confirm" | "reject",
	locationState: DraftConfirmationLocationState,
): boolean {
	if (decision === "reject") {
		return false;
	}
	if (locationState.mode === "existing") {
		return locationState.locationId.trim().length > 0;
	}
	return (
		locationState.name.trim().length > 0 &&
		locationState.city.trim().length > 0 &&
		locationState.state.trim().length > 0
	);
}

export function getLocationResolutionErrorMessage(
	decision: "confirm" | "reject",
	locationState: DraftConfirmationLocationState,
): string {
	if (decision === "reject") {
		return "Location is required";
	}

	if (locationState.mode === "existing") {
		return "Select an existing location";
	}

	if (!locationState.name.trim()) {
		return "Location name is required";
	}
	if (!locationState.city.trim()) {
		return "Location city is required";
	}
	if (!locationState.state.trim()) {
		return "Location state is required";
	}

	return "Location is required";
}

export function buildLocationResolutionPayload(
	decision: "confirm" | "reject",
	locationState: DraftConfirmationLocationState,
): BulkImportLocationResolution | null {
	if (!isLocationFieldResolved(decision, locationState)) {
		return null;
	}

	if (locationState.mode === "existing") {
		return {
			mode: "existing",
			locationId: locationState.locationId,
		};
	}

	if (locationState.mode === "create_new") {
		const trimmedAddress = locationState.address.trim();
		return {
			mode: "create_new",
			name: locationState.name.trim(),
			city: locationState.city.trim(),
			state: locationState.state.trim(),
			...(trimmedAddress ? { address: trimmedAddress } : {}),
		};
	}

	return {
		mode: "locked",
		name: locationState.name.trim(),
	};
}

export function formatLocationStateLabel(
	locationState: DraftConfirmationLocationState,
): string {
	if (locationState.mode === "existing") {
		return `${locationState.name} - ${locationState.city}, ${locationState.state}`;
	}

	if (locationState.name.trim().length > 0) {
		if (
			locationState.city.trim().length > 0 &&
			locationState.state.trim().length > 0
		) {
			return `${locationState.name} - ${locationState.city}, ${locationState.state}`;
		}
		return locationState.name;
	}

	return "Select existing location";
}

export function resolveNonCreateLocationState(
	preferredState: DraftConfirmationLocationState | null,
	fallbackState: DraftConfirmationLocationState,
): DraftConfirmationLocationState {
	if (preferredState && preferredState.mode !== "create_new") {
		return preferredState;
	}

	if (fallbackState.mode !== "create_new") {
		return fallbackState;
	}

	return {
		mode: "locked",
		name: fallbackState.name,
		city: fallbackState.city,
		state: fallbackState.state,
		address: fallbackState.address,
	};
}
