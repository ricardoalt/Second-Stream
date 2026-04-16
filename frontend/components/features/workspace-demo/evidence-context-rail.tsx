"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
	type ContextPanel,
	DEMO_AGENT,
	DEMO_CONTEXT_PANELS,
	DEMO_PENDING_ITEMS,
	DEMO_RECENT_UPDATES,
	type EvidenceItem,
	type RecentUpdate,
} from "./mock-data";

function EvidenceItemRow({ item }: { item: EvidenceItem }) {
	return (
		<div className="flex items-start gap-2 py-1.5">
			<Badge
				variant="neutral-subtle"
				className="text-[7.5px] font-bold tracking-[0.04em] px-1 py-0 h-4 rounded-[2px] flex-shrink-0 mt-0.5"
			>
				{item.type}
			</Badge>
			<div className="min-w-0 flex-1">
				<p className="text-[11.5px] font-semibold text-foreground truncate">
					{item.name}
				</p>
				<p className="text-[10.5px] text-muted-foreground/80 leading-snug mt-px">
					{item.extract}
				</p>
				{item.meta ? (
					<p className="text-[9.5px] text-muted-foreground/60 mt-0.5">
						{item.meta}
					</p>
				) : null}
			</div>
		</div>
	);
}

function PendingReviewQueue({
	onSelectPoint,
	activeId,
}: {
	onSelectPoint: (id: string) => void;
	activeId: string | null;
}) {
	if (DEMO_PENDING_ITEMS.length === 0) return null;

	return (
		<div className="rounded-lg border border-decision-investigate-border bg-decision-investigate-bg px-3 py-2.5">
			<div className="mb-2 flex items-center justify-between">
				<p className="text-[9px] font-bold uppercase tracking-[0.08em] text-warning/80">
					Pending review
				</p>
				<span className="text-[10px] font-bold tabular-nums text-warning">
					{DEMO_PENDING_ITEMS.length}
				</span>
			</div>

			<div className="flex flex-col gap-1">
				{DEMO_PENDING_ITEMS.map((item) => {
					const isActive = activeId === item.id;
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onSelectPoint(item.id)}
							className={cn(
								"w-full rounded-md px-2 py-1 text-left text-[11px] font-medium transition-colors",
								isActive && "bg-warning/10",
								item.severity === "conflict"
									? "text-destructive/90 hover:text-destructive"
									: "text-warning/90 hover:text-warning",
							)}
						>
							<span className="inline-flex items-center gap-1.5">
								<span
									className={cn(
										"h-1 w-1 rounded-full",
										item.severity === "conflict" ? "bg-destructive" : "bg-warning",
									)}
								/>
								{item.label}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function RecentUpdateRow({ update }: { update: RecentUpdate }) {
	const iconPath = {
		brief: "M4 4h8M4 8h6M4 12h4",
		evidence: "M12 3H4v10l4-2 4 2V3z",
		correction: "M11 4H5a1 1 0 0 0-1 1v8l3-1.5L10 13V5h1M13 7l2 2-2 2",
	}[update.type];

	return (
		<div className="flex items-start gap-2 py-1.5">
			<svg
				width="11"
				height="11"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="mt-0.5 flex-shrink-0 text-muted-foreground/60"
			>
				<title>{update.type}</title>
				<path d={iconPath} />
			</svg>
			<div className="min-w-0 flex-1">
				<p className="text-[11px] font-semibold leading-snug text-foreground">
					{update.label}
				</p>
				<p className="text-[10px] leading-snug text-muted-foreground/75">
					{update.detail}
				</p>
			</div>
			<span className="mt-0.5 flex-shrink-0 font-mono text-[9px] text-muted-foreground/45">
				{update.time}
			</span>
		</div>
	);
}

function ContextPanelView({ panel }: { panel: ContextPanel }) {
	return (
		<div>
			<p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70 mb-1">
				{panel.label}
			</p>
			<p className="mb-2.5 border-b border-border/40 pb-2 text-[12.5px] font-semibold leading-snug text-foreground">
				{panel.pointText}
			</p>

			{panel.evidence.length > 0 ? (
				panel.evidence.map((item) => (
					<EvidenceItemRow key={`${item.type}-${item.name}`} item={item} />
				))
			) : (
				<p className="text-[10.5px] text-muted-foreground">No direct evidence attached yet.</p>
			)}

			{panel.extraEvidence && panel.extraEvidence.length > 0 ? (
				<div className="mt-1 border-t border-border/30 pt-1.5">
					{panel.extraEvidence.map((item) => (
						<EvidenceItemRow key={`${item.type}-${item.name}`} item={item} />
					))}
				</div>
			) : null}

			{panel.insight ? (
				<p className="mt-2 border-t border-border/30 pt-2 text-[11px] leading-relaxed text-muted-foreground">
					{panel.insight}
				</p>
			) : null}
		</div>
	);
}

interface EvidenceContextRailProps {
	selectedPointId: string | null;
	onSelectPoint: (id: string) => void;
}

export function EvidenceContextRail({
	selectedPointId,
	onSelectPoint,
}: EvidenceContextRailProps) {
	const activePanel = selectedPointId
		? DEMO_CONTEXT_PANELS[selectedPointId]
		: null;

	const highSignalUpdates = useMemo(() => DEMO_RECENT_UPDATES.slice(0, 3), []);

	return (
		<Card className="sticky top-6 shadow-xs border-border/70">
			<CardContent className="px-4 py-4">
				<div className="flex items-center justify-between gap-2 mb-3">
					<div>
						<p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">
							Context rail
						</p>
						<p className="text-[12px] font-semibold text-foreground mt-0.5">
							High-signal review context
						</p>
					</div>
					<Badge variant="neutral-subtle" className="h-5 px-1.5 text-[9.5px] font-medium">
						{DEMO_AGENT.name}
					</Badge>
				</div>

				<PendingReviewQueue
					onSelectPoint={onSelectPoint}
					activeId={selectedPointId}
				/>

				<Separator className="my-3 opacity-30" />

				<ScrollArea className="h-[360px] pr-2">
					<div className="space-y-3">
						{activePanel ? (
							<ContextPanelView panel={activePanel} />
						) : (
							<div>
								<p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60 mb-1">
									Recent activity
								</p>
								{highSignalUpdates.map((update, i) => (
									<div key={update.id}>
										<RecentUpdateRow update={update} />
										{i < highSignalUpdates.length - 1 ? (
											<Separator className="opacity-30" />
										) : null}
									</div>
								))}
								<p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/60">
									Select a brief point to inspect provenance and request a scoped change.
								</p>
							</div>
						)}
					</div>
				</ScrollArea>

				<Separator className="my-3 opacity-30" />

				<div className="flex items-center justify-between gap-2">
					<p className="text-[10px] text-muted-foreground/70">
						Need a change? create explicit proposal first.
					</p>
					<Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]">
						Propose change
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
