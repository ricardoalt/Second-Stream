import { Check, Circle } from "lucide-react";
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
		<ol className="grid gap-3 rounded-xl bg-surface-container-low p-3 shadow-xs md:grid-cols-4">
			{phases.map((phaseMeta) => {
				const phase = phaseMeta.phase;
				const isCompleted = Boolean(phaseProgress[phase]);
				const isActive = phase === activePhase;

				return (
					<li
						key={phase}
						className={cn(
							"rounded-lg",
							isActive && "bg-surface-container-lowest",
						)}
					>
						<button
							type="button"
							onClick={() => onPhaseSelect?.(phase)}
							className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-container-lowest/60"
						>
							<span
								className={cn(
									"inline-flex size-6 shrink-0 items-center justify-center rounded-full",
									isCompleted
										? "bg-primary text-primary-foreground"
										: isActive
											? "bg-primary/20 text-primary"
											: "bg-muted text-muted-foreground",
								)}
							>
								{isCompleted ? (
									<Check aria-hidden className="size-4" />
								) : (
									<Circle aria-hidden className="size-3 fill-current" />
								)}
							</span>
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Phase {phase}
								</span>
								<span className="truncate text-sm text-foreground">
									{phaseMeta.label}
								</span>
							</div>
						</button>
					</li>
				);
			})}
		</ol>
	);
}
