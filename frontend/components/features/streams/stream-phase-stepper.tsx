import { Check, Circle, Lock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreamPhase } from "./types";

type StreamPhaseStepperProps = {
	activePhase: StreamPhase;
	blockedPhases?: StreamPhase[];
};

const labels: Record<StreamPhase, string> = {
	1: "Initial screening",
	2: "Commercial & economic",
	3: "Technical feasibility",
	4: "Value discovery",
};

export function StreamPhaseStepper({
	activePhase,
	blockedPhases = [],
}: StreamPhaseStepperProps) {
	const phases: StreamPhase[] = [1, 2, 3, 4];

	return (
		<ol className="grid gap-3 rounded-xl bg-surface-container-low p-3 md:grid-cols-4">
			{phases.map((phase) => {
				const isCompleted = phase < activePhase;
				const isActive = phase === activePhase;
				const isBlocked = blockedPhases.includes(phase);

				return (
					<li
						key={phase}
						className={cn(
							"flex items-center gap-2 rounded-lg px-3 py-2",
							isActive && "bg-surface-container-lowest",
						)}
					>
						<span
							className={cn(
								"inline-flex size-6 items-center justify-center rounded-full",
								isCompleted && "bg-primary text-primary-foreground",
								isActive && "bg-primary/20 text-primary",
								!isCompleted &&
									!isActive &&
									!isBlocked &&
									"bg-muted text-muted-foreground",
								isBlocked && "bg-warning/20 text-warning-foreground",
							)}
						>
							{isCompleted ? (
								<Check aria-hidden className="size-4" />
							) : isBlocked ? (
								<TriangleAlert aria-hidden className="size-4" />
							) : isActive ? (
								<Circle aria-hidden className="size-3 fill-current" />
							) : (
								<Lock aria-hidden className="size-3" />
							)}
						</span>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
								Phase {phase}
							</span>
							<span className="truncate text-sm text-foreground">
								{labels[phase]}
							</span>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
