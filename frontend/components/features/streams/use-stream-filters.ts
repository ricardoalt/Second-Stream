"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

interface StreamFilterInput {
	search: string;
	clientFilter: string;
	statusFilter?: string;
}

interface SharedFilterOptions {
	includeStatus?: boolean;
}

export function applySharedStreamFilter<
	T extends {
		name: string;
		client: string;
		wasteType: string;
		status?: string;
	},
>(items: T[], filters: StreamFilterInput, options?: SharedFilterOptions): T[] {
	const includeStatus = options?.includeStatus ?? true;
	const normalizedSearch = filters.search.trim().toLowerCase();

	return items.filter((row) => {
		const matchSearch =
			normalizedSearch.length === 0 ||
			row.name.toLowerCase().includes(normalizedSearch) ||
			row.client.toLowerCase().includes(normalizedSearch) ||
			row.wasteType.toLowerCase().includes(normalizedSearch);

		const matchClient =
			filters.clientFilter === "all" || row.client === filters.clientFilter;
		const matchStatus =
			!includeStatus ||
			filters.statusFilter === undefined ||
			filters.statusFilter === "all" ||
			row.status === filters.statusFilter;

		return matchSearch && matchClient && matchStatus;
	});
}

function normalizeParam(value: string | null, fallback: string): string {
	if (!value || value.trim().length === 0) {
		return fallback;
	}

	return value;
}

export function useStreamFilters() {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();

	const search = normalizeParam(searchParams.get("search"), "");
	const clientFilter = normalizeParam(searchParams.get("client"), "all");
	const statusFilter = normalizeParam(searchParams.get("status"), "all");

	const updateParam = useCallback(
		(key: string, value: string) => {
			const nextParams = new URLSearchParams(searchParams.toString());

			if (value === "" || value === "all") {
				nextParams.delete(key);
			} else {
				nextParams.set(key, value);
			}

			const query = nextParams.toString();
			router.replace(query ? `${pathname}?${query}` : pathname);
		},
		[pathname, router, searchParams],
	);

	return {
		search,
		clientFilter,
		statusFilter,
		setSearch: (value: string) => updateParam("search", value),
		setClientFilter: (value: string) => updateParam("client", value),
		setStatusFilter: (value: string) => updateParam("status", value),
	};
}

export function useSharedStreamFilter<
	T extends {
		name: string;
		client: string;
		wasteType: string;
		status?: string;
	},
>(items: T[], filters: StreamFilterInput, options?: SharedFilterOptions): T[] {
	return useMemo(
		() => applySharedStreamFilter(items, filters, options),
		[items, filters, options],
	);
}
