import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Design System: Industrial Precision & Fluidity
// Dashboard Section - Container for dashboard widgets

interface DashboardSectionProps {
	children: React.ReactNode;
	title: string;
	badge?: {
		text: string;
		variant?: "live" | "default";
	};
	action?: React.ReactNode;
	className?: string;
	contentClassName?: string;
	variant?: "default" | "highlighted";
}

/**
 * Dashboard Section - Industrial Precision Design System
 *
 * Main container for dashboard sections with:
 * - Optional background tint (surface_container_low: #f0f9ff)
 * - Header with title, badge, and action
 * - Consistent padding and spacing
 *
 * Variants:
 * - default: White background for Team Performance style
 * - highlighted: Blue-tinted background (#f0f9ff) for Stream Lifecycle Summary style
 *
 * @example
 * <DashboardSection
 *   title="Stream Lifecycle Summary"
 *   badge={{ text: "Live Flow Tracking", variant: "live" }}
 *   variant="highlighted"
 * >
 *   <KpiGrid>...</KpiGrid>
 * </DashboardSection>
 */
export const DashboardSection = memo(function DashboardSection({
	children,
	title,
	badge,
	action,
	className,
	contentClassName,
	variant = "default",
}: DashboardSectionProps) {
	const isHighlighted = variant === "highlighted";

	return (
		<section
			className={cn(
				"rounded-xl",
				isHighlighted ? "bg-cyan-50/50 dark:bg-cyan-950/20" : "bg-transparent",
				isHighlighted ? "p-6 lg:p-8" : "",
				className,
			)}
		>
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-xl font-semibold tracking-tight text-foreground">
					{title}
				</h2>
				<div className="flex items-center gap-3">
					{badge && (
						<Badge
							variant="outline"
							className={cn(
								"flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
								"border-border bg-background text-muted-foreground",
							)}
						>
							{badge.variant === "live" && (
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
							)}
							{badge.text}
						</Badge>
					)}
					{action}
				</div>
			</div>

			{/* Content */}
			<div className={contentClassName}>{children}</div>
		</section>
	);
});

// Specialized grid for KPI cards
interface KpiGridProps {
	children: React.ReactNode;
	className?: string;
}

export const KpiGrid = memo(function KpiGrid({
	children,
	className,
}: KpiGridProps) {
	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-4",
				"sm:grid-cols-2",
				"xl:grid-cols-4",
				className,
			)}
		>
			{children}
		</div>
	);
});
