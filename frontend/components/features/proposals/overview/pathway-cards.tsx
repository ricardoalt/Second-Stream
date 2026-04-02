"use client";

import { motion } from "framer-motion";
import {
	AlertCircle,
	Check,
	CheckCircle2,
	ChevronDown,
	Copy,
	Crown,
	Lightbulb,
	MapPin,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const FEASIBILITY_CONFIG = {
	High: {
		bg: "bg-success/10",
		text: "text-success",
		border: "border-success/30",
		icon: CheckCircle2,
	},
	Medium: {
		bg: "bg-warning/10",
		text: "text-warning",
		border: "border-warning/30",
		icon: AlertCircle,
	},
	Low: {
		bg: "bg-destructive/10",
		text: "text-destructive",
		border: "border-destructive/30",
		icon: XCircle,
	},
} as const;

export interface PathwayData {
	action: string;
	buyerTypes: string;
	priceRange: string;
	annualValue: string;
	esgPitch: string;
	handling: string;
	feasibility?: "High" | "Medium" | "Low";
	targetLocations?: string[];
	whyItWorks?: string;
}

interface PathwayCardsProps {
	pathways: PathwayData[];
	onRefresh?: () => void;
}

function extractAnnualValue(value: string): number {
	// Extract numeric value from "$22k-26k/yr" or "$22,000/yr"
	const match = value.match(/\$?([\d.,]+)k?/i);
	if (!match?.[1]) return 0;
	const num = parseFloat(match[1].replace(/,/g, ""));
	return value.toLowerCase().includes("k") ? num * 1000 : num;
}

function copyToClipboard(text: string) {
	navigator.clipboard
		.writeText(text)
		.then(() => {
			toast.success("ESG pitch copied to clipboard", {
				description: "Ready to paste for your buyer presentation",
				duration: 3000,
			});
		})
		.catch(() => {
			toast.error("Failed to copy");
		});
}

function PathwayCard({
	pathway,
	index,
	isBest,
	isHero,
}: {
	pathway: PathwayData;
	index: number;
	isBest: boolean;
	isHero: boolean;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const FeasibilityIcon = pathway.feasibility
		? FEASIBILITY_CONFIG[pathway.feasibility].icon
		: null;

	const handleCopy = () => {
		copyToClipboard(pathway.esgPitch);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
			className={cn(isHero && "col-span-full")}
		>
			<Card
				className={cn(
					"overflow-hidden transition-[box-shadow,border-color] duration-200",
					isHero && "border-2 border-primary/50 shadow-lg",
					!isHero && "hover:shadow-md hover:border-border/80",
				)}
			>
				<CardContent className={cn("p-4", isHero && "p-6")}>
					{/* Header */}
					<div className="flex items-start justify-between gap-3 mb-3">
						<div className="flex items-center gap-2">
							<span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
								{index + 1}
							</span>
							{isBest && (
								<Badge
									variant="default"
									className="gap-1 bg-warning hover:bg-warning/90"
								>
									<Crown className="h-3 w-3" />
									Best ROI
								</Badge>
							)}
							{pathway.feasibility && FeasibilityIcon && (
								<Badge
									variant="outline"
									className={cn(
										"gap-1",
										FEASIBILITY_CONFIG[pathway.feasibility].bg,
										FEASIBILITY_CONFIG[pathway.feasibility].text,
										FEASIBILITY_CONFIG[pathway.feasibility].border,
									)}
								>
									<FeasibilityIcon className="h-3 w-3" />
									{pathway.feasibility}
								</Badge>
							)}
						</div>
					</div>

					{/* Action Title */}
					<h3
						className={cn(
							"font-semibold text-foreground mb-2",
							isHero ? "text-xl" : "text-base",
						)}
					>
						{pathway.action}
					</h3>

					{/* Metrics Row */}
					<div className="flex flex-col sm:flex-row flex-wrap gap-x-4 gap-y-2 text-sm mb-3">
						<span className="text-muted-foreground">{pathway.buyerTypes}</span>
						<div className="flex gap-4">
							<span
								className="font-medium text-muted-foreground"
								title="Reference estimate - actual prices vary by market"
							>
								{pathway.priceRange} (est.)
							</span>
							<span
								className="font-medium text-muted-foreground"
								title="Estimated annual value"
							>
								{pathway.annualValue}
							</span>
						</div>
					</div>

					{/* ESG Pitch */}
					<div
						className={cn(
							"p-3 sm:p-4 rounded-lg mb-3",
							"bg-success/5 border border-success/20",
						)}
					>
						<div className="flex flex-col sm:flex-row items-start justify-between gap-3">
							<div className="flex-1">
								<p className="text-xs font-semibold text-success mb-1">
									ESG Pitch for Buyer
								</p>
								<p className="text-sm text-foreground/80 italic leading-relaxed">
									&ldquo;{pathway.esgPitch}&rdquo;
								</p>
							</div>
							<Button
								size="sm"
								variant="outline"
								className={cn(
									"shrink-0 gap-2 h-9",
									"border-success/30",
									"hover:bg-success/10",
									copied && "bg-success/10 text-success",
								)}
								onClick={handleCopy}
							>
								{copied ? (
									<>
										<Check className="h-4 w-4" /> Copied
									</>
								) : (
									<>
										<Copy className="h-4 w-4" /> Copy
									</>
								)}
							</Button>
						</div>
					</div>

					{/* Handling (Collapsible) */}
					<Collapsible open={isOpen} onOpenChange={setIsOpen}>
						<CollapsibleTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="w-full justify-between text-muted-foreground hover:text-foreground"
							>
								<span className="text-xs">Handling & Storage</span>
								<ChevronDown
									className={cn(
										"h-4 w-4 transition-transform",
										isOpen && "rotate-180",
									)}
								/>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="pt-2 px-1 space-y-3">
								<p className="text-sm text-muted-foreground">
									{pathway.handling}
								</p>
								{pathway.targetLocations &&
									pathway.targetLocations.length > 0 && (
										<div className="flex flex-wrap items-center gap-2">
											<MapPin className="h-3.5 w-3.5 text-muted-foreground" />
											<span className="text-xs font-medium text-muted-foreground">
												Target Markets:
											</span>
											{pathway.targetLocations.map((location) => (
												<span
													key={location}
													className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
												>
													{location}
												</span>
											))}
										</div>
									)}
								{pathway.whyItWorks && (
									<div className="pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-3">
										<div className="flex items-center gap-1.5 mb-1">
											<Lightbulb className="h-3.5 w-3.5 text-primary" />
											<span className="text-xs font-semibold text-primary">
												Why it works
											</span>
										</div>
										<p className="text-sm text-muted-foreground italic">
											&quot;{pathway.whyItWorks}&quot;
										</p>
									</div>
								)}
							</div>
						</CollapsibleContent>
					</Collapsible>
				</CardContent>
			</Card>
		</motion.div>
	);
}

export function PathwayCards({ pathways, onRefresh }: PathwayCardsProps) {
	if (!pathways || pathways.length === 0) {
		return <PathwayCardsEmpty onRefresh={onRefresh} />;
	}

	// Find best ROI pathway
	const pathwaysWithValue = pathways.map((p, i) => ({
		...p,
		numericValue: extractAnnualValue(p.annualValue),
		originalIndex: i,
	}));

	const bestIndex = pathwaysWithValue.reduce((best, curr, i) => {
		const bestVal = pathwaysWithValue[best]?.numericValue ?? 0;
		return curr.numericValue > bestVal ? i : best;
	}, 0);

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-foreground">
				Business Pathways
			</h3>

			<div className="grid grid-cols-1 gap-4">
				{pathways.map((pathway, index) => (
					<PathwayCard
						key={`${pathway.action}|${pathway.priceRange}|${pathway.buyerTypes}|${pathway.annualValue ?? ""}`}
						pathway={pathway}
						index={index}
						isBest={index === bestIndex}
						isHero={false}
					/>
				))}
			</div>
		</div>
	);
}

// Empty State Component
function PathwayCardsEmpty({
	onRefresh,
}: {
	onRefresh?: (() => void) | undefined;
}) {
	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-foreground">
				Business Pathways
			</h3>
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
					<div className="rounded-full bg-muted p-4">
						<Lightbulb className="h-8 w-8 text-muted-foreground animate-pulse" />
					</div>
					<div className="space-y-1">
						<h3 className="text-base font-semibold text-foreground">
							Analyzing opportunities...
						</h3>
						<p className="text-sm text-muted-foreground max-w-xs">
							AI is identifying business pathways for this material. This may
							take a moment.
						</p>
					</div>
					{onRefresh && (
						<Button
							onClick={onRefresh}
							variant="outline"
							size="sm"
							className="gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							Refresh
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
