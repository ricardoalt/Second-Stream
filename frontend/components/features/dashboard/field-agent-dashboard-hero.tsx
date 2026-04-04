import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { DashboardInsightCard } from "./dashboard-insight-card";
import type {
	DashboardInsight,
} from "./field-agent-dashboard.types";

export function FieldAgentDashboardHero({
	insights,
}: {
	insights: DashboardInsight[];
}) {
	return (
		<section className="space-y-4">
			<Card className="overflow-hidden border-border/40 bg-surface-container-low shadow-sm rounded-[2rem]">
				<CardContent className="p-0">
					<div className="grid xl:grid-cols-[1fr_380px]">
						{/* Left column: Progress Placeholder */}
						<div className="p-10 flex flex-col justify-center items-center relative min-h-[320px]">
							<div className="absolute top-8 text-center w-full flex justify-center">
								<div className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium text-muted-foreground">
									Coming Soon
								</div>
							</div>
							
							<div className="flex items-center gap-12 mt-8 opacity-60 grayscale transition-opacity hover:opacity-100">
								{/* Circular Progress Placeholder */}
								<div className="relative">
									<svg className="size-40 -rotate-90 transform" aria-label="Progress preview">
										<title>Progress preview</title>
										<circle
											className="text-primary/10"
											strokeWidth="12"
											stroke="currentColor"
											fill="transparent"
											r="70"
											cx="80"
											cy="80"
										/>
										<circle
											className="text-primary/30"
											strokeWidth="12"
											strokeDasharray={440}
											strokeDashoffset={440 - (440 * 30) / 100}
											strokeLinecap="round"
											stroke="currentColor"
											fill="transparent"
											r="70"
											cx="80"
											cy="80"
										/>
									</svg>
									<div className="absolute inset-0 flex flex-col items-center justify-center">
										<span className="text-4xl font-semibold text-muted-foreground">
											--
										</span>
									</div>
								</div>

								{/* Stats Placeholder */}
								<div className="space-y-8">
									<div>
										<h2 className="text-3xl font-semibold tracking-tight text-foreground">
											Monthly Streams<br/>Progress
										</h2>
										<p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
											Progress metrics will appear here once admin-defined goals are enabled.
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Right column: AI Insights */}
						<div className="border-l border-border/40 p-6 xl:p-8 bg-surface-container-lowest/50">
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-2">
									<Sparkles className="size-4 text-foreground" aria-hidden />
									<h2 className="text-base font-semibold text-foreground">AI Insights</h2>
								</div>
								<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
									LIVE UPDATES
								</span>
							</div>
							<div className="space-y-3">
								{insights.map((insight) => (
									<DashboardInsightCard key={insight.id} insight={insight} />
								))}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</section>
	);
}
