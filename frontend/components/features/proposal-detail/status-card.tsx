"use client";

import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";
import { PROPOSAL_FOLLOW_UP_LABELS } from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

const STATE_COLORS: Record<ProposalFollowUpState, string> = {
	uploaded: "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
	waiting_to_send:
		"border-info/40 bg-info/10 text-info-foreground dark:text-info",
	waiting_response:
		"border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
	under_negotiation:
		"border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning",
	accepted:
		"border-success/40 bg-success/10 text-success-foreground dark:text-success",
	rejected:
		"border-destructive/40 bg-destructive/10 text-destructive-foreground dark:text-destructive",
};

const TRANSITIONS: Record<ProposalFollowUpState, ProposalFollowUpState[]> = {
	uploaded: ["waiting_to_send"],
	waiting_to_send: ["waiting_response", "rejected"],
	waiting_response: [
		"waiting_to_send",
		"under_negotiation",
		"accepted",
		"rejected",
	],
	under_negotiation: ["waiting_response", "accepted", "rejected"],
	accepted: [],
	rejected: [],
};

interface StatusCardProps {
	state: ProposalFollowUpState;
	onStateChange: (next: ProposalFollowUpState) => void;
}

export function StatusCard({ state, onStateChange }: StatusCardProps) {
	const nextStates = TRANSITIONS[state];
	const isTerminal = nextStates.length === 0;

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">Proposal Status</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<Badge
					variant="outline"
					className={cn("text-sm px-3 py-1", STATE_COLORS[state])}
				>
					{PROPOSAL_FOLLOW_UP_LABELS[state]}
				</Badge>
				{!isTerminal && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-between"
							>
								Change status
								<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-48">
							{nextStates.map((next) => (
								<DropdownMenuItem
									key={next}
									onClick={() => onStateChange(next)}
								>
									{PROPOSAL_FOLLOW_UP_LABELS[next]}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
				{isTerminal && (
					<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
						{state === "accepted" ? (
							<>
								<CheckCircle2 className="h-3.5 w-3.5 text-success" />
								This proposal was accepted.
							</>
						) : (
							<>
								<XCircle className="h-3.5 w-3.5 text-destructive" />
								This proposal was rejected.
							</>
						)}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
