"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
	CompositionEntry,
	HazardClassification,
} from "@/lib/types/intelligence-report";
import { cn } from "@/lib/utils";

interface IntelligenceSummaryProps {
	shortDescription: string;
	fullDescription: string;
	composition: CompositionEntry[];
	hazardClassifications: HazardClassification[];
}

const COMPOSITION_COLORS = [
	"bg-primary",
	"bg-info",
	"bg-warning",
	"bg-success",
	"bg-destructive/70",
	"bg-muted-foreground/40",
];

export function IntelligenceSummary({
	shortDescription,
	fullDescription,
	composition,
	hazardClassifications,
}: IntelligenceSummaryProps) {
	const [open, setOpen] = useState(false);

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<Card>
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex w-full items-start gap-3 px-6 py-4 text-left hover:bg-accent/30 transition-colors rounded-t-xl",
							open && "border-b border-border/40",
						)}
					>
						<div className="flex-1 min-w-0">
							<h3 className="text-sm font-semibold text-foreground mb-1">
								Stream Summary
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
								{shortDescription}
							</p>
						</div>
						<ChevronDown
							className={cn(
								"h-4 w-4 shrink-0 mt-1 text-muted-foreground transition-transform duration-200",
								open && "rotate-180",
							)}
						/>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent className="px-6 pb-6 pt-0 space-y-5">
						<p className="text-sm text-foreground/90 leading-relaxed">
							{fullDescription}
						</p>

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
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}
