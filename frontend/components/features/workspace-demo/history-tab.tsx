"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── History event data ────────────────────────────────────────────────────────

type HistoryEventType =
	| "brief-updated"
	| "evidence-added"
	| "correction"
	| "review-action"
	| "stream-created";

interface HistoryEvent {
	id: string;
	type: HistoryEventType;
	label: string;
	detail: string;
	actor: string;
	actorType: "human" | "ai" | "system";
	time: string;
}

const HISTORY_EVENTS: HistoryEvent[] = [
	{
		id: "h-1",
		type: "brief-updated",
		label: "Brief refreshed — v3",
		detail: "Volume updated from 38–42t to 42–50t · pH qualifier added",
		actor: "AI",
		actorType: "ai",
		time: "11:42 AM",
	},
	{
		id: "h-2",
		type: "evidence-added",
		label: "Lab Report #LR-884 ingested",
		detail: "Solids % conflict detected — brief flagged for review",
		actor: "M. Torres",
		actorType: "human",
		time: "11:40 AM",
	},
	{
		id: "h-3",
		type: "evidence-added",
		label: "Manifests Jan–Mar uploaded",
		detail: "3 transport manifests attached — volume data extracted",
		actor: "M. Torres",
		actorType: "human",
		time: "11:35 AM",
	},
	{
		id: "h-4",
		type: "correction",
		label: "Volume qualifier added",
		detail: "Field agent noted contract cap discrepancy vs actual throughput",
		actor: "M. Torres",
		actorType: "human",
		time: "Yesterday",
	},
	{
		id: "h-5",
		type: "brief-updated",
		label: "Brief created — v1",
		detail: "Initial brief generated from service agreement",
		actor: "AI",
		actorType: "ai",
		time: "Yesterday",
	},
	{
		id: "h-6",
		type: "stream-created",
		label: "Stream created",
		detail: "Acme Paint Sludge — Houston",
		actor: "M. Torres",
		actorType: "human",
		time: "Yesterday",
	},
];

const EVENT_TYPE_ICONS: Record<HistoryEventType, string> = {
	"brief-updated": "M4 4h8M4 8h6M4 12h4",
	"evidence-added": "M12 3H4v10l4-2 4 2V3z",
	correction: "M11 4H5a1 1 0 0 0-1 1v8l3-1.5L10 13V5h1M13 7l2 2-2 2",
	"review-action": "M5 13l3-3m0 0l5-5m-5 5l-3 3m3-3l5-5",
	"stream-created": "M8 3v2M8 11v2M3 8h2M11 8h2",
};

const EVENT_TYPE_COLOR: Record<HistoryEventType, string> = {
	"brief-updated": "text-primary",
	"evidence-added": "text-muted-foreground",
	correction: "text-warning",
	"review-action": "text-success",
	"stream-created": "text-muted-foreground",
};

// ── HistoryRow ────────────────────────────────────────────────────────────────

function HistoryRow({ event }: { event: HistoryEvent }) {
	const iconPath = EVENT_TYPE_ICONS[event.type];
	const iconColor = EVENT_TYPE_COLOR[event.type];

	return (
		<div className="flex items-start gap-3 py-3">
			{/* Event icon */}
			<div
				className={cn(
					"w-6 h-6 rounded-md flex-shrink-0 mt-0.5",
					"flex items-center justify-center",
					"bg-muted/60",
				)}
			>
				<svg
					width="11"
					height="11"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={cn("opacity-70", iconColor)}
				>
					<title>{event.type}</title>
					<path d={iconPath} />
				</svg>
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline justify-between gap-2">
					<p className="text-[13px] font-semibold text-foreground leading-snug">
						{event.label}
					</p>
					<span className="font-mono text-[9.5px] text-muted-foreground/50 flex-shrink-0">
						{event.time}
					</span>
				</div>
				<p className="text-[11.5px] text-muted-foreground/80 mt-0.5 leading-snug">
					{event.detail}
				</p>
				<div className="flex items-center gap-1 mt-1">
					<Badge
						variant={
							event.actorType === "ai"
								? "primary-subtle"
								: event.actorType === "system"
									? "neutral-subtle"
									: "neutral-subtle"
						}
						className="text-[8.5px] font-bold px-1 py-0 h-4"
					>
						{event.actorType === "ai"
							? "AI"
							: event.actorType === "system"
								? "System"
								: "Human"}
					</Badge>
					<span className="text-[10.5px] text-muted-foreground/60">
						{event.actor}
					</span>
				</div>
			</div>
		</div>
	);
}

// ── HistoryTab ────────────────────────────────────────────────────────────────
// Compact chronological event log for this stream.
// Replaces placeholder with a real, minimal-real surface.

export function HistoryTab() {
	return (
		<div className="mt-7 max-w-3xl">
			<p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">
				History records when and why the brief changed. Use it to audit decisions,
				not to drive day-to-day editing.
			</p>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-[13px] font-semibold text-foreground">
					Activity history
				</h2>
				<Badge variant="neutral-subtle" className="text-[10px] font-medium">
					{HISTORY_EVENTS.length} events
				</Badge>
			</div>

			<Card className="shadow-xs">
				<CardContent className="px-4 py-0">
					{HISTORY_EVENTS.map((event, i) => (
						<div key={event.id}>
							<HistoryRow event={event} />
							{i < HISTORY_EVENTS.length - 1 && (
								<Separator className="opacity-25" />
							)}
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
