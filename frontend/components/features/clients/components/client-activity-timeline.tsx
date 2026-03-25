import {
	ClipboardPenLine,
	FileCheck2,
	Mail,
	Phone,
	Workflow,
} from "lucide-react";
import type { ClientDetail } from "@/components/features/clients/mock-data";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const timelineIcon = {
	call: Phone,
	email: Mail,
	proposal: FileCheck2,
	stream: Workflow,
	note: ClipboardPenLine,
} as const;

export function ClientActivityTimeline({
	items,
}: {
	items: ClientDetail["activityTimeline"];
}) {
	return (
		<Card className="bg-surface-container-lowest shadow-sm">
			<CardHeader>
				<CardTitle className="font-display text-xl font-semibold">
					Activity timeline
				</CardTitle>
				<CardDescription>
					Latest account interactions and stream events.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 pt-0">
				{items.length === 0 ? (
					<p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
						No timeline activity available yet.
					</p>
				) : null}
				{items.map((item, index) => {
					const Icon = timelineIcon[item.type];

					return (
						<div
							key={item.id}
							className={cn(
								"flex items-start gap-3 rounded-xl p-3",
								index % 2 === 0 ? "bg-surface" : "bg-surface-container-low",
							)}
						>
							<div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
								<Icon aria-hidden="true" className="size-4" />
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<p className="text-sm font-medium text-foreground">
									{item.title}
								</p>
								<p className="text-xs text-muted-foreground">
									{item.description}
								</p>
							</div>
							<p className="text-xs text-muted-foreground">{item.at}</p>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}
