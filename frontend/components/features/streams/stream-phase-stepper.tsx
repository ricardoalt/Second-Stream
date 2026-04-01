import { Check } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { STREAM_WORKSPACE_PHASES } from "@/config/stream-questionnaire";
import { cn } from "@/lib/utils";
import type { StreamPhase } from "./types";

type StreamPhaseStepperProps = {
	activePhase: StreamPhase;
	phaseProgress: Record<StreamPhase, boolean>;
	phaseCompletionPercent?: Record<StreamPhase, number>;
	onPhaseSelect?: (phase: StreamPhase) => void;
};

export function StreamPhaseStepper({
	activePhase,
	phaseProgress,
	phaseCompletionPercent,
	onPhaseSelect,
}: StreamPhaseStepperProps) {
	const phases = STREAM_WORKSPACE_PHASES;

	return (
		<TooltipProvider>
			<nav aria-label="Phase progress" className="px-2 py-3">
				<ol className="flex items-center">
					{phases.map((phaseMeta, index) => {
						const phase = phaseMeta.phase;
						const isCompleted = Boolean(phaseProgress[phase]);
						const isActive = phase === activePhase;
						const isLast = index === phases.length - 1;
						const completionPercent = phaseCompletionPercent?.[phase] ?? 0;

						return (
							<li
								key={phase}
								className={cn("flex items-center", !isLast && "flex-1")}
							>
								{/* Step node */}
								<div className="flex flex-col items-center">
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												onClick={() => onPhaseSelect?.(phase)}
												aria-current={isActive ? "step" : undefined}
												className={cn(
													"relative z-10 inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-all duration-200",
													isCompleted
														? "size-10 bg-success text-white shadow-sm"
														: isActive
															? "size-10 border-2 border-primary bg-primary text-sm text-primary-foreground shadow-md shadow-primary/25 ring-4 ring-primary/10"
															: "size-8 border-2 border-border bg-background text-xs text-muted-foreground hover:border-primary/40",
												)}
											>
												{isCompleted ? (
													<Check aria-hidden className="size-4 stroke-[3]" />
												) : (
													<span>{phase}</span>
												)}
											</button>
										</TooltipTrigger>
										<TooltipContent>
											{isCompleted
												? "100% complete"
												: `${completionPercent}% complete`}
										</TooltipContent>
									</Tooltip>
									<span
										className={cn(
											"mt-2 max-w-[100px] text-center text-[0.6rem] font-bold uppercase tracking-[0.08em] leading-tight",
											isCompleted
												? "text-success"
												: isActive
													? "text-foreground"
													: "text-muted-foreground",
										)}
									>
										{phaseMeta.label}
									</span>
								</div>

								{/* Connector line */}
								{!isLast ? (
									<div
										className={cn(
											"mx-1 h-0.5 flex-1 rounded-full transition-colors duration-300",
											isCompleted ? "bg-success/60" : "bg-border/50",
										)}
									/>
								) : null}
							</li>
						);
					})}
				</ol>
			</nav>
		</TooltipProvider>
	);
}
