"use client";

import {
	AlertTriangle,
	ArrowRight,
	Building,
	FileQuestion,
	MapPin,
	Sparkles,
} from "lucide-react";
import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	useDashboardActions,
	useDashboardDraftPreview,
} from "@/lib/stores/dashboard-store";
import type { DraftItemRow } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

/**
 * Right-rail preview of drafts for the Total Waste Streams bucket.
 * Shows a capped slice from draftPreview, not the full queue.
 */
export const DraftPreviewRail = memo(function DraftPreviewRail() {
	const draftPreview = useDashboardDraftPreview();
	const { openFullDraftQueue, openDraftConfirmation } = useDashboardActions();

	if (!draftPreview || draftPreview.items.length === 0) return null;

	const remaining = draftPreview.total - draftPreview.items.length;

	return (
		<Card className="border-dashed border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm font-display font-medium">
					<FileQuestion className="h-4 w-4 text-amber-500" />
					AI Extracted, Awaiting Confirmation
					<Badge
						variant="secondary"
						className="ml-auto bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs"
					>
						{draftPreview.total}
					</Badge>
				</CardTitle>
				<p className="text-xs text-muted-foreground">
					Detected streams and locations waiting for human review before
					entering the active pipeline.
				</p>
			</CardHeader>
			<CardContent className="space-y-2 pt-0">
				{draftPreview.items.map((item) => (
					<DraftPreviewCard
						key={item.itemId}
						item={item}
						onOpenDraft={openDraftConfirmation}
						onOpenQueue={openFullDraftQueue}
					/>
				))}
				{remaining > 0 && (
					<p className="text-xs text-muted-foreground text-center pt-1">
						+{remaining} more in Needs Confirmation
					</p>
				)}
				<Button
					variant="ghost"
					size="sm"
					className="w-full text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:text-amber-300"
					onClick={openFullDraftQueue}
				>
					Review all drafts
					<ArrowRight className="ml-1 h-3 w-3" />
				</Button>
			</CardContent>
		</Card>
	);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DraftPreviewCard({
	item,
	onOpenDraft,
	onOpenQueue,
}: {
	item: DraftItemRow;
	onOpenDraft: (draft: DraftItemRow) => void;
	onOpenQueue: () => void;
}) {
	const handleClick = useCallback(() => {
		if (item.confirmable) {
			onOpenDraft(item);
			return;
		}
		onOpenQueue();
	}, [item, onOpenDraft, onOpenQueue]);

	const className = cn(
		"group w-full text-left rounded-md border border-border/40 bg-card/80 p-3",
		"transition-colors duration-150",
		"hover:bg-accent/40 hover:border-border/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
	);

	const content = (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
						<Sparkles className="h-3 w-3" />
						AI extracted
					</div>
					<span className="text-sm font-medium truncate block">
						{item.streamName}
					</span>
				</div>
				<ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
			</div>
			<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
				<Badge variant="outline" className="text-xs border-border/40">
					{item.sourceType === "bulk_import" ? "Import source" : "Voice source"}
				</Badge>
				<Badge variant="outline" className="text-xs border-border/40">
					{item.draftKind === "location_only"
						? "Location only"
						: "Stream draft"}
				</Badge>
				<span>
					{item.confirmable ? "Awaiting confirmation" : "Needs queue review"}
				</span>
			</div>
			<div className="space-y-1 text-xs text-muted-foreground">
				<div className="flex items-center gap-1.5">
					<Building className="h-3 w-3 shrink-0" />
					<span className="truncate">{item.companyLabel ?? "Pending"}</span>
				</div>
				<div className="flex items-center gap-1.5">
					<MapPin className="h-3 w-3 shrink-0" />
					<span className="truncate">{item.locationLabel ?? "Pending"}</span>
				</div>
				{item.volumeSummary && (
					<div className="text-foreground/80">Volume: {item.volumeSummary}</div>
				)}
			</div>
			{!item.companyLabel && (
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex items-start gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
							<AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
							Company pending confirmation.
						</div>
					</TooltipTrigger>
					<TooltipContent>
						You can edit company inside confirmation before saving.
					</TooltipContent>
				</Tooltip>
			)}
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">
					{item.sourceType === "bulk_import"
						? "Detected from import"
						: "Detected from voice review"}
				</span>
				<span className="font-medium text-amber-700 dark:text-amber-300">
					{item.confirmable ? "Review draft" : "Open queue"}
				</span>
			</div>
		</div>
	);

	return (
		<button type="button" onClick={handleClick} className={className}>
			{content}
		</button>
	);
}
