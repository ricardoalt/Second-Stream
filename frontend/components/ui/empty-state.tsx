"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateSeverity = "neutral" | "info" | "warning";

interface EmptyStateAction {
	label: string;
	onClick: () => void;
	variant?: "default" | "outline" | "secondary";
}

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: EmptyStateAction | undefined;
	/** Visual severity affects icon background color */
	severity?: EmptyStateSeverity;
	/** Compact mode for inline/table empty states */
	compact?: boolean;
	className?: string;
}

const severityStyles: Record<EmptyStateSeverity, string> = {
	neutral: "bg-muted text-muted-foreground",
	info: "bg-primary/10 text-primary",
	warning: "bg-warning/10 text-warning",
};

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	severity = "neutral",
	compact = false,
	className,
}: EmptyStateProps) {
	return (
		<Card className={cn("border-dashed", className)}>
			<CardContent
				className={cn(
					"flex flex-col items-center justify-center gap-4 text-center",
					compact ? "py-8" : "py-16",
				)}
			>
				<div className={cn("rounded-full p-4", severityStyles[severity])}>
					<Icon className={cn(compact ? "h-6 w-6" : "h-10 w-10")} />
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
					<p className="text-sm text-muted-foreground max-w-sm mx-auto">
						{description}
					</p>
				</div>
				{action && (
					<Button
						onClick={action.onClick}
						variant={action.variant || "default"}
						size={compact ? "sm" : "default"}
						className="mt-2"
					>
						{action.label}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * Table Empty State - Optimized for table views
 */
export function TableEmptyState({
	icon,
	title,
	description,
	action,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: EmptyStateAction | undefined;
}) {
	return (
		<EmptyState
			icon={icon}
			title={title}
			description={description}
			action={action}
			compact
			severity="neutral"
			className="border-0 bg-transparent"
		/>
	);
}

/**
 * Search Empty State - For filtered results
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
	// Lazy import to avoid circular dependency
	const { Search } = require("lucide-react");
	return (
		<EmptyState
			icon={Search}
			title={title}
			description={description}
			action={
				onClear
					? {
							label: "Clear filters",
							onClick: onClear,
							variant: "outline",
						}
					: undefined
			}
			severity="info"
			compact
		/>
	);
}

/**
 * Error Empty State - For error states
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
	// Lazy import to avoid circular dependency
	const { AlertCircle } = require("lucide-react");
	return (
		<EmptyState
			icon={AlertCircle}
			title={title}
			description={description}
			action={
				onRetry
					? {
							label: "Try again",
							onClick: onRetry,
							variant: "default",
						}
					: undefined
			}
			severity="warning"
		/>
	);
}
