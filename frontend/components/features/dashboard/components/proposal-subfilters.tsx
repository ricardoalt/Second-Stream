"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
	useDashboardActions,
	useDashboardFilters,
} from "@/lib/stores/dashboard-store";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import { PROPOSAL_FOLLOW_UP_LABELS } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

const SUBFILTER_STATES: ProposalFollowUpState[] = [
	"uploaded",
	"waiting_to_send",
	"waiting_response",
	"under_negotiation",
	"accepted",
	"rejected",
];

/**
 * Inline filter chips for proposal follow-up states.
 * Shown only inside the Proposal bucket.
 */
export const ProposalSubfilters = memo(function ProposalSubfilters() {
	const { setProposalSubfilter } = useDashboardActions();
	const filters = useDashboardFilters();
	const active = filters.proposalFollowUpState;

	const handleClick = useCallback(
		(state: ProposalFollowUpState) => {
			setProposalSubfilter(active === state ? undefined : state);
		},
		[active, setProposalSubfilter],
	);

	return (
		<div className="relative space-y-2">
			<p className="text-xs text-muted-foreground">
				Filter proposals by follow-up stage.
			</p>
			<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
				{SUBFILTER_STATES.map((state) => {
					const isActive = active === state;
					return (
						<button
							key={state}
							type="button"
							onClick={() => handleClick(state)}
							className="shrink-0"
						>
							<Badge
								variant={isActive ? "default" : "outline"}
								className={cn(
									"cursor-pointer text-xs transition-colors",
									isActive
										? "bg-primary text-primary-foreground hover:bg-primary/90"
										: "hover:bg-accent/50 text-muted-foreground",
								)}
							>
								{PROPOSAL_FOLLOW_UP_LABELS[state]}
							</Badge>
						</button>
					);
				})}
			</div>
			{/* Right-fade gradient mask signaling scrollability on mobile */}
			<div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent md:hidden" />
		</div>
	);
});
