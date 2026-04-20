function normalizeSuggestionToken(value: string | null | undefined): string {
	return (value ?? "").trim().toLocaleLowerCase();
}

function trySplitByDashWithKnownLocation(params: {
	rawValue: string;
	suggestedLocationCity: string | null;
	locationLabel: string | null;
}): { suggestedClientName: string; suggestedLocationName: string } | null {
	const { rawValue, suggestedLocationCity, locationLabel } = params;
	const separatorIndex = rawValue.lastIndexOf(" - ");
	if (separatorIndex <= 0) {
		return null;
	}

	const clientPart = rawValue.slice(0, separatorIndex).trim();
	const locationPart = rawValue.slice(separatorIndex + 3).trim();
	if (!clientPart || !locationPart) {
		return null;
	}

	const normalizedLocationPart = normalizeSuggestionToken(locationPart);
	const cityMatches =
		normalizeSuggestionToken(suggestedLocationCity) === normalizedLocationPart;
	const labelMatches =
		normalizeSuggestionToken(locationLabel) === normalizedLocationPart;

	if (!(cityMatches || labelMatches)) {
		return null;
	}

	return {
		suggestedClientName: clientPart,
		suggestedLocationName: locationPart,
	};
}

function tryResolveCombinedSuggestion(params: {
	rawSuggestedClientName: string;
	suggestedLocationCity: string | null;
	locationLabel: string | null;
}): { suggestedClientName: string; suggestedLocationName: string } | null {
	const { rawSuggestedClientName, suggestedLocationCity, locationLabel } =
		params;

	const slashSegments = rawSuggestedClientName
		.split("/")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);

	if (slashSegments.length < 2) {
		return null;
	}

	for (let index = slashSegments.length - 1; index >= 0; index -= 1) {
		const splitSegment = trySplitByDashWithKnownLocation({
			rawValue: slashSegments[index],
			suggestedLocationCity,
			locationLabel,
		});
		if (splitSegment) {
			return splitSegment;
		}
	}

	const directSplit = trySplitByDashWithKnownLocation({
		rawValue: rawSuggestedClientName,
		suggestedLocationCity,
		locationLabel,
	});
	if (directSplit) {
		return directSplit;
	}

	return null;
}

export function resolveSuggestedClientAndLocation(params: {
	rawSuggestedClientName: string | null;
	rawSuggestedLocationName: string | null;
	suggestedLocationCity: string | null;
	locationLabel: string | null;
	hasStructuredLocationSuggestion: boolean;
}): {
	suggestedClientName: string | null;
	suggestedLocationName: string | null;
} {
	const {
		rawSuggestedClientName,
		rawSuggestedLocationName,
		suggestedLocationCity,
		locationLabel,
		hasStructuredLocationSuggestion,
	} = params;

	const suggestedClientName = (rawSuggestedClientName ?? "").trim();
	const suggestedLocationName = (rawSuggestedLocationName ?? "").trim();

	if (!suggestedClientName) {
		return {
			suggestedClientName: null,
			suggestedLocationName: suggestedLocationName || null,
		};
	}

	if (suggestedLocationName) {
		return {
			suggestedClientName,
			suggestedLocationName,
		};
	}

	const resolvedCombinedSuggestion = tryResolveCombinedSuggestion({
		rawSuggestedClientName: suggestedClientName,
		suggestedLocationCity,
		locationLabel,
	});
	if (resolvedCombinedSuggestion) {
		return resolvedCombinedSuggestion;
	}

	return {
		suggestedClientName,
		suggestedLocationName: null,
	};
}
