import { ArrowUpRight, Check, Clock3 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
	compareFollowUpPriority,
	computeFollowUpPriority,
} from "@/lib/utils/compute-follow-up-priority";
import {
	formatStreamStatus,
	getFollowUpOpenHref,
	getSelectedFollowUpItem,
} from "./runtime-helpers";
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
	selectedId,
	onSelect,
}: {
	items: StreamRow[];
	selectedId: string | null;
	onSelect: (id: string) => void;
}) {
	const prioritizedItems = [...items]
		.map((item) => ({
			...item,
			priority: item.priority ?? computeFollowUpPriority(item),
		}))
		.sort((left, right) => {
			const leftPriority = left.priority ?? "medium";
			const rightPriority = right.priority ?? "medium";
			const priorityCompare = compareFollowUpPriority(
				leftPriority,
				rightPriority,
			);

			if (priorityCompare !== 0) {
				return priorityCompare;
			}

			return (
				(right.daysSinceLastActivity ?? 0) - (left.daysSinceLastActivity ?? 0)
			);
		});

	const selectedItem = getSelectedFollowUpItem(prioritizedItems, selectedId);
	const selectedPhaseLabel =
		selectedItem && typeof selectedItem.phase === "number"
			? `${selectedItem.client} · Phase ${selectedItem.phase}`
			: (selectedItem?.client ?? null);

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			{/* ── Left: Queue ── */}
			<div className="flex flex-col gap-2">
				{prioritizedItems.map((item) => {
					const priority = item.priority ?? "medium";
					const missingFields = item.missingFields ?? [];
					const days = item.daysSinceLastActivity ?? 0;
					const isSelected = selectedId === item.id;

					const phaseLabel =
						typeof item.phase === "number"
							? `${item.client} · Phase ${item.phase}`
							: item.client;

					return (
						<button
							type="button"
							key={item.id}
							onClick={() => onSelect(item.id)}
							className={cn(
								"flex w-full items-center justify-between gap-4 rounded-lg border-l-[3px] bg-surface-container-lowest px-4 py-3 text-left shadow-xs transition-colors hover:bg-surface-container-high/40",
								stalenessClass[priority],
								isSelected && "ring-2 ring-primary",
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
								<p className="text-xs text-muted-foreground">{phaseLabel}</p>
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
							</div>
						</button>
					);
				})}

				{prioritizedItems.length === 0 && (
					<div className="rounded-lg bg-surface-container-lowest p-8 text-center text-sm text-muted-foreground">
						No items requiring follow-up.
					</div>
				)}
			</div>

			{/* ── Right: Info Rail ── */}
			<aside className="flex flex-col gap-4">
				<div className="rounded-xl bg-surface-container-lowest p-4 shadow-xs">
					{selectedItem ? (
						<>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-semibold text-foreground">
										{selectedItem.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{selectedPhaseLabel}
									</p>
								</div>
								<Badge
									variant="secondary"
									className={cn(
										"rounded-full border-0 text-[0.6rem]",
										priorityClass[selectedItem.priority ?? "medium"],
									)}
								>
									{priorityLabel[selectedItem.priority ?? "medium"]}
								</Badge>
							</div>

							<div className="mt-4 space-y-2">
								<p className="text-xs text-muted-foreground">
									Status: {formatStreamStatus(selectedItem.status)}
								</p>
								<p className="text-xs text-muted-foreground">
									Last activity: {selectedItem.daysSinceLastActivity ?? 0} days
									ago
								</p>
								<p className="text-xs font-medium uppercase tracking-[0.05em] text-secondary">
									Still missing
								</p>
								<ul className="space-y-2">
									{(selectedItem.missingFields ?? []).map((field) => (
										<li key={field} className="flex items-center gap-2">
											<Checkbox checked disabled aria-hidden />
											<span className="text-xs text-foreground">{field}</span>
										</li>
									))}
									{(selectedItem.missingFields ?? []).length === 0 ? (
										<li className="text-xs text-muted-foreground">
											No missing fields listed.
										</li>
									) : null}
								</ul>
							</div>

							<Button asChild className="mt-4 w-full" size="sm">
								<Link href={getFollowUpOpenHref(selectedItem.id)}>
									Open
									<ArrowUpRight
										data-icon="inline-end"
										aria-hidden
										className="size-3"
									/>
								</Link>
							</Button>
						</>
					) : (
						<div className="flex min-h-52 flex-col items-center justify-center gap-2 text-center">
							<Check aria-hidden className="size-5 text-muted-foreground" />
							<p className="text-sm font-medium text-foreground">
								Select an item to see details
							</p>
							<p className="text-xs text-muted-foreground">
								Review summary, missing checklist, and open action here.
							</p>
						</div>
					)}
				</div>
			</aside>
		</div>
	);
}
