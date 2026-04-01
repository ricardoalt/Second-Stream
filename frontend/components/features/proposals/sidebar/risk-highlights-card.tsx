import { AlertCircle, ShieldAlert } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatNumber } from "../metrics-helpers";

// Legacy types from water treatment model (kept for backward compatibility)
interface EquipmentSpec {
	name: string;
	criticality?: "high" | "medium" | "low";
}

interface OperationalData {
	energyConsumptionKwhM3?: number;
	sludgeProductionKgDay?: number;
}

interface RiskHighlightsCardProps {
	equipment: EquipmentSpec[];
	operationalData?: OperationalData | undefined;
}

/**
 * Displays operational alerts and risk highlights
 * Shows high-criticality equipment and operational metrics
 */
export function RiskHighlightsCard({
	equipment,
	operationalData,
}: RiskHighlightsCardProps) {
	const highCriticality = equipment.filter(
		(item) => item.criticality === "high",
	);
	const hasOperationalData = Boolean(operationalData);

	// Format operational metrics if available
	const energyConsumption = operationalData?.energyConsumptionKwhM3;
	const sludgeProduction = operationalData?.sludgeProductionKgDay;

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					<ShieldAlert className="h-4 w-4" />
					Operational alerts
				</CardTitle>
				<CardDescription>
					Items to follow up before moving into detailed engineering.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				<div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/50 p-3">
					<div className="rounded-full bg-destructive/10 p-2">
						<AlertCircle className="h-4 w-4 text-destructive" />
					</div>
					<div className="space-y-1">
						<p className="font-medium">
							{highCriticality.length > 0
								? `${highCriticality.length} high-criticality equipment`
								: "No high-criticality equipment"}
						</p>
						<p className="text-xs text-muted-foreground">
							{highCriticality.length > 0
								? "Verify availability, maintainability, and redundancy."
								: "The equipment selection does not report major operational risks."}
						</p>
					</div>
				</div>
				{hasOperationalData ? (
					<div className="grid gap-3 sm:grid-cols-2">
						{energyConsumption !== undefined && (
							<MetricCard
								label="Estimated energy"
								value={`${formatNumber(energyConsumption)} kWh/m³`}
							/>
						)}
						{sludgeProduction !== undefined && (
							<MetricCard
								label="Projected sludge"
								value={`${formatNumber(sludgeProduction)} kg/day`}
							/>
						)}
					</div>
				) : (
					<p className="text-xs text-muted-foreground">
						No operational data received. Update the request if you need energy
						or sludge analysis.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

// Simple metric card for operational data
function MetricCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-border/70 bg-muted/30 p-3">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="mt-1 text-sm font-semibold">{value}</p>
		</div>
	);
}
