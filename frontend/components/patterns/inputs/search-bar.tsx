"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * SearchBar - Standard search input with icon, debounce, and clear button
 *
 * Replaces 5+ inline `<Search icon> + <Input>` compositions across pages.
 *
 * @example
 * <SearchBar
 *   value={query}
 *   onChange={setQuery}
 *   placeholder="Search streams, clients, waste types"
 * />
 */

interface SearchBarProps {
	/** Current search value */
	value: string;
	/** Called when value changes (after debounce if set) */
	onChange: (value: string) => void;
	/** Placeholder text */
	placeholder?: string;
	/** Debounce delay in ms (0 = no debounce) */
	debounceMs?: number;
	/** Additional classes for the wrapper */
	className?: string;
	/** Additional classes for the input */
	inputClassName?: string;
}

export function SearchBar({
	value,
	onChange,
	placeholder = "Search…",
	debounceMs = 0,
	className,
	inputClassName,
}: SearchBarProps) {
	const [localValue, setLocalValue] = useState(value);
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

	// Sync external value changes
	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	const handleChange = useCallback(
		(newValue: string) => {
			setLocalValue(newValue);
			if (debounceMs > 0) {
				if (timeoutRef.current) clearTimeout(timeoutRef.current);
				timeoutRef.current = setTimeout(() => onChange(newValue), debounceMs);
			} else {
				onChange(newValue);
			}
		},
		[onChange, debounceMs],
	);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	return (
		<div className={cn("relative", className)}>
			<Search
				aria-hidden
				className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				value={localValue}
				onChange={(event) => handleChange(event.target.value)}
				placeholder={placeholder}
				className={cn("pl-9 pr-8", inputClassName)}
			/>
			{localValue.length > 0 && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="absolute right-1 top-1/2 -translate-y-1/2 size-6 p-0 text-muted-foreground hover:text-foreground"
					onClick={() => handleChange("")}
				>
					<X className="size-3.5" aria-hidden />
					<span className="sr-only">Clear search</span>
				</Button>
			)}
		</div>
	);
}
