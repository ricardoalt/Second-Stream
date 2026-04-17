"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
	type ContextPanel,
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
				<p className="text-xs font-semibold text-foreground truncate">
					{item.name}
				</p>
				<p className="text-[10.5px] text-muted-foreground/80 leading-snug mt-px">
					{item.extract}
				</p>
				{item.meta && (
					<p className="text-[9.5px] text-muted-foreground/60 mt-0.5">
						{item.meta}
					</p>
				)}
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
		<div>
			<p className="text-xs uppercase tracking-[0.08em] text-secondary font-semibold mb-2">
				Pending review
				<span className="ml-2 font-bold tabular-nums text-warning">
					{DEMO_PENDING_ITEMS.length}
				</span>
			</p>
			<div className="rounded-lg border border-decision-investigate-border bg-decision-investigate-bg px-3 py-2">
				<div className="flex flex-col gap-0.5">
					{DEMO_PENDING_ITEMS.map((item) => {
						const isActive = activeId === item.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => onSelectPoint(item.id)}
								className={cn(
									"w-full rounded px-2 py-1 text-left text-sm font-medium transition-colors",
									isActive && "bg-warning/10",
									item.severity === "conflict"
										? "text-destructive/90 hover:text-destructive"
										: "text-warning/90 hover:text-warning",
								)}
							>
								<span className="inline-flex items-center gap-1.5">
									<span
										className={cn(
											"h-1.5 w-1.5 rounded-full flex-shrink-0",
											item.severity === "conflict"
												? "bg-destructive"
												: "bg-warning",
										)}
									/>
									{item.label}
								</span>
							</button>
						);
					})}
				</div>
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
				<p className="text-xs font-semibold leading-snug text-foreground">
					{update.label}
				</p>
				<p className="text-[10.5px] leading-snug text-muted-foreground/75">
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
			<p className="text-xs uppercase tracking-[0.08em] text-secondary font-semibold mb-2">
				{panel.label}
			</p>
			<p className="mb-2.5 pb-2 border-b border-border/40 text-sm font-semibold leading-snug text-foreground">
				{panel.pointText}
			</p>

			{panel.evidence.length > 0 ? (
				panel.evidence.map((item) => (
					<EvidenceItemRow key={`${item.type}-${item.name}`} item={item} />
				))
			) : (
				<p className="text-xs text-muted-foreground">
					No direct evidence attached yet.
				</p>
			)}

			{panel.extraEvidence && panel.extraEvidence.length > 0 && (
				<div className="mt-1 border-t border-border/30 pt-1.5">
					{panel.extraEvidence.map((item) => (
						<EvidenceItemRow key={`${item.type}-${item.name}`} item={item} />
					))}
				</div>
			)}

			{panel.insight && (
				<p className="mt-2 border-t border-border/30 pt-2 text-xs leading-relaxed text-muted-foreground">
					{panel.insight}
				</p>
			)}
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
	const recentUpdates = useMemo(() => DEMO_RECENT_UPDATES.slice(0, 3), []);

	return (
		<div className="sticky top-6 flex flex-col gap-5">
			<PendingReviewQueue
				onSelectPoint={onSelectPoint}
				activeId={selectedPointId}
			/>

			<Separator className="opacity-30" />

			<div>
				{activePanel ? (
					<ContextPanelView panel={activePanel} />
				) : (
					<div>
						<p className="text-xs uppercase tracking-[0.08em] text-secondary font-semibold mb-2">
							Recent activity
						</p>
						<div className="space-y-0.5">
							{recentUpdates.map((update, i) => (
								<div key={update.id}>
									<RecentUpdateRow update={update} />
									{i < recentUpdates.length - 1 && (
										<Separator className="opacity-20" />
									)}
								</div>
							))}
						</div>
						<p className="mt-3 text-xs leading-relaxed text-muted-foreground/60">
							Select a brief point to inspect its evidence and sources.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
