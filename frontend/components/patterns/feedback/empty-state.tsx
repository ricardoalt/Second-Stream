"use client";

import {
	AlertCircle,
	CheckCircle,
	type LucideIcon,
	Search,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * EmptyState - Standardized empty state component for SecondStream
 *
 * Replaces the existing empty-state.tsx with a cleaner implementation
 * using shadcn Alert component.
 *
 * @example
 * <EmptyState
 *   title="No clients found"
 *   description="Get started by adding your first client."
 *   icon={Users}
 *   action={<Button>Add Client</Button>}
 * />
 */

interface EmptyStateProps {
	/** Title of the empty state */
	title: string;
	/** Description explaining the empty state */
	description?: string;
	/** Icon from lucide-react */
	icon?: LucideIcon;
	/** Variant for different contexts */
	variant?: "default" | "search" | "success" | "error";
	/** Optional action button or element */
	action?: React.ReactNode;
	/** Additional CSS classes */
	className?: string;
}

const variantConfig = {
	default: {
		icon: Search,
		variant: "default" as const,
	},
	search: {
		icon: Search,
		variant: "default" as const,
	},
	success: {
		icon: CheckCircle,
		variant: "default" as const,
	},
	error: {
		icon: AlertCircle,
		variant: "destructive" as const,
	},
};

export function EmptyState({
	title,
	description,
	icon: Icon,
	variant = "default",
	action,
	className,
}: EmptyStateProps) {
	const config = variantConfig[variant];
	const DisplayIcon = Icon || config.icon;

	return (
		<Alert
			variant={config.variant}
			className={cn(
				"flex flex-col items-center justify-center py-12 text-center",
				className,
			)}
		>
			<DisplayIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
			<AlertTitle className="text-lg font-semibold mb-2">{title}</AlertTitle>
			{description && (
				<AlertDescription className="text-muted-foreground max-w-sm mb-4">
					{description}
				</AlertDescription>
			)}
			{action && <div className="mt-2">{action}</div>}
		</Alert>
	);
}
