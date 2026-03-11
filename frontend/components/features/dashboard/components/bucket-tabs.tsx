"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
	useDashboardActions,
	useDashboardBucket,
	useDashboardCounts,
} from "@/lib/stores/dashboard-store";
import type { DashboardBucket } from "@/lib/types/dashboard";
import { BUCKET_TABS } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOP-BORDER ACCENT PER BUCKET (semantic tokens)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BUCKET_ACCENT: Record<DashboardBucket, string> = {
	total: "border-t-primary/60",
	needs_confirmation: "border-t-warning",
	missing_information: "border-t-destructive/70",
	intelligence_report: "border-t-success",
	proposal: "border-t-info",
};

const STATUS_BADGE_STYLE: Record<DashboardBucket, string> = {
	total: "bg-primary/15 text-primary",
	needs_confirmation: "bg-warning/15 text-warning-foreground dark:text-warning",
	missing_information: "bg-destructive/15 text-destructive",
	intelligence_report:
		"bg-success/15 text-success-foreground dark:text-success",
	proposal: "bg-info/15 text-info-foreground dark:text-info",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STAT CARD GRID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const BucketTabs = memo(function BucketTabs() {
	const activeBucket = useDashboardBucket();
	const counts = useDashboardCounts();
	const { switchBucket } = useDashboardActions();

	return (
		<div
			className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4"
			role="tablist"
			aria-label="Dashboard buckets"
		>
			{BUCKET_TABS.map((tab) => {
				const isActive = activeBucket === tab.id;
				const count = counts[tab.countKey];

				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						aria-controls={`bucket-panel-${tab.id}`}
						id={`bucket-tab-${tab.id}`}
						onClick={() => switchBucket(tab.id)}
						className={cn(
							"relative flex flex-col gap-1.5 rounded-lg border border-t-2 px-4 py-3.5 text-left",
							"transition-all duration-200",
							"hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							BUCKET_ACCENT[tab.id],
							isActive
								? "bg-accent/40 border-border/60 shadow-sm ring-1 ring-primary/20"
								: "bg-card/40 border-border/30",
						)}
					>
						{/* Label */}
						<span
							className={cn(
								"text-[11px] font-semibold uppercase tracking-wider leading-none",
								isActive ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{tab.label}
						</span>

						{/* Count + status badge */}
						<div className="flex items-baseline gap-2">
							<span
								className={cn(
									"text-2xl font-semibold tabular-nums leading-none",
									isActive ? "text-foreground" : "text-foreground/80",
								)}
							>
								{count}
							</span>
							{count > 0 && (
								<Badge
									variant="secondary"
									className={cn(
										"text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0 h-4 leading-none border-0",
										STATUS_BADGE_STYLE[tab.id],
									)}
								>
									{tab.statusLabel}
								</Badge>
							)}
						</div>

						{/* Description */}
						<span className="text-[11px] leading-snug text-muted-foreground/70 line-clamp-2">
							{tab.description}
						</span>
					</button>
				);
			})}
		</div>
	);
});
