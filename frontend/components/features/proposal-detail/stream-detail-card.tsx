"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
	CompositionEntry,
	HazardClassification,
} from "@/lib/types/intelligence-report";
import { cn } from "@/lib/utils";

const COMPOSITION_COLORS = [
	"bg-primary",
	"bg-info",
	"bg-warning",
	"bg-success",
	"bg-destructive/70",
	"bg-muted-foreground/40",
];

interface StreamDetailCardProps {
	volumeSummary: string;
	frequencySummary: string;
	composition: CompositionEntry[];
	hazardClassifications: HazardClassification[];
	safetyNotes: string;
}

export function StreamDetailCard({
	volumeSummary,
	frequencySummary,
	composition,
	hazardClassifications,
	safetyNotes,
}: StreamDetailCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">Waste Stream Information</CardTitle>
			</CardHeader>
			<CardContent className="space-y-5">
				{/* Stat tiles */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div className="rounded-lg bg-muted/30 px-4 py-3">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Volume
						</p>
						<p className="text-sm font-semibold text-foreground mt-0.5">
							{volumeSummary}
						</p>
					</div>
					<div className="rounded-lg bg-muted/30 px-4 py-3">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Frequency
						</p>
						<p className="text-sm font-semibold text-foreground mt-0.5">
							{frequencySummary}
						</p>
					</div>
					<div
						className={cn(
							"rounded-lg px-4 py-3",
							hazardClassifications.length > 0
								? "border border-warning/40 bg-warning/10"
								: "bg-muted/30",
						)}
					>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Hazard Level
						</p>
						<p className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
							{hazardClassifications.length > 0 && (
								<AlertTriangle className="h-3.5 w-3.5 text-warning" />
							)}
							{hazardClassifications.length > 0
								? `${hazardClassifications.length} identified`
								: "None"}
						</p>
					</div>
				</div>

				{/* Composition bars */}
				{composition.length > 0 && (
					<div className="space-y-3">
						<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Composition
						</h4>
						<div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
							{composition.map((entry, i) => (
								<div
									key={entry.substance}
									className={cn(
										"h-full transition-all",
										COMPOSITION_COLORS[i % COMPOSITION_COLORS.length],
										i > 0 && "border-l border-background",
									)}
									style={{ width: `${entry.percentage}%` }}
									title={`${entry.substance}: ${entry.percentage}%`}
								/>
							))}
						</div>
						<div className="flex flex-wrap gap-x-4 gap-y-1">
							{composition.map((entry, i) => (
								<div
									key={entry.substance}
									className="flex items-center gap-1.5 text-xs text-muted-foreground"
								>
									<span
										className={cn(
											"h-2.5 w-2.5 rounded-full shrink-0",
											COMPOSITION_COLORS[i % COMPOSITION_COLORS.length],
										)}
									/>
									{entry.substance}{" "}
									<span className="font-medium text-foreground">
										{entry.percentage}%
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Hazard badges */}
				{hazardClassifications.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Hazard Classifications
						</h4>
						<div className="flex flex-wrap gap-2">
							{hazardClassifications.map((h) => (
								<Badge
									key={h.code}
									variant="outline"
									className="border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning"
								>
									{h.code} — {h.label}
								</Badge>
							))}
						</div>
					</div>
				)}

				{/* Safety notes */}
				{safetyNotes && (
					<div className="space-y-2">
						<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Safety Notes
						</h4>
						<p className="text-sm text-foreground/85 leading-relaxed">
							{safetyNotes}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
