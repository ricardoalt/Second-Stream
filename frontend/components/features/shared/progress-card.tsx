import { memo } from "react";
import { StatusChip } from "@/components/patterns";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Design System: Industrial Precision & Fluidity
// Progress Card - Built on shadcn Card

interface ProgressCardProps {
	title: string;
	subtitle: string;
	date: string;
	daysOld: number;
	progress: number;
	stage: string;
	statusVariant?: "error" | "warning" | "success" | "info";
	statusLabel: string;
	className?: string;
}

/**
 * Progress Card - Industrial Precision Design System
 *
 * Built on shadcn Card for stream/workflow items.
 *
 * @example
 * <ProgressCard
 *   title="Spent Isopropyl Alcohol"
 *   subtitle="Techtronics Solutions Inc."
 *   date="Oct 20, 2024"
 *   daysOld={4}
 *   progress={45}
 *   stage="In Progress"
 *   statusVariant="info"
 *   statusLabel="Offer: In Negotiation"
 * />
 */
export const ProgressCard = memo(function ProgressCard({
	title,
	subtitle,
	date,
	daysOld,
	progress,
	stage,
	statusVariant = "info",
	statusLabel,
	className,
}: ProgressCardProps) {
	return (
		<Card
			className={cn(
				"rounded-lg border p-4 transition-shadow duration-200 hover:shadow-sm",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-4">
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-foreground">{title}</p>
					<p className="truncate text-xs text-muted-foreground">
						{subtitle}
						<span className="mx-1.5 text-muted-foreground/60">•</span>
						Created {date}
						<span className="mx-1.5 text-muted-foreground/60">•</span>({daysOld}{" "}
						days old)
					</p>
				</div>

				<div className="flex items-center gap-6">
					<div className="flex items-center gap-4">
						<div className="text-right">
							<p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
								{stage}
							</p>
						</div>
						<div className="w-32 space-y-1">
							<div className="flex items-center justify-between text-xs text-muted-foreground">
								<span>{progress}%</span>
							</div>
							<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
									style={{ width: `${progress}%` }}
								/>
							</div>
						</div>
					</div>

					<StatusChip
						status={statusVariant}
						variant="subtle"
						size="sm"
						className="min-w-[140px] justify-center"
					>
						{statusLabel}
					</StatusChip>
				</div>
			</div>
		</Card>
	);
});
