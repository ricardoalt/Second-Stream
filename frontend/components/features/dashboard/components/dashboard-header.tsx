"use client";

import { Search, X } from "lucide-react";
import React, { memo, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
	useDashboardActions,
	useDashboardBucket,
	useDashboardFilters,
	useDashboardSearchResetVersion,
} from "@/lib/stores/dashboard-store";
import { BUCKET_TABS } from "@/lib/types/dashboard";

export const DashboardHeader = memo(function DashboardHeader() {
	const { setSearch } = useDashboardActions();
	const bucket = useDashboardBucket();
	const filters = useDashboardFilters();
	const searchResetVersion = useDashboardSearchResetVersion();
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
	const [localSearch, setLocalSearch] = React.useState(filters.search ?? "");
	const activeBucketLabel =
		BUCKET_TABS.find((tab) => tab.id === bucket)?.label ?? "current bucket";

	useEffect(() => {
		setLocalSearch(filters.search ?? "");
	}, [filters.search]);

	useEffect(
		() => () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		},
		[],
	);

	useEffect(() => {
		void searchResetVersion;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		setLocalSearch("");
	}, [searchResetVersion]);

	const handleSearchChange = useCallback(
		(value: string) => {
			const normalizedValue = value.trim();
			const appliedSearch = filters.search ?? "";
			setLocalSearch(value);
			if (debounceRef.current) clearTimeout(debounceRef.current);

			if (normalizedValue.length === 0) {
				setLocalSearch("");
				if (appliedSearch.length > 0) {
					setSearch("");
				}
				return;
			}

			if (normalizedValue === appliedSearch) {
				return;
			}

			debounceRef.current = setTimeout(() => {
				setSearch(normalizedValue);
			}, 300);
		},
		[filters.search, setSearch],
	);

	const handleClearSearch = useCallback(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		setLocalSearch("");
		setSearch("");
	}, [setSearch]);

	return (
		<div className="space-y-2">
			<p className="text-xs text-muted-foreground">
				Filter within {activeBucketLabel.toLowerCase()}.
			</p>
			<div className="relative w-full max-w-md">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder={`Search waste streams in ${activeBucketLabel.toLowerCase()}...`}
					aria-label="Search waste streams"
					value={localSearch}
					onChange={(e) => handleSearchChange(e.target.value)}
					className="pl-9 pr-9 h-9"
					autoComplete="off"
				/>
				{localSearch && (
					<button
						type="button"
						onClick={handleClearSearch}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
						aria-label="Clear search"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
});
