"use client";

import { Button } from "@/components/ui/button";
import type { RecommendedAction } from "./mock-data";
import { DEMO_RECOMMENDED_ACTIONS } from "./mock-data";

function ActionItem({ action }: { action: RecommendedAction }) {
	return (
		<div className="flex items-start gap-3 py-2.5 border-t border-border/30 first:mt-1">
			<span className="font-mono text-xs text-muted-foreground/45 mt-0.5 flex-shrink-0">
				{action.num}
			</span>
			<div className="flex-1">
				<p className="text-sm font-semibold text-foreground tracking-tight leading-snug">
					{action.label}
				</p>
				<p className="text-xs text-muted-foreground mt-0.5 leading-snug">
					{action.why}
				</p>
			</div>
			<div className="flex gap-1 flex-shrink-0">
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={(e) => e.stopPropagation()}
				>
					Accept
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={(e) => e.stopPropagation()}
				>
					Defer
				</Button>
			</div>
		</div>
	);
}

export function RecommendedActions() {
	return (
		<div className="mt-8">
			<p className="text-xs uppercase tracking-[0.08em] text-secondary font-semibold mb-1">
				Recommended next
			</p>
			{DEMO_RECOMMENDED_ACTIONS.map((action) => (
				<ActionItem key={action.id} action={action} />
			))}
		</div>
	);
}
