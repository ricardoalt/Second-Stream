import { SELECTED_ORG_STORAGE_KEY } from "@/lib/constants/storage";

type CacheEntry<T> = {
	data?: T;
	expiresAt: number;
	updatedAt: number;
	inFlight: Promise<T> | null;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();

function buildScopeKey(): string {
	if (typeof window === "undefined") {
		return "ssr";
	}

	const orgId = localStorage.getItem(SELECTED_ORG_STORAGE_KEY) ?? "no-org";
	const token = localStorage.getItem("access_token");
	const tokenFingerprint = token ? token.slice(-12) : "anon";

	return `${orgId}:${tokenFingerprint}`;
}

export function buildClientDataCacheKey(key: string): string {
	return `${buildScopeKey()}::${key}`;
}

function isEntryStale(entry: CacheEntry<unknown>): boolean {
	return Date.now() >= entry.expiresAt;
}

export function peekClientDataCache<T>(
	key: string,
): { data: T; isStale: boolean; updatedAt: number } | null {
	const scopedKey = buildClientDataCacheKey(key);
	const entry = cacheStore.get(scopedKey) as CacheEntry<T> | undefined;

	if (!entry) {
		return null;
	}

	if (entry.data === undefined) {
		return null;
	}

	return {
		data: entry.data,
		isStale: isEntryStale(entry),
		updatedAt: entry.updatedAt,
	};
}

export function isClientDataCacheStale(key: string): boolean {
	const scopedKey = buildClientDataCacheKey(key);
	const entry = cacheStore.get(scopedKey);
	if (!entry) {
		return true;
	}

	return isEntryStale(entry);
}

export async function fetchWithClientDataCache<T>(args: {
	key: string;
	ttlMs: number;
	fetcher: () => Promise<T>;
	forceRefresh?: boolean;
}): Promise<T> {
	const scopedKey = buildClientDataCacheKey(args.key);
	const now = Date.now();
	const existing = cacheStore.get(scopedKey) as CacheEntry<T> | undefined;

	if (!args.forceRefresh && existing && now < existing.expiresAt) {
		if (existing.data === undefined) {
			if (existing.inFlight) {
				return existing.inFlight;
			}
		} else {
			return existing.data;
		}
	}

	if (existing?.inFlight) {
		return existing.inFlight;
	}

	const request = args
		.fetcher()
		.then((data) => {
			cacheStore.set(scopedKey, {
				data,
				expiresAt: Date.now() + args.ttlMs,
				updatedAt: Date.now(),
				inFlight: null,
			});
			return data;
		})
		.catch((error) => {
			const current = cacheStore.get(scopedKey) as CacheEntry<T> | undefined;
			if (current) {
				cacheStore.set(scopedKey, {
					...current,
					inFlight: null,
				});
			}
			throw error;
		});

	cacheStore.set(scopedKey, {
		data: existing?.data,
		expiresAt: existing?.expiresAt ?? 0,
		updatedAt: existing?.updatedAt ?? 0,
		inFlight: request,
	});

	return request;
}

export function revalidateClientDataCache<T>(args: {
	key: string;
	ttlMs: number;
	fetcher: () => Promise<T>;
}): Promise<T> {
	return fetchWithClientDataCache({
		...args,
		forceRefresh: true,
	});
}
