"use client";

import { AlertCircle, DollarSign, Recycle, Target } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MetricCard } from "@/components/ui/metric-card";
import { Separator } from "@/components/ui/separator";
import { CompactDecisionHeader } from "./compact-decision-header";
import {
	extractCO2Avoided,
	extractHighRevenue,
	extractLandfillDiversion,
} from "./metrics-helpers";
import {
	AIInsightsCard,
	BusinessRisksCard,
	CircularEconomySection,
	ResourceConsiderationsCard,
	StrategicRecommendationsCard,
	WasteBaselineCard,
} from "./proposal-technical/index";
import type { Proposal } from "./types";

interface ProposalTechnicalProps {
	proposal: Proposal;
}

type RecommendationType =
	| "GO"
	| "NO-GO"
	| "INVESTIGATE FURTHER"
	| "INVESTIGATE";

function toRecommendation(value: string | undefined): RecommendationType {
	if (value === "GO" || value === "NO-GO" || value === "INVESTIGATE")
		return value;
	return "INVESTIGATE FURTHER";
}

export function ProposalTechnical({ proposal }: ProposalTechnicalProps) {
	const report = proposal.aiMetadata.proposal;
	const businessOpp = report.businessOpportunity;
	const circularEconomyOptions = businessOpp?.circularEconomyOptions ?? [];
	const resourceConsiderations = businessOpp?.resourceConsiderations;

	// Extract nested optional data with defaults
	const envImpact = resourceConsiderations?.environmentalImpact;
	const materialHandling = resourceConsiderations?.materialHandling;
	const marketIntel = resourceConsiderations?.marketIntelligence;

	const hazardLevel = materialHandling?.hazardLevel;
	const ppeRequirements = materialHandling?.ppeRequirements ?? [];
	const specificHazards = materialHandling?.specificHazards ?? [];
	const storageRequirements = materialHandling?.storageRequirements ?? [];
	const degradationRisks = materialHandling?.degradationRisks ?? [];
	const qualityPriceImpact = materialHandling?.qualityPriceImpact ?? [];
	const regulatoryNotes = materialHandling?.regulatoryNotes ?? [];

	const buyerTypes = marketIntel?.buyerTypes ?? [];
	const typicalRequirements = marketIntel?.typicalRequirements ?? [];
	const pricingFactors = marketIntel?.pricingFactors ?? [];

	// Use shared helpers for metric extraction
	const revenueEstimate = extractHighRevenue(report);
	const landfillDiversion = extractLandfillDiversion(report);
	const co2Avoided = extractCO2Avoided(report);

	const showSafetyAlert = hazardLevel === "Moderate" || hazardLevel === "High";

	return (
		<div className="space-y-6">
			{/* LEVEL 1: DECISION CONTEXT */}
			<CompactDecisionHeader
				recommendation={toRecommendation(businessOpp?.overallRecommendation)}
				keyFinancials={revenueEstimate}
				keyEnvironmentalImpact={co2Avoided}
				riskCount={businessOpp?.risks?.length || 0}
			/>

			{/* SAFETY ALERT - Show if Moderate or High Hazard */}
			{showSafetyAlert && (
				<Alert
					variant={hazardLevel === "High" ? "destructive" : "default"}
					className={
						hazardLevel === "High"
							? "border-destructive bg-destructive/5"
							: "border-warning bg-warning/5"
					}
				>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle className="font-bold">
						{hazardLevel} Hazard Material
					</AlertTitle>
					<AlertDescription>
						<span className="font-medium">PPE Required:</span>{" "}
						{ppeRequirements.slice(0, 2).join(", ")}
						{ppeRequirements.length > 2 &&
							` + ${ppeRequirements.length - 2} more`}
					</AlertDescription>
				</Alert>
			)}

			{/* HERO METRICS SECTION */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<MetricCard
					icon={DollarSign}
					label="Revenue Potential"
					value={revenueEstimate}
					subtitle="High estimate (annual)"
					variant="success"
				/>
				<MetricCard
					icon={Recycle}
					label="Business Ideas"
					value={circularEconomyOptions.length}
					subtitle="Circular economy pathways"
					variant="primary"
				/>
				<MetricCard
					icon={Target}
					label="Landfill Diversion"
					value={landfillDiversion}
					subtitle="Waste recovery potential"
					variant="chart-2"
				/>
			</div>

			{/* CIRCULAR ECONOMY BUSINESS IDEAS */}
			<CircularEconomySection options={circularEconomyOptions} />

			{/* Strategic Recommendations */}
			<StrategicRecommendationsCard
				recommendations={businessOpp?.strategicRecommendations ?? []}
			/>

			{/* Business Risks */}
			<BusinessRisksCard risks={businessOpp?.risks ?? []} />

			<Separator />

			{/* Resource Considerations - Practical Guidance */}
			{resourceConsiderations && (
				<ResourceConsiderationsCard
					envImpact={envImpact}
					hazardLevel={hazardLevel}
					ppeRequirements={ppeRequirements}
					specificHazards={specificHazards}
					storageRequirements={storageRequirements}
					degradationRisks={degradationRisks}
					qualityPriceImpact={qualityPriceImpact}
					regulatoryNotes={regulatoryNotes}
					buyerTypes={buyerTypes}
					typicalRequirements={typicalRequirements}
					pricingFactors={pricingFactors}
				/>
			)}

			<Separator />

			{/* AI Creative Insights */}
			<AIInsightsCard insights={report.aiInsights ?? []} />

			{/* WASTE BASELINE (Background Data - Moved to Bottom) */}
			<WasteBaselineCard
				primaryWasteTypes={report.primaryWasteTypes ?? []}
				dailyMonthlyVolume={report.dailyMonthlyVolume}
				existingDisposalMethod={report.existingDisposalMethod}
			/>
		</div>
	);
}
