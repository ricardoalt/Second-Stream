"use client";

import { cn } from "@/lib/utils";
import {
	DEMO_EXEC_SUMMARY,
	DEMO_PENDING_ITEMS,
	type ReadinessModel,
} from "./mock-data";

// ── ReadinessRing ─────────────────────────────────────────────────────────────
// Small SVG arc — shows brief completion at a glance, NOT a dashboard gauge.
// Uses primary token via currentColor.

function ReadinessRing({ percent }: { percent: number }) {
	const r = 14;
	const circ = 2 * Math.PI * r;
	const filled = (percent / 100) * circ;

	return (
		<div className="relative flex-shrink-0 flex items-center justify-center">
			<svg
				width="36"
				height="36"
				viewBox="0 0 36 36"
				className="block -rotate-90"
				aria-label={`${percent}% ready`}
			>
				<title>Readiness</title>
				{/* Track */}
				<circle
					cx="18"
					cy="18"
					r={r}
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					className="text-border"
				/>
				{/* Fill */}
				<circle
					cx="18"
					cy="18"
					r={r}
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeDasharray={`${filled} ${circ}`}
					className={cn(
						percent >= 80
							? "text-success"
							: percent >= 50
								? "text-primary"
								: "text-warning",
					)}
				/>
			</svg>
			{/* Percent label centered in ring */}
			<span
				className={cn(
					"absolute font-mono tabular-nums leading-none",
					"text-[8px] font-bold",
					"text-muted-foreground",
				)}
			>
				{percent}
			</span>
		</div>
	);
}

// ── LoopStatPill ──────────────────────────────────────────────────────────────
// Clickable stat that navigates the user into the loop — not decorative.

function LoopStatPill({
	count,
	label,
	variant,
	onClick,
}: {
	count: number;
	label: string;
	variant: "warning" | "destructive" | "primary";
	onClick?: () => void;
}) {
	const variantCls = {
		warning:
			"bg-badge-warning-bg text-badge-warning-text border-badge-warning-border",
		destructive:
			"bg-badge-destructive-bg text-badge-destructive-text border-badge-destructive-border",
		primary:
			"bg-badge-primary-bg text-badge-primary-text border-badge-primary-border",
	}[variant];

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5",
				"text-[10px] font-semibold font-sans rounded-md border",
				"transition-all duration-75 cursor-pointer",
				"hover:brightness-110 active:scale-[0.98]",
				variantCls,
			)}
		>
			<span className="tabular-nums font-bold">{count}</span>
			{label}
		</button>
	);
}

// ── FlowStateHeader ───────────────────────────────────────────────────────────
// The loop narrator. Replaces: ExecutiveSummary + ChangeSummaryStrip + ReviewBanner.
//
// Surface: surface-container-low — one step above background, below cards.
// Typography: font-display for the lead; body for flag + meta.
// Loop state: readiness ring + changed count + review count — all navigable.

interface FlowStateHeaderProps {
	readiness: ReadinessModel;
	onReviewNavigate?: () => void;
}

export function FlowStateHeader({
	readiness,
	onReviewNavigate,
}: FlowStateHeaderProps) {
	return (
		<div
			className={cn(
				// Surface — one step above background, clearly distinct
				"rounded-xl border border-border/50",
				"bg-surface-container-low",
				"shadow-2xs",
				// Inner padding — generous horizontal, tight vertical
				"px-4 py-3",
				"mb-7",
			)}
		>
			<div className="flex items-start gap-3">
				{/* Readiness ring — left anchor, first thing the eye lands on */}
				<ReadinessRing percent={readiness.percent} />

				{/* Main content block */}
				<div className="flex-1 min-w-0">
					{/* Lead sentence — font-display as per design system */}
					<p
						className={cn(
							"font-display text-[14px] font-semibold text-foreground",
							"leading-snug tracking-tight",
						)}
					>
						{DEMO_EXEC_SUMMARY.lead}
					</p>

					{/* Flag — amber accent line, the operational implication */}
					<div
						className={cn(
							"flex items-start gap-1.5 mt-1.5",
							"text-[12px] font-medium text-warning",
							"leading-snug",
						)}
					>
						<div
							className="w-0.5 min-h-[13px] bg-warning rounded-full mt-0.5 flex-shrink-0 opacity-60"
							aria-hidden
						/>
						<span>{DEMO_EXEC_SUMMARY.flag}</span>
					</div>

					{/* Loop state meta row — navigable pills and timestamps */}
					<div className={cn("flex items-center gap-2 mt-2.5 flex-wrap")}>
						{/* AI update signal — navigable to changed points */}
						{readiness.changedCount > 0 && (
							<LoopStatPill
								count={readiness.changedCount}
								label={`point${readiness.changedCount !== 1 ? "s" : ""} updated by AI`}
								variant="primary"
							/>
						)}

						{/* Review items — conflict severity takes priority */}
						{readiness.reviewCount > 0 && (
							<LoopStatPill
								count={readiness.reviewCount}
								label="need your review"
								variant={
									DEMO_PENDING_ITEMS.some((i) => i.severity === "conflict")
										? "destructive"
										: "warning"
								}
								{...(onReviewNavigate ? { onClick: onReviewNavigate } : {})}
							/>
						)}

						{/* Separator + meta */}
						<span
							className={cn(
								"font-mono text-[9.5px] text-muted-foreground/50",
								"ml-0.5",
							)}
						>
							Brief v3 · Updated 11:42 AM
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
