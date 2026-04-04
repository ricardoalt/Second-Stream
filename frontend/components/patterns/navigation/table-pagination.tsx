"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * TablePagination — Standardized table pagination for SecondStream
 *
 * Replaces all ad-hoc pagination implementations across list pages.
 * Shows a "Showing X of Y" label and prev/next buttons.
 *
 * @example
 * <TablePagination
 *   total={allStreams.length}
 *   showing={filteredStreams.length}
 *   page={currentPage}
 *   pageCount={Math.ceil(total / pageSize)}
 *   onPrevious={() => setPage(p => p - 1)}
 *   onNext={() => setPage(p => p + 1)}
 *   itemLabel="streams"
 * />
 */

interface TablePaginationProps {
	/** Total items in dataset (before filters) */
	total: number;
	/** Items visible on current page / after filters */
	showing: number;
	/** Current 1-based page number */
	page: number;
	/** Total number of pages */
	pageCount: number;
	/** Callback for previous page */
	onPrevious: () => void;
	/** Callback for next page */
	onNext: () => void;
	/** Human-readable label for items, e.g. "streams", "users" */
	itemLabel?: string;
	/** Additional class names */
	className?: string;
}

export function TablePagination({
	total,
	showing,
	page,
	pageCount,
	onPrevious,
	onNext,
	itemLabel = "items",
	className,
}: TablePaginationProps) {
	const canPrevious = page > 1;
	const canNext = page < pageCount;

	return (
		<div
			className={cn(
				"flex items-center justify-between border-t border-border/50 px-4 py-3",
				className,
			)}
		>
			<p className="text-xs text-muted-foreground tabular-nums">
				Showing <span className="font-medium text-foreground">{showing}</span>
				{" of "}
				<span className="font-medium text-foreground">{total}</span> {itemLabel}
			</p>

			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={onPrevious}
					disabled={!canPrevious}
					aria-label="Previous page"
				>
					<ChevronLeft aria-hidden className="size-4" />
				</Button>
				<span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground tabular-nums">
					{page}
				</span>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={onNext}
					disabled={!canNext}
					aria-label="Next page"
				>
					<ChevronRight aria-hidden className="size-4" />
				</Button>
			</div>
		</div>
	);
}
