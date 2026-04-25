type RouteSyncOptions = {
	routeThreadId: string | null;
	runtimeThreadId: string;
	createdThreadId: string;
};

export function resolveChatRouteState(
	routeThreadId: string | null,
	localThreadId: string,
) {
	if (routeThreadId === null) {
		return {
			threadId: localThreadId,
			shouldLoadPersistedHistory: false,
		};
	}

	if (routeThreadId === localThreadId) {
		return {
			threadId: localThreadId,
			shouldLoadPersistedHistory: false,
		};
	}

	return {
		threadId: routeThreadId,
		shouldLoadPersistedHistory: true,
	};
}

export function shouldSyncRouteAfterThreadCreated(
	options: RouteSyncOptions,
): boolean {
	if (options.routeThreadId !== null) {
		return false;
	}

	return options.createdThreadId === options.runtimeThreadId;
}
