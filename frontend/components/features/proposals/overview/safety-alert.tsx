"use client";

import { motion } from "framer-motion";
import { AlertTriangle, HardHat, Package } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SafetyAlertProps {
	hazard: "None" | "Low" | "Moderate" | "High";
	warnings: string;
	storage: string;
}

const HAZARD_CONFIG = {
	None: null, // Don't render
	Low: {
		variant: "default" as const,
		bg: "bg-warning/5",
		border: "border-warning/30",
		icon: "text-warning",
		badge: "bg-warning/15 text-warning",
	},
	Moderate: {
		variant: "default" as const,
		bg: "bg-warning/10",
		border: "border-warning/40",
		icon: "text-warning",
		badge: "bg-warning/15 text-warning",
	},
	High: {
		variant: "destructive" as const,
		bg: "bg-destructive/5",
		border: "border-destructive/30",
		icon: "text-destructive",
		badge: "bg-destructive/15 text-destructive",
	},
} as const;

export function SafetyAlert({ hazard, warnings, storage }: SafetyAlertProps) {
	// Don't render if no hazard
	if (hazard === "None") return null;

	const config = HAZARD_CONFIG[hazard];
	if (!config) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
		>
			<Alert className={cn(config.bg, config.border, "border")}>
				<AlertTriangle className={cn("h-5 w-5", config.icon)} />
				<AlertTitle className="flex items-center gap-2">
					Safety Alert
					<Badge className={config.badge}>{hazard} Hazard</Badge>
				</AlertTitle>
				<AlertDescription className="mt-3 space-y-3">
					{warnings && (
						<div className="flex items-start gap-2">
							<HardHat className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
							<div>
								<p className="text-xs font-semibold text-foreground mb-0.5">
									Warnings
								</p>
								<p className="text-sm text-muted-foreground">{warnings}</p>
							</div>
						</div>
					)}
					{storage && (
						<div className="flex items-start gap-2">
							<Package className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
							<div>
								<p className="text-xs font-semibold text-foreground mb-0.5">
									Storage Requirements
								</p>
								<p className="text-sm text-muted-foreground">{storage}</p>
							</div>
						</div>
					)}
				</AlertDescription>
			</Alert>
		</motion.div>
	);
}
