import { Building2, MessageSquareText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OfferTimelineEvent } from "../types";

function getTimelineIcon(type: OfferTimelineEvent["type"]) {
	if (type === "client") {
		return Building2;
	}

	if (type === "agent") {
		return MessageSquareText;
	}

	return ShieldCheck;
}

export function OfferActivityTimeline({
	events,
}: {
	events: OfferTimelineEvent[];
}) {
	return (
		<div className="flex flex-col gap-2">
			{events.map((event, index) => {
				const Icon = getTimelineIcon(event.type);
				return (
					<div
						key={event.id}
						className={cn(
							"flex items-start gap-3 rounded-xl p-3",
							index % 2 === 0 ? "bg-surface" : "bg-surface-container-low",
						)}
					>
						<div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-surface-container-lowest text-primary">
							<Icon aria-hidden className="size-4" />
						</div>
						<div className="flex flex-1 flex-col gap-1">
							<p className="text-sm font-medium text-foreground">
								{event.title}
							</p>
							<p className="text-xs text-muted-foreground">
								{event.description}
							</p>
							<p className="text-xs text-secondary">{event.timestamp}</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}
