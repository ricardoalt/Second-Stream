"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { BriefChange, BriefPoint, PointState } from "./mock-data";

// ── PointStateBar ─────────────────────────────────────────────────────────────
// Left-edge semantic stripe — wider for review/conflict states (increases urgency signal).

function PointStateBar({ state }: { state: PointState }) {
	return (
		<div
			className={cn(
				"self-stretch rounded-full flex-shrink-0 mt-0.5",
				state === "confirmed" && "w-0.5 bg-success opacity-55",
				state === "needs-review" && "w-1 bg-warning opacity-65",
				state === "conflict" && "w-1 bg-destructive opacity-70",
				state === "missing" &&
					"w-0.5 bg-transparent border border-dashed border-muted-foreground opacity-30",
			)}
			aria-hidden
		/>
	);
}

// ── CitationRef ───────────────────────────────────────────────────────────────

function CitationRef({ num }: { num: number }) {
	return (
		<span
			className={cn(
				"inline-flex items-center justify-center",
				"w-[11px] h-[11px] rounded-[2px]",
				"bg-primary/6 text-primary",
				"text-[7px] font-bold ml-0.5 relative -top-px",
				"opacity-50 hover:opacity-100 hover:bg-primary/12",
				"transition-opacity duration-75 cursor-pointer",
			)}
			title={`Source ${num}`}
		>
			{num}
		</span>
	);
}

// ── UpdatedBadge ──────────────────────────────────────────────────────────────
// Shows diff on hover via HoverCard when a change is available.

function UpdatedBadge({ change }: { change?: BriefChange | undefined }) {
	if (!change) {
		return (
			<span className="text-[10px] italic text-primary ml-1.5 font-normal opacity-60">
				updated
			</span>
		);
	}

	return (
		<HoverCard openDelay={200} closeDelay={100}>
			<HoverCardTrigger asChild>
				<span
					className={cn(
						"inline-flex items-center px-1.5 py-px ml-1.5",
						"text-[8.5px] font-semibold rounded",
						"bg-primary/[0.08] text-primary border border-primary/15",
						"cursor-default hover:bg-primary/[0.14] transition-colors duration-75",
					)}
				>
					updated
				</span>
			</HoverCardTrigger>

			<HoverCardContent
				side="top"
				align="start"
				className="w-[220px] p-3 bg-card border border-border/70 shadow-md rounded-lg"
			>
				<div className="flex items-center gap-1.5 mb-2.5">
					<span
						className={cn(
							"text-[7.5px] font-bold tracking-[0.04em]",
							"text-muted-foreground bg-muted border border-border/50",
							"px-1 py-px rounded-[2px]",
						)}
					>
						{change.triggeredByType}
					</span>
					<span className="text-[10.5px] text-muted-foreground/80 font-medium">
						{change.triggeredBy}
					</span>
				</div>
				<div className="space-y-1">
					{change.previousValue ? (
						<p className="text-[11px] text-muted-foreground/55 line-through leading-snug">
							{change.previousValue}
						</p>
					) : (
						<p className="text-[10px] text-muted-foreground/40 italic">
							— was empty
						</p>
					)}
					<p className="text-[11px] text-foreground font-medium leading-snug">
						{change.currentValue}
					</p>
				</div>
				<p className="text-[9.5px] text-muted-foreground/50 mt-2 pt-2 border-t border-border/40">
					{change.timestamp}
				</p>
			</HoverCardContent>
		</HoverCard>
	);
}

// ── InlineReviewCluster ───────────────────────────────────────────────────────
// Shown below a selected point that needs review.
// Primary actions use Button primitives; secondary actions are ghost.

function InlineReviewCluster({ actions }: { actions: BriefPoint["actions"] }) {
	const primaryActions = actions.filter(
		(a) => a === "Accept" || a === "Incorrect",
	);
	const secondaryActions = actions.filter(
		(a) => a === "Verify" || a === "Add note",
	);

	return (
		<div className="flex items-center gap-1.5 mt-2.5">
			{primaryActions.map((action) => (
				<Button
					key={action}
					type="button"
					size="sm"
					variant={action === "Accept" ? "outline" : "ghost"}
					onClick={(e) => e.stopPropagation()}
					className={cn(
						"h-6 px-2.5 text-[10px] font-semibold",
						action === "Accept" &&
							"bg-success/[0.1] text-success border-success/25 hover:bg-success/[0.2]",
						action === "Incorrect" &&
							"text-destructive hover:text-destructive hover:bg-destructive/[0.06]",
					)}
				>
					{action}
				</Button>
			))}
			{secondaryActions.map((action) => (
				<Button
					key={action}
					type="button"
					size="sm"
					variant="ghost"
					onClick={(e) => e.stopPropagation()}
					className="h-6 px-2 text-[10px] font-semibold text-muted-foreground/70 hover:text-foreground"
				>
					{action}
				</Button>
			))}
		</div>
	);
}

// ── PointActions ──────────────────────────────────────────────────────────────
// Ghost actions for confirmed/missing states — appear on hover.

function PointActions({
	actions,
	visible,
}: {
	actions: BriefPoint["actions"];
	visible: boolean;
}) {
	return (
		<div
			className={cn(
				"flex gap-0.5 flex-shrink-0 transition-opacity duration-75",
				visible ? "opacity-100" : "opacity-0",
			)}
		>
			{actions.map((action) => (
				<Button
					key={action}
					type="button"
					size="sm"
					variant="ghost"
					className={cn(
						"h-6 px-2 text-[10px] font-semibold",
						"text-muted-foreground hover:text-foreground",
					)}
					onClick={(e) => e.stopPropagation()}
				>
					{action}
				</Button>
			))}
		</div>
	);
}

// ── BriefPointRow ────────────────────────────────────────────────────────────
// Core reviewable unit. States: confirmed / needs-review / conflict / missing.

interface BriefPointRowProps {
	point: BriefPoint;
	isSelected: boolean;
	onSelect: (id: string) => void;
	change?: BriefChange | undefined;
}

export function BriefPointRow({
	point,
	isSelected,
	onSelect,
	change,
}: BriefPointRowProps) {
	const [isHovered, setIsHovered] = useState(false);

	const needsReview =
		point.state === "needs-review" || point.state === "conflict";
	const showActions = isHovered || isSelected;

	return (
		<button
			type="button"
			aria-pressed={isSelected}
			onClick={() => onSelect(point.id)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className={cn(
				// Base layout
				"w-full text-left flex items-start gap-3 py-2.5 cursor-default",
				"transition-all duration-75 rounded-md",
				"outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				// Persistent background tint for review/conflict
				point.state === "needs-review" && !isSelected && "bg-warning/[0.03]",
				point.state === "conflict" && !isSelected && "bg-destructive/[0.03]",
				// Hover for confirmed/missing
				!isSelected && !needsReview && "hover:bg-foreground/[0.015]",
				!isSelected && "hover:-mx-2 hover:px-2",
				// Selected state
				isSelected && "bg-primary/[0.045] -mx-2 px-2",
			)}
		>
			<PointStateBar state={point.state} />

			<div className="flex-1 min-w-0">
				<p
					className={cn(
						"text-sm font-medium text-foreground",
						"leading-snug tracking-tight",
					)}
				>
					{point.text}
					{point.refs?.map((ref) => (
						<CitationRef key={ref} num={ref} />
					))}
					{point.updated && <UpdatedBadge change={change} />}
				</p>
				{point.sub && (
					<p className="text-[11.5px] text-muted-foreground/70 mt-0.5 leading-snug">
						{point.sub}
					</p>
				)}
				{/* InlineReviewCluster when selected and needs review */}
				{isSelected && needsReview && (
					<InlineReviewCluster actions={point.actions} />
				)}
			</div>

			{/* Ghost actions for confirmed/missing (review uses InlineReviewCluster) */}
			{!needsReview && (
				<PointActions actions={point.actions} visible={showActions} />
			)}
			{/* For review states not selected, show ghost actions on hover */}
			{needsReview && !isSelected && (
				<PointActions actions={point.actions} visible={showActions} />
			)}
		</button>
	);
}
