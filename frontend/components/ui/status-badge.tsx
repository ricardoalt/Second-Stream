import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Semantic Status Badge - Unifies all status indicators across the app
 * Follows Stitch pattern: color = semantic meaning
 *
 * Severity mapping:
 * - critical: Blocked, Failed, Rejected, Overdue, Error
 * - warning: Pending, Missing Info, In Review, Stalled
 * - success: Active, Approved, Complete, Won, Paid
 * - info: Submitted, In Progress, Draft, Scheduled
 * - neutral: Archived, Cancelled, On Hold, Default
 */

const statusBadgeVariants = cva(
	"inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-xs font-medium transition-colors",
	{
		variants: {
			severity: {
				critical: "bg-destructive/15 text-destructive",
				warning: "bg-warning/15 text-warning",
				success: "bg-success/15 text-success",
				info: "bg-primary/15 text-primary",
				neutral: "bg-muted text-muted-foreground",
			},
		},
		defaultVariants: {
			severity: "neutral",
		},
	},
);

export interface StatusBadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof statusBadgeVariants> {
	/** Status value to determine severity and label */
	status: string;
	/** Optional custom label (defaults to status value) */
	label?: string;
}

/**
 * Maps common status values to semantic severity levels
 */
function getSeverityFromStatus(
	status: string,
): VariantProps<typeof statusBadgeVariants>["severity"] {
	const normalized = status.toLowerCase().trim();

	// Critical/Destructive states
	if (
		normalized.includes("blocked") ||
		normalized.includes("failed") ||
		normalized.includes("rejected") ||
		normalized.includes("overdue") ||
		normalized.includes("error") ||
		normalized.includes("critical") ||
		normalized.includes("expired") ||
		normalized.includes("declined")
	) {
		return "critical";
	}

	// Warning states
	if (
		normalized.includes("pending") ||
		normalized.includes("missing") ||
		normalized.includes("review") ||
		normalized.includes("stalled") ||
		normalized.includes("waiting") ||
		normalized.includes("attention") ||
		normalized.includes("negotiation") ||
		normalized.includes("draft")
	) {
		return "warning";
	}

	// Success states
	if (
		normalized.includes("active") ||
		normalized.includes("approved") ||
		normalized.includes("complete") ||
		normalized.includes("won") ||
		normalized.includes("paid") ||
		normalized.includes("accepted") ||
		normalized.includes("ready") ||
		normalized.includes("resolved") ||
		normalized.includes("sent") ||
		normalized.includes("live")
	) {
		return "success";
	}

	// Info/Primary states
	if (
		normalized.includes("submitted") ||
		normalized.includes("progress") ||
		normalized.includes("current") ||
		normalized.includes("scheduled") ||
		normalized.includes("under_review") ||
		normalized.includes("in_review")
	) {
		return "info";
	}

	// Default to neutral for unknown states
	return "neutral";
}

/**
 * Formats a status string for display
 */
function formatStatusLabel(status: string): string {
	// Replace underscores with spaces and capitalize words
	return status
		.replace(/_/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusBadge({
	className,
	severity,
	status,
	label,
	...props
}: StatusBadgeProps) {
	// Determine severity from status if not explicitly provided
	const resolvedSeverity = severity ?? getSeverityFromStatus(status);
	const displayLabel = label ?? formatStatusLabel(status);

	return (
		<div
			className={cn(
				statusBadgeVariants({ severity: resolvedSeverity }),
				className,
			)}
			{...props}
		>
			{displayLabel}
		</div>
	);
}

export { StatusBadge, statusBadgeVariants, getSeverityFromStatus };
