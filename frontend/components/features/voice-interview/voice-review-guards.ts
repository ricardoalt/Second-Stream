export function shouldDisableFinalizeAction(params: {
	groupsCount: number;
	selectedResolvedCount: number;
	finalizing: boolean;
}): boolean {
	const { groupsCount, selectedResolvedCount, finalizing } = params;
	if (finalizing) {
		return true;
	}
	if (groupsCount === 0) {
		return false;
	}
	return selectedResolvedCount === 0;
}
