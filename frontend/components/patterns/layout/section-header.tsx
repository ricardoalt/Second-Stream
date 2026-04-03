"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeader - Lightweight section heading for content zones
 *
 * Replaces inline `<div><Icon /><h2>` patterns across pages.
 * Used for table headers, content sections, and zone separators.
 *
 * @example
 * <SectionHeader
 *   title="Immediate Action Required"
 *   icon={Zap}
 *   actions={<Button variant="outline" size="sm">View All</Button>}
 * />
 */

interface SectionHeaderProps {
	/** Section title */
	title: string;
	/** Optional subtitle or description */
	subtitle?: string;
	/** Icon from lucide-react */
	icon?: LucideIcon;
	/** Icon color override */
	iconColor?: "primary" | "warning" | "destructive" | "success" | "info" | "muted";
	/** Action buttons or elements */
	actions?: ReactNode;
	/** Additional classes */
	className?: string;
	/** Heading level (renders visually the same, semantically correct) */
	as?: "h2" | "h3" | "h4";
}

const iconColorMap = {
	primary: "text-primary",
	warning: "text-warning",
	destructive: "text-destructive",
	success: "text-success",
	info: "text-info",
	muted: "text-muted-foreground",
};

export function SectionHeader({
	title,
	subtitle,
	icon: Icon,
	iconColor = "primary",
	actions,
	className,
	as: Heading = "h2",
}: SectionHeaderProps) {
	return (
		<div className={cn("flex items-center justify-between gap-4", className)}>
			<div className="flex flex-col gap-0.5">
				<div className="flex items-center gap-2">
					{Icon && (
						<Icon
							className={cn("size-5 shrink-0", iconColorMap[iconColor])}
							aria-hidden
						/>
					)}
					<Heading className="font-display text-xl font-semibold tracking-tight text-foreground">
						{title}
					</Heading>
				</div>
				{subtitle && (
					<p className="text-sm text-muted-foreground">{subtitle}</p>
				)}
			</div>
			{actions && (
				<div className="flex items-center gap-2 shrink-0">{actions}</div>
			)}
		</div>
	);
}
