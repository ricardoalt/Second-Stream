"use client";

import {
	AlertCircle,
	ArrowRight,
	Car,
	DollarSign,
	Leaf,
	TreeDeciduous,
	TrendingDown,
	Zap,
} from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	co2ToCars,
	co2ToCoalKwh,
	co2ToTrees,
	extractCO2Tons,
	formatNumber,
} from "./metrics-helpers";
import type { Proposal } from "./types";

interface ProposalEconomicsProps {
	proposal: Proposal;
}

// Helper component for assumption badges (DRY)
function AssumptionBadge() {
	return (
		<Badge
			variant="outline"
			className="text-xs border-warning/50 text-warning bg-state-warning-bg"
		>
			<AlertCircle className="h-3 w-3 mr-1" />
			Assumption
		</Badge>
	);
}

// Helper to parse revenue strings like "$8.8k/yr" or "$43.8k/yr"
function parseRevenue(
	revenueStr: string,
): { value: string; detail: string } | null {
	const match = revenueStr.match(/^([$\d.,k]+\/yr)/i);
	if (match?.[1]) {
		return {
			value: match[1],
			detail: revenueStr.replace(match[1], "").trim(),
		};
	}
	return { value: revenueStr, detail: "" };
}

export function ProposalEconomics({ proposal }: ProposalEconomicsProps) {
	const report = proposal.aiMetadata.proposal;
	const businessOpp = report.businessOpportunity;
	const lca = report.lca;

	if (!businessOpp || !lca) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="text-3xl font-bold mb-2">
						Economics & Environmental Impact
					</h2>
					<p className="text-muted-foreground">
						Financial analysis and environmental benefits
					</p>
				</div>
				<Card>
					<CardContent className="pt-6">
						<p className="text-sm text-muted-foreground">
							No economic data available
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Extract nested data with defaults for type safety
	const pr = businessOpp.potentialRevenue;
	const annualPotential = pr?.annualPotential ?? [];
	const perKg = pr?.perKg ?? [];
	const marketRate = pr?.marketRate ?? [];
	const revenueNotes = pr?.notes ?? [];

	const lr = businessOpp.landfillReduction;
	const landfillBefore = lr?.before ?? [];
	const landfillAfter = lr?.after ?? [];
	const landfillSavings = lr?.annualSavings ?? [];

	const wh = businessOpp.wasteHandlingCostSavings;
	const wasteBefore = wh?.before ?? [];
	const wasteAfter = wh?.after ?? [];
	const wasteSavings = wh?.annualSavings ?? [];

	const co2 = lca.co2Reduction;
	const co2Tons = co2?.tons ?? [];
	const co2Percent = co2?.percent ?? [];
	const co2Method = co2?.method ?? [];

	// Parse annual potential for visual range
	const annualPotentialItems = annualPotential;
	const lowCase = annualPotentialItems.find((item: string) =>
		item.toLowerCase().includes("low"),
	);
	const highCase = annualPotentialItems.find((item: string) =>
		item.toLowerCase().includes("high"),
	);

	const lowParsed = lowCase ? parseRevenue(lowCase) : null;
	const highParsed = highCase ? parseRevenue(highCase) : null;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold mb-2">
					Financial & Environmental Impact
				</h2>
				<p className="text-muted-foreground">
					Revenue potential, cost savings, and environmental benefits
				</p>
			</div>

			{/* DSR REVENUE POTENTIAL - VISUAL RANGE */}
			<Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="h-6 w-6 text-primary" />
						DSR Revenue Potential
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						Projected annual revenue from material resale
					</p>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* VISUAL REVENUE RANGE */}
					{lowParsed && highParsed ? (
						<div className="space-y-4">
							{/* Assumption Badge for Revenue */}
							<div className="flex items-center gap-2">
								<AssumptionBadge />
								<span className="text-xs text-muted-foreground">
									Based on volume and market rate estimates
								</span>
							</div>
							{/* Range Bar */}
							<div className="relative p-6 rounded-xl bg-gradient-to-r from-warning/10 via-success/10 to-success/15 border border-primary/20">
								<div className="flex items-center justify-between">
									{/* Low Case */}
									<div className="text-center flex-1">
										<div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
											Conservative
										</div>
										<div className="text-4xl font-bold text-warning">
											{lowParsed.value}
										</div>
										{lowParsed.detail && (
											<div className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
												{lowParsed.detail}
											</div>
										)}
									</div>

									{/* Arrow */}
									<ArrowRight className="h-8 w-8 text-muted-foreground/50 flex-shrink-0 mx-4" />

									{/* High Case */}
									<div className="text-center flex-1">
										<div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
											Optimistic
										</div>
										<div className="text-4xl font-bold text-success">
											{highParsed.value}
										</div>
										{highParsed.detail && (
											<div className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
												{highParsed.detail}
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Per-unit pricing */}
							{perKg.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{perKg.map((price: string) => (
										<Badge key={price} variant="outline" className="text-sm">
											{price}
										</Badge>
									))}
								</div>
							)}
						</div>
					) : (
						/* Fallback if no low/high case */
						<div className="space-y-2">
							{annualPotentialItems.map((item: string) => (
								<div key={item} className="text-2xl font-bold text-primary">
									{item}
								</div>
							))}
						</div>
					)}

					{/* Market Rates & Notes - COLLAPSIBLE */}
					<Accordion type="single" collapsible className="w-full">
						{marketRate.length > 0 && (
							<AccordionItem value="market-rates" className="border-none">
								<AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
									Market Rate Details
								</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-2 pt-2">
										{marketRate.map((rate: string) => (
											<p
												key={rate}
												className="text-sm text-muted-foreground leading-relaxed"
											>
												{rate}
											</p>
										))}
									</div>
								</AccordionContent>
							</AccordionItem>
						)}

						{revenueNotes.length > 0 && (
							<AccordionItem value="notes" className="border-none">
								<AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
									Pricing Assumptions
								</AccordionTrigger>
								<AccordionContent>
									<ul className="space-y-1 pt-2">
										{revenueNotes.map((note: string) => (
											<li key={note} className="text-sm text-muted-foreground">
												• {note}
											</li>
										))}
									</ul>
								</AccordionContent>
							</AccordionItem>
						)}
					</Accordion>
				</CardContent>
			</Card>

			<Separator />

			{/* LANDFILL REDUCTION - 3 COLUMN GRID */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<TrendingDown className="h-5 w-5 text-success" />
								Landfill Reduction
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Waste diversion impact
							</p>
						</div>
						<AssumptionBadge />
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Current Baseline
							</p>
							{landfillBefore.map((item: string) => (
								<p key={item} className="text-lg font-semibold">
									{item}
								</p>
							))}
						</div>

						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-success font-medium">
								After DSR Acquisition
							</p>
							{landfillAfter.map((item: string) => (
								<p key={item} className="text-lg font-semibold text-success">
									{item}
								</p>
							))}
						</div>

						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Annual Savings
							</p>
							{landfillSavings.map((item: string) => (
								<Badge key={item} variant="default" className="mb-1 text-sm">
									{item}
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* GENERATOR COST SAVINGS */}
			<Card className="border-info/25">
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="h-5 w-5 text-info" />
								Generator Cost Savings
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Negotiation leverage - what the waste generator saves
							</p>
						</div>
						<AssumptionBadge />
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Current Costs
							</p>
							{wasteBefore.map((item: string) => (
								<p key={item} className="text-lg font-semibold">
									{item}
								</p>
							))}
						</div>

						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-info font-medium">
								After DSR
							</p>
							{wasteAfter.map((item: string) => (
								<p key={item} className="text-lg font-semibold text-info">
									{item}
								</p>
							))}
						</div>

						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Annual Savings
							</p>
							{wasteSavings.map((item: string) => (
								<Badge key={item} variant="secondary" className="mb-1 text-sm">
									{item}
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			<Separator />

			{/* CO2 REDUCTION - BIG NUMBERS */}
			<Card className="border-success/25 bg-state-success-bg">
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Leaf className="h-6 w-6 text-success" />
								CO₂ Emissions Avoided
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Environmental impact calculated using EPA WaRM methodology
							</p>
						</div>
						<AssumptionBadge />
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* BIG CO2 NUMBER */}
					{co2Tons.length > 0 && (
						<div className="text-center p-6 rounded-xl bg-success/10">
							<div className="text-sm uppercase tracking-wide text-success mb-2">
								Annual CO₂ Avoided
							</div>
							{co2Tons.map((item: string) => (
								<div key={item} className="text-5xl font-bold text-success">
									{item}
								</div>
							))}
							{co2Percent.length > 0 && (
								<div className="mt-4 flex justify-center gap-2">
									{co2Percent.map((pct: string) => (
										<Badge
											key={pct}
											variant="success"
											className="text-base px-4 py-1"
										>
											{pct}
										</Badge>
									))}
								</div>
							)}
						</div>
					)}

					{/* CO₂ EQUIVALENTS - STORYTELLING */}
					{(() => {
						const co2Tons = extractCO2Tons(report);
						if (!co2Tons) return null;

						const cars = co2ToCars(co2Tons);
						const trees = co2ToTrees(co2Tons);
						const kwhCoal = co2ToCoalKwh(co2Tons);

						return (
							<div className="space-y-4">
								<div className="text-center">
									<p className="text-sm text-muted-foreground font-medium">
										That's equivalent to:
									</p>
								</div>

								{/* Equivalents Grid */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									{/* Cars off the road */}
									<div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-card border border-success/25">
										<Car className="h-8 w-8 text-success" />
										<div className="text-center">
											<div className="text-3xl font-bold text-success">
												{formatNumber(cars)}
											</div>
											<p className="text-xs text-muted-foreground mt-1">
												cars off the road
											</p>
										</div>
									</div>

									{/* Trees planted */}
									<div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-card border border-success/25">
										<TreeDeciduous className="h-8 w-8 text-success" />
										<div className="text-center">
											<div className="text-3xl font-bold text-success">
												{formatNumber(trees)}
											</div>
											<p className="text-xs text-muted-foreground mt-1">
												trees planted
											</p>
										</div>
									</div>

									{/* Coal power avoided */}
									<div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-card border border-success/25">
										<Zap className="h-8 w-8 text-success" />
										<div className="text-center">
											<div className="text-3xl font-bold text-success">
												{formatNumber(kwhCoal)}
											</div>
											<p className="text-xs text-muted-foreground mt-1">
												kWh coal power
											</p>
										</div>
									</div>
								</div>

								{/* EPA source note */}
								<p className="text-xs text-center text-muted-foreground">
									Based on EPA standard conversion factors
								</p>
							</div>
						);
					})()}

					{/* Methodology - Collapsible */}
					{co2Method.length > 0 && (
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="methodology" className="border-none">
								<AccordionTrigger className="text-sm font-medium hover:no-underline">
									EPA WaRM Calculation Methodology
								</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-2 pt-2">
										{co2Method.map((method: string) => (
											<p
												key={method}
												className="text-sm text-muted-foreground leading-relaxed"
											>
												{method}
											</p>
										))}
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					)}
				</CardContent>
			</Card>

			{/* Environmental Value Proposition */}
			{lca.environmentalNotes && (
				<Card className="border-info/25 bg-info/5">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Leaf className="h-5 w-5 text-info" />
							Environmental Value Proposition
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Sustainability pitch for buyers and generators
						</p>
					</CardHeader>
					<CardContent>
						<p className="text-base leading-relaxed font-medium">
							{lca.environmentalNotes}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Business Risks */}
			{businessOpp.risks && businessOpp.risks.length > 0 && (
				<Card className="border-warning/25 bg-state-warning-bg">
					<CardHeader>
						<div className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-warning" />
							<CardTitle className="text-warning-foreground">
								Business Risks to Monitor
							</CardTitle>
						</div>
						<p className="text-sm text-warning">
							Key risks DSR should evaluate before committing
						</p>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{businessOpp.risks.map((risk: string, index: number) => (
								<div
									key={risk}
									className="flex items-start gap-3 rounded-lg border border-warning/25 bg-card p-4"
								>
									<div className="flex-shrink-0 w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center">
										<span className="text-xs font-bold text-warning">
											{index + 1}
										</span>
									</div>
									<span className="text-sm text-warning-foreground leading-relaxed">
										{risk}
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
