"use client";

import {
	AlertCircle,
	CheckCircle,
	type LucideIcon,
	Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * EmptyState - Standardized empty/blank state for SecondStream
 *
 * Unified from ui/empty-state.tsx and patterns/feedback/empty-state.tsx.
 * Supports multiple visual variants with consistent styling.
 *
 * @example
 * <EmptyState
 *   icon={Users}
 *   title="No clients found"
 *   description="Get started by adding your first client."
 *   action={<Button>Add Client</Button>}
 * />
 */

type EmptyStateSeverity = "neutral" | "info" | "warning" | "success" | "error";

interface EmptyStateProps {
	/** Title text */
	title: string;
	/** Description text */
	description?: string;
	/** Icon from lucide-react */
	icon?: LucideIcon;
	/** Visual styling based on context */
	severity?: EmptyStateSeverity;
	/** Variant alias (maps to severity for backward compat) */
	variant?: "default" | "search" | "success" | "error";
	/** Compact mode for inline/table empty states */
	compact?: boolean;
	/** Action button or element (ReactNode for flexibility) */
	action?: React.ReactNode;
	/** Additional CSS classes */
	className?: string;
}

const severityStyles: Record<EmptyStateSeverity, string> = {
	neutral: "bg-muted text-muted-foreground",
	info: "bg-primary/10 text-primary",
	warning: "bg-warning/10 text-warning",
	success: "bg-success/10 text-success",
	error: "bg-destructive/10 text-destructive",
};

const defaultIcons: Record<EmptyStateSeverity, LucideIcon> = {
	neutral: Search,
	info: Search,
	warning: AlertCircle,
	success: CheckCircle,
	error: AlertCircle,
};

// Map legacy variant to severity
const variantToSeverity: Record<string, EmptyStateSeverity> = {
	default: "neutral",
	search: "info",
	success: "success",
	error: "error",
};

export function EmptyState({
	title,
	description,
	icon,
	severity,
	variant,
	compact = false,
	action,
	className,
}: EmptyStateProps) {
	const resolvedSeverity =
		severity ?? variantToSeverity[variant ?? "default"] ?? "neutral";
	const DisplayIcon = icon ?? defaultIcons[resolvedSeverity];

	return (
		<Card className={cn("border-dashed", className)}>
			<CardContent
				className={cn(
					"flex flex-col items-center justify-center gap-4 text-center",
					compact ? "py-8" : "py-16",
				)}
			>
				<div
					className={cn("rounded-full p-4", severityStyles[resolvedSeverity])}
				>
					<DisplayIcon
						className={cn(compact ? "h-6 w-6" : "h-10 w-10")}
						aria-hidden
					/>
				</div>
				<div className="space-y-2">
					<h3
						className={cn(
							"font-semibold text-foreground",
							compact ? "text-base" : "text-lg",
						)}
					>
						{title}
					</h3>
					{description && (
						<p className="text-sm text-muted-foreground max-w-sm mx-auto">
							{description}
						</p>
					)}
				</div>
				{action && <div className="mt-2">{action}</div>}
			</CardContent>
		</Card>
	);
}

/**
 * TableEmptyState - Optimized for table views
 */
export function TableEmptyState({
	icon,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<EmptyState
			icon={icon}
			title={title}
			description={description}
			compact
			severity="neutral"
			className="border-0 bg-transparent"
		/>
	);
}

/**
 * SearchEmptyState - For filtered results
 */
export function SearchEmptyState({
	title = "No results found",
	description = "Try adjusting your search or filters.",
	onClear,
}: {
	title?: string;
	description?: string;
	onClear?: () => void;
}) {
	return (
		<EmptyState
			icon={Search}
			title={title}
			description={description}
			action={
				onClear ? (
					<Button variant="outline" size="sm" onClick={onClear}>
						Clear filters
					</Button>
				) : undefined
			}
			severity="info"
			compact
		/>
	);
}

/**
 * ErrorEmptyState - For error states
 */
export function ErrorEmptyState({
	title = "Something went wrong",
	description = "We couldn't load the data. Please try again.",
	onRetry,
}: {
	title?: string;
	description?: string;
	onRetry?: () => void;
}) {
	return (
		<EmptyState
			icon={AlertCircle}
			title={title}
			description={description}
			action={
				onRetry ? (
					<Button variant="default" size="sm" onClick={onRetry}>
						Try again
					</Button>
				) : undefined
			}
			severity="warning"
		/>
	);
}
