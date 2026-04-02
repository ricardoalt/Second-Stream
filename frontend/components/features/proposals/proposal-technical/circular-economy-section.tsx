import { Recycle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ParsedBusinessOption {
	title: string;
	description: string;
	revenue?: string;
	buyerType?: string;
	requirement?: string;
}

function parseBusinessOption(optionText: string): ParsedBusinessOption {
	const lines = optionText.split("\u2192").map((l) => l.trim());
	const revenueMatch = optionText.match(
		/\$[\d.,]+[\u2013\u2014-]?\$?[\d.,]*k?(\/ton|\/yr)/i,
	);
	const buyerMatch = optionText.match(
		/(?:sell to|partner with|sell|to)\s+([^\u2192(]+?)(?:\s*\u2192|\s*\(|$)/i,
	);
	const buyerType = buyerMatch?.[1]?.trim().replace(/^(the|a)\s+/i, "");
	const requirementMatch = optionText.match(
		/(?:requires?|needs?)\s+([^\u2192]+?)(?:\s*\u2192|$)/i,
	);
	const requirement = requirementMatch?.[1]?.trim();

	const result: ParsedBusinessOption = {
		title: lines[0] || optionText.substring(0, 80),
		description: lines.slice(1).join(" \u2192 ") || optionText,
	};

	if (revenueMatch?.[0]) result.revenue = revenueMatch[0];
	if (buyerType && buyerType.length < 40) result.buyerType = buyerType;
	if (requirement && requirement.length < 40) result.requirement = requirement;

	return result;
}

interface CircularEconomySectionProps {
	options: string[];
}

export function CircularEconomySection({
	options,
}: CircularEconomySectionProps) {
	if (options.length === 0) return null;

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
					<Recycle className="h-6 w-6 text-primary" />
					Circular Economy Business Ideas
				</h3>
				<p className="text-muted-foreground">
					{options.length} pathway{options.length > 1 ? "s" : ""} identified for
					waste valorization
				</p>
			</div>

			{options.map((option, idx) => {
				const parsed = parseBusinessOption(option);

				return (
					<Card
						key={`option-${parsed.title.slice(0, 20)}-${idx}`}
						className="border-l-4 border-l-success hover:shadow-lg transition-shadow duration-300"
					>
						<CardHeader>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-3 flex-1 min-w-0">
									<Badge className="h-8 w-8 flex items-center justify-center text-sm font-bold">
										{idx + 1}
									</Badge>
									<CardTitle className="text-lg leading-tight">
										{parsed.title}
									</CardTitle>
								</div>
								{parsed.revenue && (
									<div className="text-2xl font-bold text-success flex-shrink-0">
										{parsed.revenue}
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							<p className="text-sm text-muted-foreground leading-relaxed">
								{parsed.description}
							</p>
							<div className="flex flex-wrap gap-2">
								{parsed.buyerType && (
									<Badge variant="outline" className="text-xs">
										{parsed.buyerType}
									</Badge>
								)}
								{parsed.requirement && (
									<Badge variant="secondary" className="text-xs">
										{parsed.requirement}
									</Badge>
								)}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
