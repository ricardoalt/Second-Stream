const LOCATIONS_COMPACT_THRESHOLD = 4;

export function getLocationsSectionMeta(locationCount: number) {
	return {
		isCompact: locationCount > LOCATIONS_COMPACT_THRESHOLD,
		countLabel: `${locationCount} location${locationCount === 1 ? "" : "s"}`,
		emptyMessage: "No locations registered.",
	};
}
