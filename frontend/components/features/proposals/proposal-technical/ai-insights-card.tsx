import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIInsightsCardProps {
	insights: string[];
}

export function AIInsightsCard({ insights }: AIInsightsCardProps) {
	if (insights.length === 0) return null;

	return (
		<Card className="border-info/20 bg-info/5">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Lightbulb className="h-6 w-6 text-info" />
					AI Creative Insights
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Non-obvious opportunities and strategic observations
				</p>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{insights.map((insight, idx) => (
						<div
							key={`insight-${insight.slice(0, 20)}-${idx}`}
							className="flex items-start gap-3 p-4 rounded-lg bg-info/10"
						>
							<Lightbulb className="h-5 w-5 mt-0.5 text-info flex-shrink-0" />
							<p className="text-sm leading-relaxed">{insight}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
