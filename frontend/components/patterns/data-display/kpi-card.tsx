"use client";

import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * KpiCard - Standardized KPI Card for SecondStream
 *
 * Replaces all variations of metric cards across the platform:
 * - metric-card.tsx
 * - admin-stats-card.tsx
 * - offers-summary-stat-card.tsx
 * - client-summary-stat-card.tsx
 *
 * @example
 * <KpiCard
 *   title="Total Revenue"
 *   value="$124,500"
 *   change={{ value: "+12.5%", type: "positive" }}
 *   icon={DollarSign}
 * />
 */

interface KpiCardProps {
	/** Card title (legacy: use label) */
	title?: string;
	/** Alternative to title (simpler naming) */
	label?: string;
	/** Main value to display */
	value: string | number | null;
	/** Optional subtitle or context */
	subtitle?: string;
	/** Alternative to subtitle */
	subValue?: string;
	/** Trend/change indicator */
	change?: {
		value: string;
		type: "positive" | "negative" | "neutral";
	};
	/** Trend for admin views (with isPositive flag) */
	trend?: {
		value: number;
		isPositive: boolean;
	};
	/** Badge text (simple status indicator) */
	badge?: string;
	/** Badge variant type */
	badgeType?: "success" | "destructive" | "warning" | "primary" | "neutral";
	/** Icon from lucide-react */
	icon?: LucideIcon;
	/** Visual variant */
	variant?:
		| "default"
		| "accent"
		| "success"
		| "warning"
		| "destructive"
		| "muted";
	/** Additional classes */
	className?: string;
	/** Loading state */
	loading?: boolean;
	/** Highlight value as primary color */
	isPrimary?: boolean;
	/** Show action indicator arrow */
	hasAction?: boolean;
}

const variantStyles = {
	default: "bg-card border-border/60 shadow-sm hover:shadow-md transition-all duration-200",
	accent: "bg-primary/5 border-primary/30 shadow-sm hover:shadow-md transition-all duration-200",
	success: "bg-success/5 border-success/30 shadow-sm hover:shadow-md transition-all duration-200",
	warning: "bg-warning/5 border-warning/30 shadow-sm hover:shadow-md transition-all duration-200",
	destructive: "bg-destructive/5 border-destructive/30 shadow-sm hover:shadow-md transition-all duration-200",
	muted: "bg-muted/50 border-muted-foreground/20 shadow-sm hover:shadow-md transition-all duration-200",
};

const changeVariantStyles = {
	positive: "bg-success/10 text-success",
	negative: "bg-destructive/10 text-destructive",
	neutral: "bg-muted text-muted-foreground",
};

export function KpiCard({
	title,
	label,
	value,
	subtitle,
	subValue,
	change,
	trend,
	badge,
	badgeType = "neutral",
	icon: Icon,
	variant = "default",
	className,
	loading = false,
	isPrimary = false,
	hasAction = false,
}: KpiCardProps) {
	// Support both label (simple) and title (legacy) props
	const displayTitle = label ?? title ?? "Untitled";

	// Badge variant mapping to Badge component variants
	const badgeVariantMap = {
		success: "success-subtle" as const,
		destructive: "destructive-subtle" as const,
		warning: "warning-subtle" as const,
		primary: "primary-subtle" as const,
		neutral: "neutral-subtle" as const,
	};

	if (loading) {
		return (
			<Card className={cn("relative overflow-hidden border-border/60 shadow-sm", variantStyles[variant], className)}>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
					<div className="h-3 w-24 animate-pulse rounded bg-muted" />
					{Icon && <div className="h-4 w-4 animate-pulse rounded bg-muted" />}
				</CardHeader>
				<CardContent>
					<div className="h-10 w-32 animate-pulse rounded bg-muted" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={cn("relative overflow-hidden", variantStyles[variant], className)}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
				<CardTitle className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
					{displayTitle}
				</CardTitle>
				{Icon && (
					<div
						className={cn(
							"rounded-md p-1.5",
							variant === "muted"
								? "text-muted-foreground"
								: "text-primary",
							)}
					>
						<Icon className="h-4 w-4" />
					</div>
				)}
			</CardHeader>
			<CardContent>
				<div className="flex items-baseline gap-3">
					{value === null || value === undefined ? (
						<span className="font-display text-4xl font-bold tracking-tighter text-muted-foreground">
							—
						</span>
					) : (
						<span
							className={cn(
								"font-display text-4xl font-bold tracking-tighter",
								isPrimary ? "text-primary" : "text-foreground",
							)}
						>
							{value}
						</span>
					)}

					{/* Legacy change/trend indicators */}
					{change && (
						<Badge
							variant="secondary"
							className={cn(
								"rounded-full px-2 py-0.5 text-[0.7rem] font-bold border-0 shadow-none",
								changeVariantStyles[change.type],
							)}
						>
							{change.type === "positive" && "↑"}
							{change.type === "negative" && "↓"}
							{change.type === "neutral" && "•"} {change.value}
						</Badge>
					)}
					{trend && (
						<Badge
							variant="secondary"
							className={cn(
								"rounded-full px-2 py-0.5 text-[0.7rem] font-bold border-0 shadow-none",
								trend.isPositive
									? "bg-success/10 text-success"
									: "bg-destructive/10 text-destructive",
							)}
						>
							{trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
						</Badge>
					)}

					{/* New badge system */}
					{badge && (
						<Badge
							variant={badgeVariantMap[badgeType]}
							className="rounded-full px-2 py-0.5 text-[0.7rem] font-bold border-0 shadow-none"
						>
							{badge}
						</Badge>
					)}

					{/* Sub value display */}
					{subValue && (
						<span className="text-xs text-muted-foreground">{subValue}</span>
					)}

					{/* Action indicator */}
					{hasAction && (
						<svg
							aria-hidden="true"
							className="ml-auto h-4 w-4 text-primary"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M7 17L17 7M17 7H7M17 7V17"
							/>
						</svg>
					)}
				</div>

				{/* Subtitle display */}
				{(subtitle || subValue) && (
					<p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
				)}
			</CardContent>
		</Card>
	);
}
