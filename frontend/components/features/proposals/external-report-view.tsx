"use client";

/**
 * External Report View
 *
 * Client-facing sustainability report that displays sanitized data.
 * Shows CO₂ reduction, water savings, circularity metrics, and
 * profitability band without sensitive commercial details.
 */

import {
	ArrowRight,
	CheckCircle,
	Coins,
	Droplets,
	Info,
	Leaf,
	Package,
	Recycle,
	TrendingUp,
	Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SustainabilityMetric } from "@/lib/types/external-opportunity-report";
import { cn } from "@/lib/utils";
import { createStableKeys } from "@/lib/utils/stable-keys";
import type { Proposal } from "./types";

interface ExternalReportViewProps {
	proposal: Proposal;
}

const PROFITABILITY_COLORS = {
	High: "bg-success/10 text-success border-success/30",
	Medium: "bg-warning/10 text-warning border-warning/30",
	Low: "bg-destructive/10 text-destructive border-destructive/30",
	Unknown: "bg-muted text-muted-foreground border-border",
} as const;

const ANNUAL_IMPACT_PLACEHOLDER = "To be confirmed";

function MetricCard({
	icon: Icon,
	title,
	metric,
	colorClass,
}: {
	icon: React.ElementType;
	title: string;
	metric: SustainabilityMetric | undefined;
	colorClass: string;
}) {
	const isComputed = metric?.status === "computed";
	const value = metric?.value;
	const dataNeeded = metric?.dataNeeded || [];

	return (
		<Card
			className={cn("relative overflow-hidden", !isComputed && "opacity-75")}
		>
			<div className={cn("absolute inset-0 opacity-5", colorClass)} />
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className={cn("p-2 rounded-lg", colorClass)}>
							<Icon className="h-5 w-5" />
						</div>
						<CardTitle className="text-base">{title}</CardTitle>
					</div>
					<Badge variant={isComputed ? "default" : "secondary"}>
						{isComputed ? "Computed" : "Pending"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				{isComputed && value ? (
					<>
						<p className="text-2xl font-bold tracking-tight">{value}</p>
						{metric?.basis && (
							<p className="text-xs text-muted-foreground mt-1">
								{metric.basis}
							</p>
						)}
					</>
				) : (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">
							This metric requires additional data to compute.
						</p>
						{dataNeeded.length > 0 && (
							<div className="space-y-1">
								<p className="text-xs font-medium text-foreground">
									Data needed:
								</p>
								<ul className="text-xs text-muted-foreground space-y-0.5">
									{(() => {
										const keys = createStableKeys(dataNeeded);
										return dataNeeded.map((item, i) => (
											<li key={keys[i]} className="flex items-center gap-1.5">
												<ArrowRight className="h-3 w-3 text-primary/60" />
												{item}
											</li>
										));
									})()}
								</ul>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function ExternalReportView({ proposal }: ExternalReportViewProps) {
	const external = proposal.aiMetadata.proposalExternal;

	if (!external) {
		return (
			<Card className="border-dashed">
				<CardContent className="py-12 text-center">
					<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
						<Info className="h-6 w-6 text-muted-foreground" />
					</div>
					<h3 className="font-semibold text-lg mb-2">
						External Report Not Available
					</h3>
					<p className="text-sm text-muted-foreground max-w-md mx-auto">
						The client-facing sustainability report has not been generated for
						this proposal. Please regenerate the proposal to create the external
						report.
					</p>
				</CardContent>
			</Card>
		);
	}

	const sustainability = external.sustainability;
	const profitabilityBand = external.profitabilityBand;
	const generatedAt = external.generatedAt;
	const annualImpactBand = external.annualImpactMagnitudeBand ?? "Unknown";
	const annualImpactBasis = external.annualImpactBasis ?? "Unknown";
	const annualImpactConfidence = external.annualImpactConfidence ?? "Low";
	const annualImpactNotes = external.annualImpactNotes ?? [];
	const hasAnnualImpact =
		external.annualImpactMagnitudeBand !== undefined ||
		external.annualImpactBasis !== undefined ||
		annualImpactNotes.length > 0;
	const profitabilityStatement = external.profitabilityStatement?.trim() ?? "";
	const isHighlyProfitable =
		profitabilityStatement.toLowerCase() === "highly profitable";

	return (
		<div className="space-y-8 animate-in fade-in duration-500">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">
						Sustainability Report
					</h2>
					<p className="text-sm text-muted-foreground">
						Client-facing environmental impact summary
					</p>
				</div>
				<Badge variant="outline" className="gap-1.5">
					<Leaf className="h-3 w-3" />
					ESG Ready
				</Badge>
			</div>

			{/* Executive Summary */}
			{sustainability.summary && (
				<Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/25">
					<CardContent className="py-6">
						<p className="text-lg leading-relaxed text-foreground/90">
							{sustainability.summary}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Material Description */}
			{external.materialDescription && (
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<div className="p-2 rounded-lg bg-muted text-muted-foreground">
								<Package className="h-5 w-5" />
							</div>
							<div>
								<CardTitle className="text-base">Material Overview</CardTitle>
								<CardDescription>
									Detailed description of the waste stream
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground whitespace-pre-line leading-relaxed">
							{external.materialDescription}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Recommended Actions & Handling Guidance */}
			{(external.recommendedActions?.length > 0 ||
				external.handlingGuidance?.length > 0) && (
				<div className="grid gap-4 md:grid-cols-2">
					{external.recommendedActions?.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-lg bg-success/10 text-success">
										<CheckCircle className="h-5 w-5" />
									</div>
									<div>
										<CardTitle className="text-base">
											Valorization Options
										</CardTitle>
										<CardDescription>
											Recommended processing actions
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2">
									{(() => {
										const keys = createStableKeys(external.recommendedActions);
										return external.recommendedActions.map((action, i) => (
											<li key={keys[i]} className="flex items-start gap-2">
												<CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
												<span className="text-sm">{action}</span>
											</li>
										));
									})()}
								</ul>
							</CardContent>
						</Card>
					)}
					{external.handlingGuidance?.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-2">
									<div className="p-2 rounded-lg bg-info/10 text-info">
										<Wrench className="h-5 w-5" />
									</div>
									<div>
										<CardTitle className="text-base">
											Handling Requirements
										</CardTitle>
										<CardDescription>
											Storage and transport guidance
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2">
									{(() => {
										const keys = createStableKeys(external.handlingGuidance);
										return external.handlingGuidance.map((guidance, i) => (
											<li key={keys[i]} className="flex items-start gap-2">
												<ArrowRight className="h-4 w-4 text-info mt-0.5 shrink-0" />
												<span className="text-sm">{guidance}</span>
											</li>
										));
									})()}
								</ul>
							</CardContent>
						</Card>
					)}
				</div>
			)}

			{/* Sustainability Metrics Grid */}
			<div className="grid gap-4 md:grid-cols-2">
				<MetricCard
					icon={Leaf}
					title="CO₂e Reduction"
					metric={sustainability.co2eReduction}
					colorClass="bg-success/10 text-success"
				/>
				<MetricCard
					icon={Droplets}
					title="Water Savings"
					metric={sustainability.waterSavings}
					colorClass="bg-info/10 text-info"
				/>
			</div>

			{/* Circularity Indicators */}
			{sustainability.circularity.length > 0 && (
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<div className="p-2 rounded-lg bg-primary/10 text-primary">
								<Recycle className="h-5 w-5" />
							</div>
							<div>
								<CardTitle className="text-base">
									Circularity Indicators
								</CardTitle>
								<CardDescription>
									Circular economy performance metrics
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{sustainability.circularity.map((indicator) => (
								<div
									key={indicator.name}
									className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
								>
									<div>
										<p className="font-medium">{indicator.name}</p>
										{indicator.metric.status === "computed" &&
										indicator.metric.value ? (
											<p className="text-sm text-success font-medium">
												{indicator.metric.value}
											</p>
										) : (
											<p className="text-sm text-muted-foreground">
												Data collection in progress
											</p>
										)}
									</div>
									<Badge
										variant={
											indicator.metric.status === "computed"
												? "default"
												: "secondary"
										}
									>
										{indicator.metric.status === "computed"
											? "Active"
											: "Pending"}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Overall Environmental Impact */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						Overall Environmental Impact
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						{sustainability.overallEnvironmentalImpact}
					</p>
				</CardContent>
			</Card>

			{/* Annual Impact Estimate */}
			{(hasAnnualImpact || external.annualImpactNarrative) && (
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<div className="p-2 rounded-lg bg-success/10 text-success">
								<Coins className="h-5 w-5" />
							</div>
							<div>
								<CardTitle className="text-base">
									Annual Impact Estimate
								</CardTitle>
								<CardDescription>Economic impact summary</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						{external.annualImpactNarrative ? (
							<p className="text-muted-foreground leading-relaxed">
								{external.annualImpactNarrative}
							</p>
						) : (
							<>
								<p className="text-lg font-semibold">
									{annualImpactBand === "Unknown"
										? ANNUAL_IMPACT_PLACEHOLDER
										: `${annualImpactBand} annual impact (estimate)`}
								</p>
								{annualImpactBasis !== "Unknown" && (
									<p className="text-sm text-muted-foreground">
										Basis: {annualImpactBasis}
									</p>
								)}
								{annualImpactConfidence && (
									<p className="text-sm text-muted-foreground">
										Confidence: {annualImpactConfidence}
									</p>
								)}
								{annualImpactNotes.length > 0 && (
									<ul className="text-sm text-muted-foreground space-y-1">
										{annualImpactNotes.map((note, index) => (
											<li
												// biome-ignore lint/suspicious/noArrayIndexKey: notes may repeat, index needed
												key={`${note}-${index}`}
												className="flex items-start gap-2"
											>
												<ArrowRight className="h-4 w-4 text-primary/60 mt-0.5" />
												{note}
											</li>
										))}
									</ul>
								)}
							</>
						)}
					</CardContent>
				</Card>
			)}

			{/* Potential End-Use Industries */}
			{external.endUseIndustryExamples?.length > 0 && (
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<div className="p-2 rounded-lg bg-muted text-muted-foreground">
								<Recycle className="h-5 w-5" />
							</div>
							<div>
								<CardTitle className="text-base">
									Potential End-Use Industries
								</CardTitle>
								<CardDescription>
									Example markets for valorized materials
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{external.endUseIndustryExamples.map((industry) => (
								<Badge key={industry} variant="outline" className="text-xs">
									{industry}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<Separator />

			{/* Commercial Assessment */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-lg bg-warning/10 text-warning">
							<TrendingUp className="h-5 w-5" />
						</div>
						<div>
							<CardTitle className="text-base">
								Opportunity Assessment
							</CardTitle>
							<CardDescription>
								Commercial opportunity evaluation
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{external.opportunityNarrative && (
						<p className="text-muted-foreground leading-relaxed">
							{external.opportunityNarrative}
						</p>
					)}
					{isHighlyProfitable ? (
						<Badge variant="success">Highly Profitable</Badge>
					) : (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge
										variant="outline"
										className={cn(
											"text-base px-3 py-1.5 cursor-help",
											PROFITABILITY_COLORS[profitabilityBand],
										)}
									>
										{profitabilityBand} Opportunity
									</Badge>
								</TooltipTrigger>
								<TooltipContent>
									<p>Based on market analysis and material characteristics</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</CardContent>
			</Card>

			{/* Footer */}
			<div className="text-xs text-muted-foreground text-right space-y-1">
				<p>Report Version: {external.reportVersion}</p>
				<p>Generated: {new Date(generatedAt).toLocaleDateString()}</p>
			</div>
		</div>
	);
}
