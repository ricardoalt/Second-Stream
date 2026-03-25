import { ArrowUpRight, Clock3 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DashboardActivityItem = {
	id: string;
	agent: string;
	action: string;
	stream: string;
	time: string;
	status: "completed" | "follow_up" | "new";
};

const statusLabel: Record<DashboardActivityItem["status"], string> = {
	completed: "Completed",
	follow_up: "Follow-up",
	new: "New",
};

export function AgentDashboardActivityFeed({
	items,
}: {
	items: DashboardActivityItem[];
}) {
	return (
		<Card className="bg-surface-container-lowest shadow-sm">
			<CardHeader className="flex-row items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<CardTitle className="font-display text-xl font-semibold">
						Recent activity
					</CardTitle>
					<CardDescription>
						Latest field updates across streams and clients.
					</CardDescription>
				</div>
				<button
					type="button"
					className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
				>
					View timeline
					<ArrowUpRight aria-hidden="true" className="size-3" />
				</button>
			</CardHeader>
			<CardContent>
				<ul className="flex flex-col gap-2">
					{items.map((item, index) => (
						<li
							key={item.id}
							className={cn(
								"flex items-start gap-3 rounded-xl p-3",
								index % 2 === 0 ? "bg-surface" : "bg-surface-container-low",
							)}
						>
							<Avatar className="size-9">
								<AvatarFallback className="bg-primary/10 text-[0.65rem] font-semibold text-primary">
									{item.agent}
								</AvatarFallback>
							</Avatar>
							<div className="flex min-w-0 flex-1 flex-col gap-2">
								<p className="text-sm leading-5 text-foreground">
									<span className="font-semibold">{item.agent}</span>{" "}
									{item.action}{" "}
									<button
										type="button"
										className="font-semibold text-primary transition-colors hover:text-primary/80"
									>
										{item.stream}
									</button>
								</p>
								<div className="flex items-center gap-2">
									<Badge
										variant="muted"
										className="rounded-full border-0 text-[0.65rem]"
									>
										{statusLabel[item.status]}
									</Badge>
									<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
										<Clock3 aria-hidden="true" className="size-3" />
										{item.time}
									</span>
								</div>
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
