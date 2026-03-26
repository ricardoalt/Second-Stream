import {
	AlertTriangle,
	ArrowUpRight,
	BookOpen,
	Clock3,
	FileWarning,
	Lightbulb,
	TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FollowUpPriority, StreamRow } from "./types";

const priorityLabel: Record<FollowUpPriority, string> = {
	urgent: "Urgent",
	high: "High",
	medium: "Medium",
	low: "Low",
};

const priorityClass: Record<FollowUpPriority, string> = {
	urgent: "bg-destructive/15 text-destructive",
	high: "bg-warning/20 text-warning-foreground",
	medium: "bg-info/20 text-info-foreground",
	low: "bg-muted text-muted-foreground",
};

const stalenessClass: Record<FollowUpPriority, string> = {
	urgent: "border-l-destructive",
	high: "border-l-warning",
	medium: "border-l-info",
	low: "border-l-muted-foreground",
};

export function StreamsFollowUpBoard({
	items,
	onMarkAddressed,
}: {
	items: StreamRow[];
	onMarkAddressed?: (id: string) => void;
}) {
	const urgentItems = items.filter((i) => i.priority === "urgent");
	const staleCount = items.filter(
		(i) => (i.daysSinceLastActivity ?? 0) > 14,
	).length;

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			{/* ── Left: Queue ── */}
			<div className="flex flex-col gap-2">
				{items.map((item) => {
					const priority = item.priority ?? "medium";
					const missingFields = item.missingFields ?? [];
					const days = item.daysSinceLastActivity ?? 0;

					return (
						<div
							key={item.id}
							className={cn(
								"flex items-center justify-between gap-4 rounded-lg border-l-[3px] bg-surface-container-lowest px-4 py-3 shadow-xs transition-colors hover:bg-surface-container-high/40",
								stalenessClass[priority],
							)}
						>
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<div className="flex items-center gap-2">
									<span className="font-medium text-foreground">
										{item.name}
									</span>
									<Badge
										variant="secondary"
										className={cn(
											"rounded-full border-0 text-[0.6rem]",
											priorityClass[priority],
										)}
									>
										{priorityLabel[priority]}
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground">
									{item.client} · Phase {item.phase}
								</p>
								{missingFields.length > 0 && (
									<div className="mt-1 flex flex-wrap gap-1">
										{missingFields.map((field) => (
											<span
												key={field}
												className="rounded bg-surface-container px-1.5 py-0.5 text-[0.6rem] text-muted-foreground"
											>
												{field}
											</span>
										))}
									</div>
								)}
							</div>

							<div className="flex shrink-0 items-center gap-3">
								<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
									<Clock3 aria-hidden className="size-3" />
									{days}d
								</span>
								<Button asChild variant="secondary" size="sm">
									<Link href={`/streams/${item.id}`}>
										Open
										<ArrowUpRight
											data-icon="inline-end"
											aria-hidden
											className="size-3"
										/>
									</Link>
								</Button>
							</div>
						</div>
					);
				})}

				{items.length === 0 && (
					<div className="rounded-lg bg-surface-container-lowest p-8 text-center text-sm text-muted-foreground">
						No items requiring follow-up.
					</div>
				)}
			</div>

			{/* ── Right: Info Rail ── */}
			<aside className="flex flex-col gap-4">
				{/* Urgent Follow-ups Module */}
				<div className="rounded-xl bg-surface-container-lowest p-4 shadow-xs">
					<div className="mb-3 flex items-center gap-2">
						<AlertTriangle aria-hidden className="size-4 text-destructive" />
						<h3 className="text-sm font-semibold text-foreground">
							Urgent Follow-ups
						</h3>
					</div>
					{urgentItems.length > 0 ? (
						<ul className="flex flex-col gap-2">
							{urgentItems.slice(0, 3).map((item) => (
								<li key={item.id} className="flex items-start gap-2">
									<span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
									<div className="flex flex-col">
										<Link
											href={`/streams/${item.id}`}
											className="text-sm font-medium text-foreground hover:text-primary"
										>
											{item.name}
										</Link>
										<span className="text-xs text-muted-foreground">
											{item.reason ?? "Requires immediate attention"}
										</span>
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">
							No urgent follow-ups
						</p>
					)}
				</div>

				{/* Documentation Staleness Module */}
				<div className="rounded-xl bg-surface-container-lowest p-4 shadow-xs">
					<div className="mb-3 flex items-center gap-2">
						<FileWarning aria-hidden className="size-4 text-warning" />
						<h3 className="text-sm font-semibold text-foreground">
							Documentation Staleness
						</h3>
					</div>
					<div className="flex items-baseline gap-2">
						<span className="font-display text-2xl font-bold text-foreground">
							{staleCount}
						</span>
						<span className="text-xs text-muted-foreground">
							streams with docs &gt;14 days old
						</span>
					</div>
					<div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
						<TrendingDown aria-hidden className="size-3" />
						Update SDS and compliance docs to maintain readiness.
					</div>
				</div>

				{/* Efficiency Tip Module */}
				<div className="rounded-xl bg-primary/5 p-4">
					<div className="mb-2 flex items-center gap-2">
						<Lightbulb aria-hidden className="size-4 text-primary" />
						<h3 className="text-sm font-semibold text-foreground">
							Efficiency Tip
						</h3>
					</div>
					<p className="text-xs leading-relaxed text-muted-foreground">
						Streams with complete documentation move through phases{" "}
						<strong className="text-foreground">40% faster</strong>. Focus on
						filling missing SDS and compliance fields first.
					</p>
					<Link
						href="/streams"
						className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
					>
						<BookOpen aria-hidden className="size-3" />
						View documentation guide
					</Link>
				</div>
			</aside>
		</div>
	);
}
