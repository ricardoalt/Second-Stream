import type { LucideIcon } from "lucide-react";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type DashboardQuickAction = {
	id: string;
	label: string;
	description: string;
	icon: LucideIcon;
	priority?: "high" | "normal";
};

export type DashboardPipelineStage = {
	stage: string;
	count: number;
	value: string;
	fill: number;
};

export function AgentDashboardQuickActions({
	actions,
	pipeline,
	onActionClick,
}: {
	actions: DashboardQuickAction[];
	pipeline: DashboardPipelineStage[];
	onActionClick?: (action: DashboardQuickAction) => void;
}) {
	return (
		<div className="flex flex-col gap-6">
			<Card className="border-0 bg-surface-container-lowest shadow-xs">
				<CardHeader className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-3">
						<CardTitle className="font-display text-xl font-semibold">
							Quick actions
						</CardTitle>
						<Badge
							variant="outline"
							className="rounded-full border-0 bg-primary/10 text-primary"
						>
							Daily focus
						</Badge>
					</div>
					<CardDescription>
						Complete high-impact tasks before end of day.
					</CardDescription>
					<div className="rounded-xl bg-surface-container-low p-3">
						<div className="mb-2 flex items-center justify-between text-xs">
							<span className="font-semibold uppercase tracking-[0.08em] text-secondary">
								Progress
							</span>
							<span className="font-medium text-foreground">
								2 / 5 complete
							</span>
						</div>
						<Progress value={40} aria-label="Daily progress" />
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-2 pt-0">
					{actions.map((action) => (
						<Button
							key={action.id}
							type="button"
							variant="ghost"
							className="h-auto w-full justify-between rounded-xl bg-surface-container-low/50 px-3 py-3 hover:bg-surface-container-high/40"
							onClick={() => onActionClick?.(action)}
						>
							<span className="flex min-w-0 items-start gap-2 text-left">
								<action.icon
									data-icon="inline-start"
									aria-hidden="true"
									className="mt-0.5"
								/>
								<span className="flex flex-col gap-1">
									<span className="text-sm font-medium text-foreground">
										{action.label}
									</span>
									<span className="text-xs text-muted-foreground">
										{action.description}
									</span>
								</span>
							</span>
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
								{action.priority === "high" ? "Do now" : "Open"}
								<ArrowRight aria-hidden="true" data-icon="inline-end" />
							</span>
						</Button>
					))}
				</CardContent>
			</Card>

			<Card className="border-0 bg-surface-container-lowest shadow-xs">
				<CardHeader className="flex-row items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle className="font-display text-xl font-semibold">
							Pipeline snapshot
						</CardTitle>
						<CardDescription>
							Visual stage distribution for active offers.
						</CardDescription>
					</div>
					<CalendarClock aria-hidden="true" className="text-primary" />
				</CardHeader>
				<CardContent className="flex flex-col gap-4 pt-0">
					{pipeline.map((stage) => (
						<div key={stage.stage} className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs">
								<span className="font-medium text-foreground">
									{stage.stage}
								</span>
								<span className="text-muted-foreground">
									{stage.count} offers · {stage.value}
								</span>
							</div>
							<Progress
								value={stage.fill}
								aria-label={`${stage.stage} progress`}
							/>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
