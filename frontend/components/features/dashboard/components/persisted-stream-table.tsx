"use client";

import { FolderKanban, Loader2 } from "lucide-react";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSortField } from "@/lib/stores/dashboard-store";
import {
	useDashboardActions,
	useDashboardBucket,
	useDashboardInitialized,
	useDashboardItems,
	useDashboardLoading,
	useDashboardPagination,
	useDashboardSort,
} from "@/lib/stores/dashboard-store";
import type {
	DashboardBucket,
	PersistedStreamRow,
} from "@/lib/types/dashboard";
import { isPersistedStream } from "@/lib/types/dashboard";
import { StreamRow } from "./stream-row";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PER-BUCKET COLUMN CONFIGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ColumnConfig {
	label: string;
	className: string;
}

const COL_NAME: ColumnConfig = {
	label: "Waste Stream",
	className: "flex-1 min-w-0",
};
const COL_NAME_SIMPLE: ColumnConfig = {
	label: "Name",
	className: "flex-1 min-w-0",
};
const COL_CLIENT: ColumnConfig = {
	label: "Client / Location",
	className: "w-36 hidden lg:block",
};
const COL_VOLUME: ColumnConfig = {
	label: "Volume / Frequency",
	className: "w-28 text-right hidden md:block",
};
const COL_MISSING: ColumnConfig = {
	label: "Missing Information",
	className: "w-36 hidden md:block",
};
const COL_STATUS: ColumnConfig = {
	label: "Status",
	className: "w-32 text-center hidden md:block",
};
const COL_REPORT: ColumnConfig = {
	label: "Report",
	className: "w-32 text-center hidden md:block",
};

function getColumnsForBucket(bucket: DashboardBucket): ColumnConfig[] {
	switch (bucket) {
		case "total":
			return [COL_NAME, COL_CLIENT, COL_VOLUME, COL_MISSING, COL_STATUS];
		case "needs_confirmation":
			return [COL_NAME, COL_CLIENT, COL_VOLUME];
		case "missing_information":
			return [COL_NAME, COL_CLIENT, COL_VOLUME, COL_MISSING];
		case "intelligence_report":
			return [COL_NAME_SIMPLE, COL_CLIENT, COL_VOLUME, COL_REPORT, COL_STATUS];
		case "proposal":
			return [COL_NAME_SIMPLE, COL_CLIENT, COL_VOLUME, COL_MISSING, COL_STATUS];
		default:
			return [COL_NAME, COL_CLIENT, COL_VOLUME];
	}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLIENT-SIDE SORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function sortItems(
	items: PersistedStreamRow[],
	sort: DashboardSortField,
): PersistedStreamRow[] {
	const sorted = [...items];
	switch (sort) {
		case "name":
			sorted.sort((a, b) => a.streamName.localeCompare(b.streamName));
			break;
		case "activity":
			sorted.sort(
				(a, b) =>
					new Date(b.lastActivityAt).getTime() -
					new Date(a.lastActivityAt).getTime(),
			);
			break;
	}
	return sorted;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TABLE COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PersistedStreamTableProps {
	onCreateProject?: () => void;
}

/**
 * Table for persisted-stream rows.
 * Used by: total, missing_information, intelligence_report, proposal.
 */
export const PersistedStreamTable = memo(function PersistedStreamTable({
	onCreateProject,
}: PersistedStreamTableProps) {
	const bucket = useDashboardBucket();
	const items = useDashboardItems();
	const loading = useDashboardLoading();
	const initialized = useDashboardInitialized();
	const sort = useDashboardSort();
	const { listTotal, page, pages } = useDashboardPagination();
	const { setPage } = useDashboardActions();

	const persistedItems = items.filter(
		isPersistedStream,
	) as PersistedStreamRow[];

	const sortedItems = useMemo(
		() => sortItems(persistedItems, sort),
		[persistedItems, sort],
	);

	const columns = useMemo(() => getColumnsForBucket(bucket), [bucket]);
	const showStatus =
		bucket === "total" ||
		bucket === "proposal" ||
		bucket === "intelligence_report";
	const showMissingInfo =
		bucket === "total" ||
		bucket === "missing_information" ||
		bucket === "proposal";
	const showReport = bucket === "intelligence_report";

	if (loading && !initialized) {
		return <TableSkeleton />;
	}

	if (loading && persistedItems.length === 0) {
		return <TableSkeleton />;
	}

	if (persistedItems.length === 0 && !loading) {
		const description =
			EMPTY_DESCRIPTIONS[bucket] ?? "No items in this bucket.";
		const action =
			bucket === "total" && onCreateProject
				? { label: "Discovery Wizard", onClick: onCreateProject }
				: undefined;
		return (
			<EmptyState
				icon={FolderKanban}
				title="No waste streams"
				description={description}
				{...(action ? { action } : {})}
			/>
		);
	}

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between px-1 pb-1">
				<div className="space-y-0.5">
					<span className="block text-xs text-muted-foreground tabular-nums">
						{listTotal} {listTotal === 1 ? "stream" : "streams"}
					</span>
					{bucket === "intelligence_report" && (
						<span className="block text-[11px] text-muted-foreground">
							Review snapshots before opening full project detail.
						</span>
					)}
				</div>
				<span className="text-xs text-muted-foreground">Recent</span>
			</div>

			{/* Column headers */}
			<div className="hidden md:flex items-center gap-4 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30">
				{columns.map((col) => (
					<span key={col.label} className={col.className}>
						{col.label}
					</span>
				))}
				{/* Chevron spacer */}
				<span className="w-4" />
			</div>

			<div className="space-y-1.5">
				{sortedItems.map((row) => (
					<div key={row.projectId}>
						<StreamRow
							row={row}
							bucket={bucket}
							showReport={showReport}
							showStatus={showStatus}
							showMissingInfo={showMissingInfo}
						/>
					</div>
				))}
			</div>

			{/* Pagination */}
			{pages > 1 && (
				<div className="flex items-center justify-between pt-3 px-1">
					<p className="text-xs text-muted-foreground">
						Page {page} of {pages} · {listTotal} total
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

const EMPTY_DESCRIPTIONS: Record<string, string> = {
	total: "Create your first waste stream",
	needs_confirmation: "All caught up! No drafts awaiting review.",
	missing_information: "All streams have complete information.",
	intelligence_report: "No streams ready for insights yet.",
	proposal: "No streams in commercial follow-up.",
};

function TableSkeleton() {
	return (
		<div className="space-y-2">
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="flex items-center gap-4 px-4 py-3">
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-3 w-1/3" />
					</div>
					<Skeleton className="hidden lg:block h-3 w-32" />
					<Skeleton className="hidden md:block h-3 w-20" />
					<Skeleton className="hidden md:block h-3 w-32" />
					<Skeleton className="hidden md:block h-5 w-20" />
				</div>
			))}
		</div>
	);
}
