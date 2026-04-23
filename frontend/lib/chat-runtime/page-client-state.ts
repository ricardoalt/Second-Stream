type RouteSyncOptions = {
	routeThreadId: string | null;
	runtimeThreadId: string;
	createdThreadId: string;
};

type LocationLike = {
	hash: string;
	pathname: string;
	search: string;
};

type HistoryLike = {
	state: unknown;
	replaceState: (
		data: unknown,
		unused: string,
		url?: string | URL | null,
	) => void;
};

type WindowLike = {
	history: HistoryLike;
	location: LocationLike;
};

function buildChatThreadUrl(threadId: string): string {
	return `/chat/${encodeURIComponent(threadId.trim())}`;
}

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

export function syncChatThreadUrlSilently(
	threadId: string,
	browserWindow: WindowLike | undefined = typeof window === "undefined"
		? undefined
		: window,
): boolean {
	if (!browserWindow) {
		return false;
	}

	const nextPath = buildChatThreadUrl(threadId);
	const nextUrl = `${nextPath}${browserWindow.location.search}${browserWindow.location.hash}`;
	const currentUrl = `${browserWindow.location.pathname}${browserWindow.location.search}${browserWindow.location.hash}`;

	if (currentUrl === nextUrl) {
		return false;
	}

	browserWindow.history.replaceState(browserWindow.history.state, "", nextUrl);
	return true;
}
