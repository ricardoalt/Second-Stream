"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BriefChange, BriefPoint, PointState } from "./mock-data";

// ── PointStateBar ─────────────────────────────────────────────────────────────
// Left-edge semantic stripe — width encodes urgency.

function PointStateBar({ state }: { state: PointState }) {
	return (
		<div
			className={cn(
				"self-stretch rounded-full flex-shrink-0 mt-0.5",
				state === "confirmed" && "w-0.5 bg-success opacity-70",
				state === "needs-review" && "w-1 bg-warning opacity-70",
				state === "conflict" && "w-1 bg-destructive opacity-75",
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
				"w-3.5 h-3.5 rounded-[2px]",
				"bg-primary/8 text-primary",
				"text-[9px] font-bold ml-0.5 relative -top-px",
				"opacity-55 hover:opacity-100 hover:bg-primary/14",
				"transition-opacity duration-75 cursor-pointer",
			)}
			title={`Source ${num}`}
		>
			{num}
		</span>
	);
}

// ── UpdatedBadge ──────────────────────────────────────────────────────────────
// Diff on hover via HoverCard when a change payload is available.

function UpdatedBadge({ change }: { change?: BriefChange | undefined }) {
	if (!change) {
		return (
			<Badge
				variant="primary-subtle"
				className="ml-1.5 text-[9px] font-semibold h-4 px-1.5 py-0"
			>
				updated
			</Badge>
		);
	}

	return (
		<HoverCard openDelay={200}>
			<HoverCardTrigger asChild>
				<Badge
					variant="primary-subtle"
					className="ml-1.5 text-[9px] font-semibold h-4 px-1.5 py-0 cursor-default hover:bg-primary/[0.14]"
				>
					updated
				</Badge>
			</HoverCardTrigger>

			<HoverCardContent
				side="top"
				align="start"
				className="w-[220px] p-3 bg-card border border-border/70 shadow-md rounded-lg"
			>
				<div className="flex items-center gap-1.5 mb-2.5">
					<span className="text-[7.5px] font-bold tracking-[0.04em] text-muted-foreground bg-muted border border-border/50 px-1 py-px rounded-[2px]">
						{change.triggeredByType}
					</span>
					<span className="text-xs text-muted-foreground/80 font-medium">
						{change.triggeredBy}
					</span>
				</div>
				<div className="space-y-1">
					{change.previousValue ? (
						<p className="text-xs text-muted-foreground/55 line-through leading-snug">
							{change.previousValue}
						</p>
					) : (
						<p className="text-[10px] text-muted-foreground/40 italic">
							— was empty
						</p>
					)}
					<p className="text-xs text-foreground font-medium leading-snug">
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

function InlineReviewCluster({ actions }: { actions: BriefPoint["actions"] }) {
	const [proposalOpen, setProposalOpen] = useState(false);
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
					variant="outline"
					onClick={(e) => e.stopPropagation()}
					className={cn(
						"h-7 px-2.5 text-xs font-semibold",
						action === "Accept" &&
							"bg-success/[0.1] text-success border-success/25 hover:bg-success/[0.2]",
						action === "Incorrect" &&
							"text-destructive border-destructive/25 hover:bg-destructive/[0.06]",
					)}
				>
					{action}
				</Button>
			))}
			{secondaryActions.map((action) =>
				action === "Add note" ? (
					<Popover
						key={action}
						open={proposalOpen}
						onOpenChange={setProposalOpen}
					>
						<PopoverTrigger asChild>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={(e) => e.stopPropagation()}
								className="h-7 px-2 text-xs font-semibold text-muted-foreground/70 hover:text-foreground"
							>
								Propose change
							</Button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-[300px] p-3">
							<p className="text-xs font-semibold text-foreground">
								Proposed change (requires review)
							</p>
							<p className="text-[10px] text-muted-foreground mt-1">
								Write the change request. Nothing updates without explicit
								approval.
							</p>
							<Textarea
								rows={3}
								placeholder="Example: Replace 18% with 32% based on LR-884 p3"
								className="mt-2 text-xs"
							/>
							<div className="mt-2 flex justify-end gap-1.5">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-xs"
									onClick={() => setProposalOpen(false)}
								>
									Cancel
								</Button>
								<Button type="button" size="sm" className="h-6 px-2 text-xs">
									Submit for review
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				) : (
					<Button
						key={action}
						type="button"
						size="sm"
						variant="ghost"
						onClick={(e) => e.stopPropagation()}
						className="h-7 px-2 text-xs font-semibold text-muted-foreground/70 hover:text-foreground"
					>
						{action}
					</Button>
				),
			)}
		</div>
	);
}

// ── PointActions ──────────────────────────────────────────────────────────────

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
					className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
					onClick={(e) => e.stopPropagation()}
				>
					{action}
				</Button>
			))}
		</div>
	);
}

// ── BriefPointRow ─────────────────────────────────────────────────────────────
// Core reviewable unit. States: confirmed / needs-review / conflict / missing.

interface BriefPointRowProps {
	point: BriefPoint;
	isSelected: boolean;
	onSelect: (id: string) => void;
	change?: BriefChange | undefined;
	provenance?: string[] | undefined;
}

export function BriefPointRow({
	point,
	isSelected,
	onSelect,
	change,
	provenance,
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
				"w-full text-left flex items-start gap-3 py-2.5 cursor-default",
				"transition-all duration-75 rounded-md",
				"outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
				point.state === "needs-review" && !isSelected && "bg-warning/[0.03]",
				point.state === "conflict" && !isSelected && "bg-destructive/[0.03]",
				!isSelected && !needsReview && "hover:bg-foreground/[0.015]",
				!isSelected && "hover:-mx-2 hover:px-2",
				isSelected && "bg-primary/[0.045] -mx-2 px-2",
			)}
		>
			<PointStateBar state={point.state} />

			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-foreground leading-snug tracking-tight">
					{point.text}
					{point.refs?.map((ref) => (
						<CitationRef key={ref} num={ref} />
					))}
					{point.updated && <UpdatedBadge change={change} />}
				</p>

				{point.sub && (
					<p className="text-xs text-muted-foreground mt-0.5 leading-snug">
						{point.sub}
					</p>
				)}

				{/* Provenance — minimal inline per point (PRD §7) */}
				{provenance && provenance.length > 0 && (
					<p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
						{provenance.join(" · ")}
					</p>
				)}

				{isSelected && needsReview && (
					<InlineReviewCluster actions={point.actions} />
				)}
			</div>

			{!needsReview && (
				<PointActions actions={point.actions} visible={showActions} />
			)}
			{needsReview && !isSelected && (
				<PointActions actions={point.actions} visible={showActions} />
			)}
		</button>
	);
}
