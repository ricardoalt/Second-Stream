import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Design System: Industrial Precision & Fluidity
// Status Badge Variants - Built on shadcn Badge

type StatusVariant =
	| "critical"
	| "warning"
	| "success"
	| "info"
	| "neutral"
	| "pipeline";

interface StatusBadgeProps {
	variant: StatusVariant;
	children: React.ReactNode;
	days?: number | undefined;
	className?: string | undefined;
}

/**
 * Status Badge - Industrial Precision Design System
 *
 * Built on shadcn Badge with design system colors.
 * Pill-shaped (rounded-full) for contrast with md corners.
 *
 * @example
 * <StatusBadge variant="critical" days={4}>Missing SDS</StatusBadge>
 * <StatusBadge variant="warning" days={28}>Offer Stalled</StatusBadge>
 * <StatusBadge variant="success">On Track</StatusBadge>
 */
export const StatusBadge = memo(function StatusBadge({
	variant,
	children,
	days,
	className,
}: StatusBadgeProps) {
	const displayText =
		days !== undefined ? `${children} (${days} days)` : children;

	// Tailwind color mappings consistent with shadcn
	const variantStyles: Record<StatusVariant, string> = {
		critical:
			"bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
		warning:
			"bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
		success:
			"bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
		info: "bg-cyan-100 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400",
		neutral:
			"bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400",
		pipeline:
			"bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
	};

	return (
		<Badge
			className={cn(
				"rounded-full border-0 px-3 py-1 text-xs font-medium",
				variantStyles[variant],
				className,
			)}
		>
			{displayText}
		</Badge>
	);
});

// Convenience exports
export const CriticalBadge = memo(function CriticalBadge({
	children,
	days,
	className,
}: Omit<StatusBadgeProps, "variant">) {
	return (
		<StatusBadge variant="critical" days={days} className={className}>
			{children}
		</StatusBadge>
	);
});

export const WarningBadge = memo(function WarningBadge({
	children,
	days,
	className,
}: Omit<StatusBadgeProps, "variant">) {
	return (
		<StatusBadge variant="warning" days={days} className={className}>
			{children}
		</StatusBadge>
	);
});

export const SuccessBadge = memo(function SuccessBadge({
	children,
	className,
}: Omit<StatusBadgeProps, "variant" | "days">) {
	return (
		<StatusBadge variant="success" className={className}>
			{children}
		</StatusBadge>
	);
});

export const InfoBadge = memo(function InfoBadge({
	children,
	className,
}: Omit<StatusBadgeProps, "variant" | "days">) {
	return (
		<StatusBadge variant="info" className={className}>
			{children}
		</StatusBadge>
	);
});

export const PipelineBadge = memo(function PipelineBadge({
	children,
	className,
}: Omit<StatusBadgeProps, "variant" | "days">) {
	return (
		<StatusBadge variant="pipeline" className={className}>
			{children}
		</StatusBadge>
	);
});
