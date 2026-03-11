"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useDashboardActions,
	useDashboardBucket,
	useDashboardInitialized,
	useDashboardItems,
	useDashboardLoading,
	useDashboardPagination,
} from "@/lib/stores/dashboard-store";
import type { DraftItemRow } from "@/lib/types/dashboard";
import { isDraftItem } from "@/lib/types/dashboard";
import { StreamRow } from "./stream-row";

/**
 * Table for draft rows — full queue of unconfirmed items.
 * Used by: needs_confirmation.
 */
export const DraftQueueTable = memo(function DraftQueueTable() {
	const bucket = useDashboardBucket();
	const items = useDashboardItems();
	const loading = useDashboardLoading();
	const initialized = useDashboardInitialized();
	const { listTotal, page, pages } = useDashboardPagination();
	const { setPage } = useDashboardActions();

	const draftItems = items.filter(isDraftItem) as DraftItemRow[];

	if (loading && !initialized) {
		return <QueueSkeleton />;
	}

	if (draftItems.length === 0 && !loading) {
		return (
			<EmptyState
				icon={AlertTriangle}
				title="No drafts to confirm"
				description="All caught up! No drafts awaiting review."
			/>
		);
	}

	return (
		<div className="space-y-2">
			{/* Column headers */}
			<div className="hidden md:flex items-center gap-4 px-4 py-1.5 text-xs font-medium text-muted-foreground">
				<span className="flex-1">Draft stream</span>
				<span className="hidden lg:block w-36">Client / Location</span>
				<span className="w-28 text-right">Volume</span>
				<span className="w-16" />
			</div>

			{/* Rows — staggered reveal */}
			<motion.div
				className="space-y-1.5"
				initial="hidden"
				animate="visible"
				variants={{
					hidden: {},
					visible: { transition: { staggerChildren: 0.04 } },
				}}
			>
				{draftItems.map((row) => (
					<motion.div
						key={row.itemId}
						variants={{
							hidden: { opacity: 0, y: 8 },
							visible: { opacity: 1, y: 0 },
						}}
					>
						<StreamRow row={row} bucket={bucket} />
					</motion.div>
				))}
			</motion.div>

			{/* Pagination */}
			{pages > 1 && (
				<div className="flex items-center justify-between pt-3 px-1">
					<p className="text-xs text-muted-foreground">
						Page {page} of {pages} · {listTotal} drafts
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={page <= 1 || loading}
							onClick={() => setPage(page - 1)}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={page >= pages || loading}
							onClick={() => setPage(page + 1)}
						>
							{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Next"}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
});

function QueueSkeleton() {
	return (
		<div className="space-y-2">
			{[1, 2, 3, 4].map((i) => (
				<div
					key={i}
					className="flex items-center gap-4 px-4 py-3 border border-dashed border-amber-500/20 rounded-lg"
				>
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-3 w-1/3" />
					</div>
					<Skeleton className="hidden md:block h-3 w-20" />
				</div>
			))}
		</div>
	);
}
