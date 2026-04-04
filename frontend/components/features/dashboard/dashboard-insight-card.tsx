import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { StatusChip } from "@/components/patterns";
import { Card, CardContent } from "@/components/ui";
import type { DashboardInsight } from "./field-agent-dashboard.types";

const severityConfig = {
	info: {
		icon: Sparkles,
		chipStatus: "info" as const,
		label: "AI signal",
	},
	warning: {
		icon: AlertCircle,
		chipStatus: "warning" as const,
		label: "Priority",
	},
	success: {
		icon: CheckCircle2,
		chipStatus: "success" as const,
		label: "Opportunity",
	},
};

export function DashboardInsightCard({
	insight,
}: {
	insight: DashboardInsight;
}) {
	const config = severityConfig[insight.severity];
	const Icon = config.icon;

	return (
		<Card className="border-border/50 bg-surface-container-low shadow-none">
			<CardContent className="space-y-2.5 p-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-2">
						<Icon className="size-3.5 text-primary" aria-hidden />
						<p className="text-sm font-medium leading-tight text-foreground">
							{insight.title}
						</p>
					</div>
					<StatusChip status={config.chipStatus} variant="subtle" size="xs">
						{config.label}
					</StatusChip>
				</div>
				<p className="text-xs leading-relaxed text-muted-foreground">
					{insight.description}
				</p>
			</CardContent>
		</Card>
	);
}
