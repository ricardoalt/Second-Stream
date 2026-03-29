import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AgentDashboardKpiCardProps = {
	title: string;
	value: string;
	caption: string;
	trend: {
		value: string;
		direction: "up" | "down" | "neutral";
	};
	icon: LucideIcon;
};

export function AgentDashboardKpiCard({
	title,
	value,
	caption,
	trend,
	icon: Icon,
}: AgentDashboardKpiCardProps) {
	const isPositive = trend.direction === "up";
	const isNegative = trend.direction === "down";

	return (
		<Card className="border-0 bg-surface-container-lowest shadow-xs card-lift">
			<CardHeader className="flex-row items-start justify-between gap-3 pb-3">
				<div className="flex flex-col gap-1">
					<CardDescription className="text-[0.7rem] uppercase tracking-[0.08em] text-secondary">
						{title}
					</CardDescription>
					<CardTitle className="font-display text-3xl font-semibold text-foreground">
						{value}
					</CardTitle>
				</div>
				<div className="flex size-10 items-center justify-center rounded-xl kpi-icon-gradient">
					<Icon aria-hidden="true" className="size-5" />
				</div>
			</CardHeader>
			<CardContent className="flex items-center justify-between gap-2 pt-0">
				<p className="text-xs text-muted-foreground">{caption}</p>
				<div
					className={cn(
						"inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-semibold",
						isPositive && "bg-success/10 text-success",
						isNegative && "bg-warning/15 text-warning",
						trend.direction === "neutral" && "bg-muted text-muted-foreground",
					)}
				>
					{isPositive && <ArrowUpRight aria-hidden="true" className="size-3" />}
					{isNegative && (
						<ArrowDownRight aria-hidden="true" className="size-3" />
					)}
					<span>{trend.value}</span>
				</div>
			</CardContent>
		</Card>
	);
}
