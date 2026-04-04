import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularGauge } from "@/components/ui/circular-gauge";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EnvironmentalImpact {
	currentSituation?: string;
	benefitIfDiverted?: string;
	esgStory?: string;
}

interface ResourceConsiderationsCardProps {
	envImpact?: EnvironmentalImpact | undefined;
	hazardLevel?: string | undefined;
	ppeRequirements: string[];
	specificHazards: string[];
	storageRequirements: string[];
	degradationRisks: string[];
	qualityPriceImpact: string[];
	regulatoryNotes: string[];
	buyerTypes: string[];
	typicalRequirements: string[];
	pricingFactors: string[];
}

function getHazardVariant(
	level?: string,
): "destructive" | "secondary" | "outline" {
	if (level === "High") return "destructive";
	if (level === "Moderate") return "secondary";
	return "outline";
}

function ListSection({
	title,
	items,
	className,
}: {
	title: string;
	items: string[];
	className?: string;
}) {
	if (items.length === 0) return null;
	return (
		<div>
			<p className="text-sm font-medium mb-2">{title}</p>
			<ul className="space-y-1">
				{items.map((item) => (
					<li
						key={item}
						className={className ?? "text-sm text-muted-foreground"}
					>
						* {item}
					</li>
				))}
			</ul>
		</div>
	);
}

export function ResourceConsiderationsCard({
	envImpact,
	hazardLevel,
	ppeRequirements,
	specificHazards,
	storageRequirements,
	degradationRisks,
	qualityPriceImpact,
	regulatoryNotes,
	buyerTypes,
	typicalRequirements,
	pricingFactors,
}: ResourceConsiderationsCardProps) {
	return (
		<Card className="border-success/25 bg-state-success-bg">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Package className="h-6 w-6 text-success" />
					Resource Considerations
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Environmental impact, safety requirements, storage guidance, and
					market intelligence
				</p>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="environmental" className="w-full">
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger value="environmental">Environmental</TabsTrigger>
						<TabsTrigger value="safety">Safety</TabsTrigger>
						<TabsTrigger value="storage">Storage</TabsTrigger>
						<TabsTrigger value="market">Market</TabsTrigger>
					</TabsList>

					{/* Environmental Impact Tab */}
					<TabsContent value="environmental" className="space-y-4 mt-4">
						<div className="flex flex-col md:flex-row items-start gap-6">
							<div className="flex-shrink-0">
								<CircularGauge
									value={85}
									size="lg"
									color="var(--color-success)"
									label="CO2 Avoided"
								/>
							</div>
							<div className="flex-1 space-y-4 w-full">
								<div>
									<p className="text-sm font-medium mb-2">Current Situation</p>
									<p className="text-sm text-muted-foreground">
										{envImpact?.currentSituation}
									</p>
								</div>
								<div>
									<p className="text-sm font-medium mb-2">
										Benefit If Diverted
									</p>
									<p className="text-sm text-success">
										{envImpact?.benefitIfDiverted}
									</p>
								</div>
							</div>
						</div>
						<div className="p-3 rounded-lg bg-success/10">
							<p className="text-sm font-medium mb-1">ESG Story</p>
							<p className="text-sm text-muted-foreground italic">
								{envImpact?.esgStory}
							</p>
						</div>
					</TabsContent>

					{/* Material Safety Tab */}
					<TabsContent value="safety" className="space-y-4 mt-4">
						<div className="flex items-center gap-2">
							<Badge variant={getHazardVariant(hazardLevel)}>
								{hazardLevel} Hazard Level
							</Badge>
							<span className="text-xs text-muted-foreground">
								{ppeRequirements.length} PPE items required
							</span>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<ListSection title="Specific Hazards" items={specificHazards} />
							<ListSection title="PPE Requirements" items={ppeRequirements} />
						</div>
						<ListSection
							title="Regulatory Notes"
							items={regulatoryNotes}
							className="text-sm text-warning"
						/>
					</TabsContent>

					{/* Storage & Handling Tab */}
					<TabsContent value="storage" className="space-y-4 mt-4">
						<ListSection
							title="Storage Requirements"
							items={storageRequirements}
						/>
						<ListSection
							title="Degradation Risks"
							items={degradationRisks}
							className="text-sm text-warning"
						/>
						<ListSection
							title="Quality vs Price Impact"
							items={qualityPriceImpact}
						/>
					</TabsContent>

					{/* Market Intelligence Tab */}
					<TabsContent value="market" className="space-y-4 mt-4">
						<div>
							<p className="text-sm font-medium mb-2">Buyer Types</p>
							<div className="flex flex-wrap gap-2">
								{buyerTypes.map((type) => (
									<HoverCard key={type}>
										<HoverCardTrigger asChild>
											<Badge variant="secondary" className="cursor-help">
												{type}
											</Badge>
										</HoverCardTrigger>
										<HoverCardContent className="w-80">
											<div className="space-y-2">
												<h4 className="text-sm font-semibold">{type}</h4>
												{typicalRequirements.length > 0 && (
													<div>
														<p className="text-xs font-medium text-muted-foreground mb-1">
															Typical Requirements:
														</p>
														<ul className="text-xs text-muted-foreground space-y-0.5">
															{typicalRequirements.slice(0, 3).map((req) => (
																<li key={req}>* {req}</li>
															))}
														</ul>
													</div>
												)}
												{pricingFactors.length > 0 && (
													<div>
														<p className="text-xs font-medium text-muted-foreground mb-1">
															Pricing Factors:
														</p>
														<ul className="text-xs text-muted-foreground space-y-0.5">
															{pricingFactors.slice(0, 3).map((factor) => (
																<li key={factor}>* {factor}</li>
															))}
														</ul>
													</div>
												)}
											</div>
										</HoverCardContent>
									</HoverCard>
								))}
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<ListSection
								title="Typical Requirements"
								items={typicalRequirements}
							/>
							<ListSection title="Pricing Factors" items={pricingFactors} />
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
