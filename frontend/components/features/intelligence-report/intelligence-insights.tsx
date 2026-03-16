"use client";

import {
	FlaskConical,
	Leaf,
	type LucideIcon,
	Shield,
	Sparkles,
	Truck,
} from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IntelligenceInsight } from "@/lib/types/intelligence-report";

const ICON_MAP: Record<string, LucideIcon> = {
	Sparkles,
	FlaskConical,
	Shield,
	Truck,
	Leaf,
};

interface IntelligenceInsightsProps {
	insights: IntelligenceInsight[];
}

export function IntelligenceInsights({ insights }: IntelligenceInsightsProps) {
	return (
		<Card>
			<CardHeader className="pb-0">
				<CardTitle className="text-sm">AI Insights</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<Accordion
					type="single"
					collapsible
					defaultValue="executive-summary"
					className="w-full"
				>
					{insights.map((insight) => {
						const Icon = ICON_MAP[insight.iconName] ?? Sparkles;
						return (
							<AccordionItem key={insight.id} value={insight.id}>
								<AccordionTrigger className="px-6 py-4 text-sm font-medium hover:no-underline">
									<span className="flex items-center gap-2.5">
										<Icon
											className="h-4 w-4 shrink-0 text-primary"
											aria-hidden="true"
										/>
										{insight.title}
									</span>
								</AccordionTrigger>
								<AccordionContent className="px-6 pb-5">
									<p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
										{insight.content}
									</p>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
			</CardContent>
		</Card>
	);
}
