import { StatusChip } from "@/components/patterns";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { OfferStageFeaturedItem } from "./field-agent-dashboard.types";

type OfferStageSummaryCardTone = "info" | "warning" | "success" | "error";
type OfferStageSummaryCardDensity = "compact" | "featured";

export function OfferStageSummaryCard({
	title,
	count,
	helperText,
	tone,
	featuredItems,
	density = "compact",
	urgencyLabel,
}: {
	title: string;
	count: number;
	helperText: string;
	tone: OfferStageSummaryCardTone;
	featuredItems?: OfferStageFeaturedItem[];
	density?: OfferStageSummaryCardDensity;
	urgencyLabel?: string;
}) {
	const chipStatus =
		tone === "error"
			? "error"
			: tone === "warning"
				? "warning"
				: tone === "success"
					? "success"
					: "info";

	return (
		<Card
			className={cn(
				"border-border/60 bg-surface-container-lowest shadow-xs",
				density === "featured" && "bg-surface-container-low",
			)}
		>
			<CardContent className={cn("space-y-2 p-4", density === "featured" && "space-y-3")}>
				<div className="flex items-center justify-between gap-2">
					<p className="text-sm font-medium text-foreground">{title}</p>
					<StatusChip status={chipStatus} variant="subtle" size="xs">
						{count}
					</StatusChip>
				</div>
				{urgencyLabel ? (
					<p className="text-[0.65rem] uppercase tracking-wider text-secondary">
						{urgencyLabel}
					</p>
				) : null}
				<p className="text-xs text-muted-foreground">{helperText}</p>
				{featuredItems && featuredItems.length > 0 ? (
					<ul className="space-y-2 border-t border-border/50 pt-2">
						{featuredItems.map((item) => (
							<li
								key={item.id}
								className="space-y-1 rounded-lg border border-border/40 bg-surface-container-lowest px-2.5 py-2"
							>
								<p className="text-xs font-medium text-foreground">
									{item.primaryText}
								</p>
								<p className="text-[11px] text-muted-foreground">
									{item.secondaryText}
								</p>
							</li>
						))}
					</ul>
				) : null}
			</CardContent>
		</Card>
	);
}
