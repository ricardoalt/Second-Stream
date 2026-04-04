"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * FilterBar — Unified search + filter bar for list pages
 *
 * Replaces the copy-pasted search/filter pattern across every list page.
 * Supports a global search input and up to N select filters.
 *
 * @example
 * <FilterBar
 *   search={{ value: query, onChange: setQuery, placeholder: "Search streams..." }}
 *   filters={[
 *     {
 *       key: "status",
 *       placeholder: "All statuses",
 *       value: statusFilter,
 *       onChange: setStatusFilter,
 *       options: [
 *         { value: "all", label: "All statuses" },
 *         { value: "active", label: "Active" },
 *       ],
 *     },
 *   ]}
 *   onClear={clearFilters}
 *   activeFilterCount={2}
 * />
 */

export interface FilterOption {
	value: string;
	label: string;
}

export interface FilterConfig {
	key: string;
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	options: FilterOption[];
	/** Tailwind width class, e.g. "w-[160px]" */
	width?: string;
}

interface FilterBarProps {
	/** Search input configuration */
	search?: {
		value: string;
		onChange: (value: string) => void;
		placeholder?: string;
	};
	/** Select filter configurations */
	filters?: FilterConfig[];
	/** Called when "Clear filters" is clicked */
	onClear?: () => void;
	/** Number of active (non-default) filters — shows clear button when > 0 */
	activeFilterCount?: number;
	/** Additional class names for the container */
	className?: string;
}

export function FilterBar({
	search,
	filters = [],
	onClear,
	activeFilterCount = 0,
	className,
}: FilterBarProps) {
	const hasActiveFilters = activeFilterCount > 0;

	return (
		<div
			className={cn(
				"flex flex-col gap-3 sm:flex-row sm:items-center",
				className,
			)}
		>
			{/* Search */}
			{search && (
				<div className="relative flex-1">
					<Search
						aria-hidden
						className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="search"
						value={search.value}
						onChange={(e) => search.onChange(e.target.value)}
						placeholder={search.placeholder ?? "Search…"}
						aria-label={search.placeholder ?? "Search"}
						className="pl-9 pr-9"
					/>
					{search.value && (
						<button
							type="button"
							onClick={() => search.onChange("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
							aria-label="Clear search"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>
			)}

			{/* Select filters */}
			{filters.map((filter) => (
				<Select
					key={filter.key}
					value={filter.value}
					onValueChange={filter.onChange}
				>
					<SelectTrigger
						className={cn("bg-card", filter.width ?? "w-full sm:w-[160px]")}
						aria-label={filter.placeholder ?? "Filter"}
					>
						<SelectValue placeholder={filter.placeholder ?? "Filter"} />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{filter.options.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			))}

			{/* Clear filters */}
			{hasActiveFilters && onClear && (
				<Button
					variant="ghost"
					size="sm"
					onClick={onClear}
					className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
				>
					<SlidersHorizontal className="size-3.5" />
					Clear ({activeFilterCount})
				</Button>
			)}
		</div>
	);
}
