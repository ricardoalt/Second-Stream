import { Brain, CheckCircle2 } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AIMetadata } from "../types";

interface AIConfidenceCardProps {
	confidenceLevel: AIMetadata["proposal"]["confidence"];
	confidenceProgress: number | undefined;
}

/**
 * Displays AI agent confidence level with visual progress indicator
 * Shows validation checks performed by the AI
 */
export function AIConfidenceCard({
	confidenceLevel,
	confidenceProgress,
}: AIConfidenceCardProps) {
	return (
		<Card className="bg-card border border-border/50 shadow-sm">
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					<Brain className="h-4 w-4" />
					Agent confidence
				</CardTitle>
				<CardDescription>
					Estimated robustness based on the data analyzed and validations
					executed.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between text-sm font-medium">
					<span>Confidence</span>
					<span>{confidenceLevel ?? "TBD"}</span>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
					<div
						className={cn(
							"h-full rounded-full transition-[width]",
							confidenceLevel === "High" && "bg-success",
							confidenceLevel === "Medium" && "bg-warning",
							confidenceLevel === "Low" && "bg-destructive",
						)}
						style={{ width: `${confidenceProgress ?? 0}%` }}
					/>
				</div>
				<ul className="space-y-2 text-sm text-muted-foreground">
					<li className="flex items-center gap-2">
						<CheckCircle2 className="h-4 w-4 text-primary" />
						Capacity and mass balance checks
					</li>
					<li className="flex items-center gap-2">
						<CheckCircle2 className="h-4 w-4 text-primary" />
						Reference case comparison
					</li>
					<li className="flex items-center gap-2">
						<CheckCircle2 className="h-4 w-4 text-primary" />
						Documented assumptions for audit
					</li>
				</ul>
			</CardContent>
		</Card>
	);
}
