import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OffersSummaryStatCard({
	label,
	value,
	subtitle,
	icon: Icon,
}: {
	label: string;
	value: string;
	subtitle: string;
	icon: LucideIcon;
}) {
	return (
		<Card className="border-0 bg-surface-container-lowest shadow-xs card-lift">
			<CardHeader className="flex-row items-start justify-between gap-3 pb-2">
				<CardTitle className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
					{label}
				</CardTitle>
				<div className="flex size-8 items-center justify-center rounded-lg kpi-icon-gradient">
					<Icon aria-hidden className="size-4" />
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-1 pt-0">
				<p className="font-display text-3xl font-semibold text-foreground">
					{value}
				</p>
				<p className="text-xs text-muted-foreground">{subtitle}</p>
			</CardContent>
		</Card>
	);
}
