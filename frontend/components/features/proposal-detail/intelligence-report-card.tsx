"use client";

import {
	ArrowRight,
	FlaskConical,
	Leaf,
	type LucideIcon,
	Shield,
	Sparkles,
	Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { InsightPreview } from "@/lib/types/proposal-detail";

const ICON_MAP: Record<string, LucideIcon> = {
	Sparkles,
	FlaskConical,
	Shield,
	Truck,
	Leaf,
};

const MAX_VISIBLE_INSIGHTS = 4;

interface IntelligenceReportCardProps {
	projectId: string;
	summary: string;
	generatedAt: string;
	insights: InsightPreview[];
}

export function IntelligenceReportCard({
	projectId,
	summary,
	generatedAt,
	insights,
}: IntelligenceReportCardProps) {
	const router = useRouter();
	const visibleInsights = insights.slice(0, MAX_VISIBLE_INSIGHTS);
	const overflowCount = insights.length - visibleInsights.length;

	return (
		<Card className="border-success/25 bg-success/5">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">Intelligence Report</CardTitle>
					<Badge
						variant="outline"
						className="shrink-0 border-success/40 bg-success/10 text-success-foreground dark:text-success"
					>
						Generated {formatRelativeDate(generatedAt)}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-foreground/85 leading-relaxed line-clamp-3">
					{summary}
				</p>

				{visibleInsights.length > 0 && (
					<div className="space-y-1.5">
						{visibleInsights.map((insight) => {
							const Icon = ICON_MAP[insight.iconName] ?? Sparkles;
							return (
								<div
									key={insight.title}
									className="flex items-center gap-2 text-sm text-muted-foreground"
								>
									<Icon
										className="h-3.5 w-3.5 shrink-0 text-primary"
										aria-hidden="true"
									/>
									{insight.title}
								</div>
							);
						})}
						{overflowCount > 0 && (
							<p className="text-xs text-muted-foreground/70 pl-5.5">
								and {overflowCount} more
							</p>
						)}
					</div>
				)}

				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						router.push(routes.project.intelligenceReport(projectId))
					}
					className="gap-1.5"
				>
					View full report
					<ArrowRight className="h-3.5 w-3.5" />
				</Button>
			</CardContent>
		</Card>
	);
}
