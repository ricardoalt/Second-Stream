"use client";

import { AlertTriangle, BellRing } from "lucide-react";
import { followUps } from "@/components/features/streams/mock-data";
import { StreamsFollowUpBoard } from "@/components/features/streams/streams-follow-up-board";
import { StreamsRouteTabs } from "@/components/features/streams/streams-route-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentFollowUpsPage() {
	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<AlertTriangle aria-hidden className="size-5 text-warning" />
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							Urgent Follow-ups
						</h1>
					</div>
					<p className="text-sm text-muted-foreground">
						Resolve stale streams and missing required fields flagged by AI and
						compliance.
					</p>
					<div className="flex flex-wrap gap-2">
						<Badge
							variant="secondary"
							className="rounded-full bg-destructive/15 text-destructive"
						>
							{followUps.filter((item) => item.priority === "urgent").length}{" "}
							urgent
						</Badge>
						<Badge
							variant="secondary"
							className="rounded-full bg-warning/20 text-warning-foreground"
						>
							{followUps.filter((item) => item.priority === "overdue").length}{" "}
							overdue
						</Badge>
						<Badge
							variant="secondary"
							className="rounded-full bg-info/20 text-info-foreground"
						>
							{followUps.filter((item) => item.priority === "upcoming").length}{" "}
							upcoming
						</Badge>
					</div>
				</div>
			</section>

			<StreamsRouteTabs />

			<Card className="bg-surface-container-lowest shadow-sm">
				<CardHeader className="flex flex-row items-center justify-between gap-3">
					<CardTitle className="font-display text-xl">
						Follow-up board
					</CardTitle>
					<div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 text-xs text-muted-foreground">
						<BellRing aria-hidden className="size-3.5 text-primary" />
						Priority is assigned for streams inactive &gt;7 days.
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<StreamsFollowUpBoard items={followUps} />
				</CardContent>
			</Card>
		</div>
	);
}
