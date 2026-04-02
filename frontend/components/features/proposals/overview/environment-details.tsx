"use client";

import { motion } from "framer-motion";
import {
	AlertTriangle,
	ChevronDown,
	Droplets,
	Globe,
	Megaphone,
	RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface EnvironmentDetailsProps {
	co2Avoided: string;
	esgHeadline: string;
	currentHarm: string;
	waterSavings?: string;
	circularityPotential?: "High" | "Medium" | "Low";
	circularityRationale?: string;
}

const CIRCULARITY_CONFIG = {
	High: { bg: "bg-success/10", text: "text-success", label: "Closed-loop" },
	Medium: { bg: "bg-warning/10", text: "text-warning", label: "Downcycling" },
	Low: {
		bg: "bg-destructive/10",
		text: "text-destructive",
		label: "Energy recovery",
	},
} as const;

export function EnvironmentDetails({
	co2Avoided,
	esgHeadline,
	currentHarm,
	waterSavings,
	circularityPotential,
	circularityRationale,
}: EnvironmentDetailsProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
		>
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
						<Globe className="h-5 w-5 text-success" />
						Environmental Impact
					</h3>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
						<div className="p-4 rounded-xl bg-muted/50 border border-border">
							<div className="flex items-center gap-2 mb-2">
								<Globe className="h-4 w-4 text-success" />
								<span className="text-xs font-medium text-muted-foreground">
									CO2 Avoided
								</span>
							</div>
							<p className="text-lg font-bold text-foreground">{co2Avoided}</p>
							<p className="text-xs text-muted-foreground">per year</p>
						</div>

						{waterSavings && waterSavings !== "Not estimable" && (
							<div className="p-4 rounded-xl bg-muted/50 border border-border">
								<div className="flex items-center gap-2 mb-2">
									<Droplets className="h-4 w-4 text-info" />
									<span className="text-xs font-medium text-muted-foreground">
										Water Saved
									</span>
								</div>
								<p className="text-lg font-bold text-foreground">
									{waterSavings}
								</p>
								<p className="text-xs text-muted-foreground">per year</p>
							</div>
						)}

						{circularityPotential && (
							<div className="p-4 rounded-xl bg-muted/50 border border-border">
								<div className="flex items-center gap-2 mb-2">
									<RefreshCw className="h-4 w-4 text-primary" />
									<span className="text-xs font-medium text-muted-foreground">
										Circularity
									</span>
								</div>
								<Badge
									variant="outline"
									className={cn(
										"gap-1",
										CIRCULARITY_CONFIG[circularityPotential].bg,
										CIRCULARITY_CONFIG[circularityPotential].text,
									)}
								>
									{circularityPotential}
								</Badge>
								<p className="text-xs text-muted-foreground mt-1">
									{CIRCULARITY_CONFIG[circularityPotential].label}
								</p>
							</div>
						)}
					</div>

					<div className="p-4 rounded-lg bg-success/5 border border-success/20 mb-4">
						<div className="flex items-center gap-2 mb-2">
							<Megaphone className="h-4 w-4 text-success" />
							<span className="text-xs font-semibold text-success">
								ESG Headline
							</span>
						</div>
						<p className="text-sm text-foreground">{esgHeadline}</p>
					</div>

					<div className="p-4 rounded-lg bg-warning/5 border border-warning/20 mb-4">
						<div className="flex items-center gap-2 mb-2">
							<AlertTriangle className="h-4 w-4 text-warning" />
							<span className="text-xs font-semibold text-warning">
								If Not Diverted
							</span>
						</div>
						<p className="text-sm text-muted-foreground">{currentHarm}</p>
					</div>

					{circularityRationale && (
						<Collapsible open={isOpen} onOpenChange={setIsOpen}>
							<CollapsibleTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-between text-muted-foreground hover:text-foreground"
								>
									<span className="text-xs">Circularity Details</span>
									<ChevronDown
										className={cn(
											"h-4 w-4 transition-transform",
											isOpen && "rotate-180",
										)}
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className="pt-2 px-1 text-sm text-muted-foreground">
									{circularityRationale}
								</div>
							</CollapsibleContent>
						</Collapsible>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}
