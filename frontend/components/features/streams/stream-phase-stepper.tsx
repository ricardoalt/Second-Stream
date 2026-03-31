import { Check } from "lucide-react";
import { STREAM_WORKSPACE_PHASES } from "@/config/stream-questionnaire";
import { cn } from "@/lib/utils";
import type { StreamPhase } from "./types";

type StreamPhaseStepperProps = {
	activePhase: StreamPhase;
	phaseProgress: Record<StreamPhase, boolean>;
	onPhaseSelect?: (phase: StreamPhase) => void;
};

export function StreamPhaseStepper({
	activePhase,
	phaseProgress,
	onPhaseSelect,
}: StreamPhaseStepperProps) {
	const phases = STREAM_WORKSPACE_PHASES;

	return (
		<nav aria-label="Phase progress" className="px-2 py-3">
			<ol className="flex items-center">
				{phases.map((phaseMeta, index) => {
					const phase = phaseMeta.phase;
					const isCompleted = Boolean(phaseProgress[phase]);
					const isActive = phase === activePhase;
					const isLast = index === phases.length - 1;
					const prevPhase = index > 0 ? phases[index - 1] : undefined;
					const prevCompleted = prevPhase
						? Boolean(phaseProgress[prevPhase.phase])
						: false;

					return (
						<li
							key={phase}
							className={cn("flex items-center", !isLast && "flex-1")}
						>
							{/* Step node */}
							<div className="flex flex-col items-center">
								<button
									type="button"
									onClick={() => onPhaseSelect?.(phase)}
									aria-current={isActive ? "step" : undefined}
									className={cn(
										"relative z-10 inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-all duration-200",
										isCompleted || isActive
											? "size-10 border-2 border-primary bg-primary text-sm text-primary-foreground"
											: "size-8 border-2 border-border bg-background text-xs text-muted-foreground hover:border-primary/40",
										isActive && "shadow-md shadow-primary/25",
									)}
								>
									{isCompleted ? (
										<Check aria-hidden className="size-4 stroke-[3]" />
									) : (
										<span>{phase}</span>
									)}
								</button>
								<span
									className={cn(
										"mt-2 max-w-[100px] text-center text-[0.6rem] font-bold uppercase tracking-[0.08em] leading-tight",
										isCompleted || isActive
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
										isCompleted ? "bg-primary" : "bg-border",
									)}
								/>
							) : null}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
