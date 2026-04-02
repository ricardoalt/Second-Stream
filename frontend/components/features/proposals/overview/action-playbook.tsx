"use client";

import { motion } from "framer-motion";
import {
	ArrowUpRight,
	CheckCircle,
	ClipboardList,
	ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActionPlaybookProps {
	recommendations: string[];
	risks: string[];
}

// Determine risk severity from text content
function getRiskSeverity(risk: string): "high" | "medium" | "low" {
	const loweredRisk = risk.toLowerCase();

	// High severity keywords
	if (
		loweredRisk.includes("critical") ||
		loweredRisk.includes("hazard") ||
		loweredRisk.includes("toxic") ||
		loweredRisk.includes("contamin") ||
		loweredRisk.includes("regulat") ||
		loweredRisk.includes("legal")
	) {
		return "high";
	}

	// Low severity keywords
	if (
		loweredRisk.includes("minor") ||
		loweredRisk.includes("slight") ||
		loweredRisk.includes("small") ||
		loweredRisk.includes("minimal")
	) {
		return "low";
	}

	return "medium";
}

const SEVERITY_CONFIG = {
	high: { dot: "bg-destructive", text: "text-destructive" },
	medium: { dot: "bg-warning", text: "text-warning" },
	low: { dot: "bg-warning/70", text: "text-warning" },
} as const;

export function ActionPlaybook({
	recommendations,
	risks,
}: ActionPlaybookProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 mb-2">
				<ClipboardList className="h-5 w-5 text-primary" />
				<h3 className="text-lg font-semibold">Action Plan</h3>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Next Steps */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
				>
					<Card className="h-full border-l-4 border-l-success shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<ArrowUpRight className="h-5 w-5 text-success" />
								Next Steps
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								Actions for this week
							</p>
						</CardHeader>
						<CardContent>
							<ul className="space-y-3">
								{recommendations.map((item) => (
									<li key={item} className="flex items-start gap-3">
										<span className="flex-shrink-0 w-6 h-6 rounded-full bg-success/15 flex items-center justify-center mt-0.5">
											<CheckCircle className="h-4 w-4 text-success" />
										</span>
										<span className="text-sm leading-relaxed text-foreground/90">
											{item}
										</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				</motion.div>

				{/* Risks */}
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.4 }}
				>
					<Card className="h-full border-l-4 border-l-warning shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-base">
								<ShieldAlert className="h-5 w-5 text-warning" />
								Risks to Monitor
							</CardTitle>
							<p className="text-xs text-muted-foreground">
								Factors that could affect the deal
							</p>
						</CardHeader>
						<CardContent>
							<ul className="space-y-3">
								{risks.map((item) => {
									const severity = getRiskSeverity(item);
									const config = SEVERITY_CONFIG[severity];

									return (
										<li key={item} className="flex items-start gap-3">
											<span className="flex-shrink-0 flex items-center justify-center w-6 h-6 mt-0.5">
												<span
													className={cn(
														"w-2.5 h-2.5 rounded-full animate-pulse",
														config.dot,
													)}
												/>
											</span>
											<span
												className={cn(
													"text-sm leading-relaxed",
													severity === "high"
														? config.text
														: "text-foreground/90",
												)}
											>
												{item}
											</span>
										</li>
									);
								})}
							</ul>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
