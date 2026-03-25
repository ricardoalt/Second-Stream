import {
	AlertTriangle,
	ArrowUpRight,
	CalendarClock,
	Clock3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FollowUpItem } from "./types";

const priorityLabel: Record<FollowUpItem["priority"], string> = {
	urgent: "Urgent",
	overdue: "Overdue",
	upcoming: "Upcoming",
};

const priorityClass: Record<FollowUpItem["priority"], string> = {
	urgent: "bg-destructive/15 text-destructive",
	overdue: "bg-warning/20 text-warning-foreground",
	upcoming: "bg-info/20 text-info-foreground",
};

export function StreamsFollowUpBoard({ items }: { items: FollowUpItem[] }) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{items.map((item) => (
				<Card key={item.id} className="bg-surface-container-lowest shadow-sm">
					<CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
						<div className="flex min-w-0 flex-col gap-1">
							<CardTitle className="font-display text-lg leading-tight">
								{item.streamName}
							</CardTitle>
							<p className="text-sm text-muted-foreground">{item.client}</p>
						</div>
						<Badge
							variant="secondary"
							className={cn(
								"rounded-full border-0",
								priorityClass[item.priority],
							)}
						>
							<AlertTriangle aria-hidden className="size-3" />
							{priorityLabel[item.priority]}
						</Badge>
					</CardHeader>
					<CardContent className="flex flex-col gap-4 pt-0">
						<div className="rounded-xl bg-surface-container-low p-3">
							<p className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
								Due date
							</p>
							<p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
								<CalendarClock aria-hidden className="size-4 text-primary" />
								{item.dueDate}
							</p>
						</div>

						<div className="flex flex-col gap-2">
							<p className="text-sm text-foreground">{item.reason}</p>
							<p className="text-sm text-muted-foreground">{item.nextAction}</p>
						</div>

						<div className="flex flex-wrap gap-2">
							{item.missingFields.map((field) => (
								<Badge
									key={field}
									variant="muted"
									className="rounded-full border-0 text-[0.65rem]"
								>
									{field}
								</Badge>
							))}
						</div>

						<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
							<Clock3 aria-hidden className="size-3" />
							{item.daysSinceLastActivity} days since last activity
						</p>
					</CardContent>
					<CardFooter className="flex items-center gap-2">
						<Button variant="secondary" className="flex-1">
							Open stream
							<ArrowUpRight data-icon="inline-end" aria-hidden />
						</Button>
						<Button variant="ghost" className="flex-1">
							Mark addressed
						</Button>
					</CardFooter>
				</Card>
			))}
		</div>
	);
}
