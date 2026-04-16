"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

// ── EvidenceItemRow ──────────────────────────────────────────────────────────

function EvidenceItemRow({ item }: { item: EvidenceItem }) {
	return (
		<div className="flex items-start gap-1.5 py-1.5">
			<Badge
				variant="neutral-subtle"
				className="text-[7.5px] font-bold tracking-[0.04em] px-1 py-0 h-4 rounded-[2px] flex-shrink-0 mt-0.5"
			>
				{item.type}
			</Badge>
			<div className="flex-1 min-w-0">
				<p className="text-[11.5px] font-semibold text-foreground truncate">
					{item.name}
				</p>
				<p className="text-[10.5px] text-muted-foreground/80 font-mono mt-px leading-snug">
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

// ── AskTellPanel ──────────────────────────────────────────────────────────────
// Contextual ask — scoped to the active brief point. NOT a chat drawer.

function AskTellPanel({ placeholder }: { placeholder?: string | undefined }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setIsOpen((v) => !v)}
				className="h-7 px-2 text-[10.5px] font-medium text-muted-foreground hover:text-primary mt-2"
			>
				<svg
					width="10"
					height="10"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					className="opacity-40 mr-1"
				>
					<title>Ask</title>
					<circle cx="8" cy="8" r="6.5" />
					<path d="M6.5 6.5a1.5 1.5 0 1 1 1.5 1.5v1" strokeLinecap="round" />
					<circle cx="8" cy="11.5" r=".5" fill="currentColor" stroke="none" />
				</svg>
				Ask about this
			</Button>

			{isOpen && (
				<div
					className={cn(
						"mt-1.5 p-2.5 rounded-lg",
						"bg-primary/[0.045] border border-primary/12",
					)}
				>
					<span className="text-[9px] text-muted-foreground block mb-1.5">
						Ask a question scoped to this point
					</span>
					<div className="flex items-center gap-1">
						<input
							type="text"
							placeholder={placeholder ?? "Type a question..."}
							className={cn(
								"flex-1 px-2 py-1 text-[11px] font-sans",
								"text-foreground border border-border rounded-md",
								"bg-card focus:outline-none focus:border-primary",
								"placeholder:text-muted-foreground/60",
								"transition-colors duration-100",
							)}
						/>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Send</title>
								<path d="M14 2 2 8l5 2 2 5z" />
							</svg>
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

// ── ContextPanelView ─────────────────────────────────────────────────────────
// Block 1 (when point selected): evidence for the selected brief point

function ContextPanelView({ panel }: { panel: ContextPanel }) {
	const [showExtra, setShowExtra] = useState(false);

	return (
		<div>
			<p
				className={cn(
					"text-[9px] font-bold uppercase tracking-[0.1em]",
					"text-muted-foreground/70 mb-1",
				)}
			>
				{panel.label}
			</p>
			<p
				className={cn(
					"text-[12.5px] font-semibold text-foreground",
					"leading-snug mb-3 pb-2.5 border-b border-border/50",
				)}
			>
				{panel.pointText}
			</p>

			{panel.evidence.map((item) => (
				<EvidenceItemRow key={`${item.type}-${item.name}`} item={item} />
			))}

			{panel.extraEvidence && panel.extraEvidence.length > 0 && (
				<>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setShowExtra((v) => !v)}
						className="h-6 px-1 text-[10px] font-medium text-muted-foreground hover:text-foreground mt-0.5"
					>
						{showExtra
							? "− collapse"
							: `+ ${panel.extraEvidence.length} more source${panel.extraEvidence.length > 1 ? "s" : ""}`}
					</Button>
					{showExtra && (
						<div className="border-t border-border/30 pt-1.5 mt-0.5">
							{panel.extraEvidence.map((item) => (
								<EvidenceItemRow
									key={`${item.type}-${item.name}`}
									item={item}
								/>
							))}
						</div>
					)}
				</>
			)}

			{panel.insight && (
				<p
					className={cn(
						"text-[11px] text-muted-foreground leading-relaxed",
						"mt-2.5 pt-2 border-t border-border/30",
					)}
				>
					{panel.insight}
				</p>
			)}

			{panel.hasAsk && <AskTellPanel placeholder={panel.askPlaceholder} />}
		</div>
	);
}

// ── RecentUpdateRow ──────────────────────────────────────────────────────────

function RecentUpdateRow({ update }: { update: RecentUpdate }) {
	const iconPath = {
		brief: "M4 4h8M4 8h6M4 12h4",
		evidence: "M12 3H4v10l4-2 4 2V3z",
		correction: "M11 4H5a1 1 0 0 0-1 1v8l3-1.5L10 13V5h1M13 7l2 2-2 2",
	}[update.type];

	const iconColor = {
		brief: "text-primary",
		evidence: "text-muted-foreground",
		correction: "text-warning",
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
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn("flex-shrink-0 mt-0.5 opacity-60", iconColor)}
			>
				<title>{update.type}</title>
				<path d={iconPath} />
			</svg>
			<div className="flex-1 min-w-0">
				<p className="text-[11px] font-semibold text-foreground leading-snug">
					{update.label}
				</p>
				<p className="text-[10px] text-muted-foreground/70 leading-snug mt-px">
					{update.detail}
				</p>
			</div>
			<span className="font-mono text-[9px] text-muted-foreground/45 flex-shrink-0 mt-0.5">
				{update.time}
			</span>
		</div>
	);
}

// ── Block: PendingReviewQueue ─────────────────────────────────────────────────
// Rail block 1 of max 3 — pending items, always on top.

function PendingReviewQueue({
	onSelectPoint,
}: {
	onSelectPoint: (id: string) => void;
}) {
	if (DEMO_PENDING_ITEMS.length === 0) return null;

	return (
		<div
			className={cn(
				"rounded-lg border border-decision-investigate-border",
				"bg-decision-investigate-bg",
				"px-3 py-2.5",
			)}
		>
			{/* Queue header */}
			<div className="flex items-center justify-between mb-2">
				<p
					className={cn(
						"text-[9px] font-bold uppercase tracking-[0.08em]",
						"text-warning/80",
					)}
				>
					Pending review
				</p>
				<span className="text-[10px] font-bold tabular-nums text-warning">
					{DEMO_PENDING_ITEMS.length}
				</span>
			</div>

			{/* Queue items */}
			<div className="flex flex-col gap-0.5">
				{DEMO_PENDING_ITEMS.map((item) => (
					<button
						key={item.id}
						type="button"
						onClick={() => onSelectPoint(item.id)}
						className={cn(
							"flex items-center gap-1.5 w-full text-left",
							"text-[11px] font-medium py-0.5",
							"bg-transparent border-none cursor-pointer",
							"transition-colors duration-75 font-sans rounded",
							item.severity === "conflict"
								? "text-destructive/90 hover:text-destructive"
								: "text-warning/90 hover:text-warning",
						)}
					>
						<span
							className={cn(
								"w-1 h-1 rounded-full flex-shrink-0",
								item.severity === "conflict"
									? "bg-destructive opacity-80"
									: "bg-warning opacity-70",
							)}
						/>
						{item.label}
					</button>
				))}
			</div>
		</div>
	);
}

// ── Block: RecentActivity ────────────────────────────────────────────────────
// Rail block 2 of max 3 — what happened recently.

function RecentActivity() {
	return (
		<div>
			<p
				className={cn(
					"text-[9px] font-bold uppercase tracking-[0.08em]",
					"text-muted-foreground/60 mb-1",
				)}
			>
				Recent activity
			</p>
			<div>
				{DEMO_RECENT_UPDATES.map((update, i) => (
					<div key={update.id}>
						<RecentUpdateRow update={update} />
						{i < DEMO_RECENT_UPDATES.length - 1 && (
							<Separator className="opacity-30" />
						)}
					</div>
				))}
			</div>
		</div>
	);
}

// ── RailDefaultView ──────────────────────────────────────────────────────────
// Default: pending review queue + recent activity.
// Max 3 blocks: [Pending review] [Recent activity] [Nudge].
// Never shows dead space.

function RailDefaultView({
	onSelectPoint,
}: {
	onSelectPoint: (id: string) => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			{/* Block 1: Review queue — always on top */}
			<PendingReviewQueue onSelectPoint={onSelectPoint} />

			{/* Block 2: Recent activity */}
			<RecentActivity />

			{/* Block 3: Nudge — select a point to see evidence */}
			<p className="text-[10px] text-muted-foreground/45 leading-relaxed">
				Select a brief point to see evidence
			</p>
		</div>
	);
}

// ── EvidenceContextRail ───────────────────────────────────────────────────────
// Right rail — sticky, always active. Uses Card primitive.
// Max 3 blocks. Default: review queue + recent updates.
// With selection: evidence context for the selected point + review queue.

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

	return (
		<Card className="sticky top-6 shadow-xs">
			<CardContent className="px-4 py-4">
				{activePanel ? (
					<div className="flex flex-col gap-4">
						{/* Block 1: Evidence for selected point */}
						<ContextPanelView panel={activePanel} />
						<Separator className="opacity-30" />
						{/* Block 2: Pending review (always available for navigation) */}
						<PendingReviewQueue onSelectPoint={onSelectPoint} />
					</div>
				) : (
					<RailDefaultView onSelectPoint={onSelectPoint} />
				)}
			</CardContent>
		</Card>
	);
}
