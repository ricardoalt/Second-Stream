"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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
	const phaseFilter = normalizeParam(searchParams.get("phase"), "all");
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
		phaseFilter,
		statusFilter,
		setSearch: (value: string) => updateParam("search", value),
		setClientFilter: (value: string) => updateParam("client", value),
		setPhaseFilter: (value: string) => updateParam("phase", value),
		setStatusFilter: (value: string) => updateParam("status", value),
	};
}
