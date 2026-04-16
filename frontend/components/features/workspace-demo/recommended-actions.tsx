"use client";

import { cn } from "@/lib/utils";
import type { RecommendedAction } from "./mock-data";
import { DEMO_RECOMMENDED_ACTIONS } from "./mock-data";

// ── SectionLabel ─────────────────────────────────────────────────────────────
// Translates v5 .sec-label

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p
			className={cn(
				"text-[10px] font-bold uppercase tracking-[0.1em]",
				"text-muted-foreground/70",
			)}
		>
			{children}
		</p>
	);
}

// ── ActionItem ────────────────────────────────────────────────────────────────
// Single recommended next action row

function ActionItem({ action }: { action: RecommendedAction }) {
	return (
		<div
			className={cn(
				"flex items-start gap-3 py-2.5",
				"border-t border-border/30 first:mt-1",
			)}
		>
			<span
				className={cn(
					"font-mono text-[10px] text-muted-foreground/45",
					"mt-0.5 flex-shrink-0",
				)}
			>
				{action.num}
			</span>
			<div className="flex-1">
				<p className="text-[13px] font-semibold text-foreground tracking-tight leading-snug">
					{action.label}
				</p>
				<p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">
					{action.why}
				</p>
			</div>
			<div className="flex gap-1 flex-shrink-0">
				<button
					type="button"
					className={cn(
						"px-2.5 py-1 text-[10px] font-semibold rounded",
						"border border-border/60 bg-card text-foreground/70",
						"hover:border-border hover:text-foreground",
						"transition-all duration-75 font-sans",
					)}
					onClick={(e) => e.stopPropagation()}
				>
					Accept
				</button>
				<button
					type="button"
					className={cn(
						"px-2 py-0.5 text-[10px] font-semibold",
						"text-muted-foreground bg-transparent",
						"border border-transparent rounded",
						"hover:text-foreground",
						"transition-all duration-75 font-sans",
					)}
					onClick={(e) => e.stopPropagation()}
				>
					Defer
				</button>
			</div>
		</div>
	);
}

// ── RecommendedActions ────────────────────────────────────────────────────────

export function RecommendedActions() {
	return (
		<div className="mt-10">
			<div className="mb-3">
				<SectionLabel>Recommended next</SectionLabel>
			</div>
			{DEMO_RECOMMENDED_ACTIONS.map((action) => (
				<ActionItem key={action.id} action={action} />
			))}
		</div>
	);
}

// Re-export SectionLabel for use in DiscoveryBrief
export { SectionLabel };
