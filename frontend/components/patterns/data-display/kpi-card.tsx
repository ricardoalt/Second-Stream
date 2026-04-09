"use client";

import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { isValidElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * KpiCard — Standardized KPI display for SecondStream.
 *
 * Single source of truth for all metric/stat cards across the platform.
 *
 * @example
 * <KpiCard
 *   title="Total Revenue"
 *   value="$124,500"
 *   change={{ value: "+12.5%", type: "positive" }}
 *   icon={DollarSign}
 *   variant="accent"
 * />
 */

interface KpiCardProps {
	/** Card title */
	title: string;
	/** Main value to display. Pass null to show an em-dash placeholder. */
	value: string | number | null;
	/** Optional subtitle or context below the value */
	subtitle?: string;
	/** Trend/change indicator badge */
	change?: {
		value: string;
		type: "positive" | "negative" | "neutral";
	};
	/** Icon — accepts LucideIcon component, SVG element, or any ReactNode */
	icon?: React.ReactNode | LucideIcon;
	/** Visual variant — controls background & border tint */
	variant?:
		| "default"
		| "accent"
		| "success"
		| "warning"
		| "destructive"
		| "muted";
	/** Additional classes */
	className?: string;
	/** Show skeleton loading state */
	loading?: boolean;
}

const variantStyles: Record<NonNullable<KpiCardProps["variant"]>, string> = {
	default:
		"bg-card border-border/60 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[shadow,transform] duration-200",
	accent:
		"bg-primary/5 border-primary/30 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[shadow,transform] duration-200",
	success:
		"bg-success/5 border-success/30 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[shadow,transform] duration-200",
	warning:
		"bg-warning/5 border-warning/30 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[shadow,transform] duration-200",
	destructive:
		"bg-destructive/5 border-destructive/30 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[shadow,transform] duration-200",
	muted:
		"bg-muted/50 border-muted-foreground/20 shadow-xs hover:shadow-sm hover:-translate-y-px transition-[shadow,transform] duration-200",
};

const changeStyles: Record<
	NonNullable<KpiCardProps["change"]>["type"],
	string
> = {
	positive: "bg-success/10 text-success",
	negative: "bg-destructive/10 text-destructive",
	neutral: "bg-muted text-muted-foreground",
};

const changeIcons: Record<NonNullable<KpiCardProps["change"]>["type"], string> =
	{
		positive: "↑",
		negative: "↓",
		neutral: "•",
	};

function renderIcon(icon: KpiCardProps["icon"]) {
	if (icon === null || icon === undefined || typeof icon === "boolean")
		return null;
	if (typeof icon === "function") {
		const Icon = icon as React.FC<{ className?: string }>;
		return <Icon className="size-4" />;
	}
	if (
		isValidElement(icon) ||
		typeof icon === "string" ||
		typeof icon === "number"
	) {
		return (
			<span className="size-4 flex items-center justify-center">{icon}</span>
		);
	}
	return null;
}

export function KpiCard({
	title,
	value,
	subtitle,
	change,
	icon,
	variant = "default",
	className,
	loading = false,
}: KpiCardProps) {
	const renderedIcon = renderIcon(icon);

	if (loading) {
		return (
			<Card
				className={cn(
					"relative overflow-hidden",
					variantStyles[variant],
					className,
				)}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
					<div className="h-3 w-24 animate-pulse rounded bg-muted" />
					{icon && <div className="size-4 animate-pulse rounded bg-muted" />}
				</CardHeader>
				<CardContent>
					<div className="h-10 w-32 animate-pulse rounded bg-muted" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card
			className={cn(
				"relative overflow-hidden",
				variantStyles[variant],
				className,
			)}
		>
			{/* Gradient accent strip for accent/success/warning/destructive variants */}
			{variant !== "default" && variant !== "muted" && (
				<div
					className={cn(
						"absolute inset-x-0 top-0 h-[2px]",
						variant === "accent" &&
							"bg-gradient-to-r from-primary/60 via-primary to-primary/60",
						variant === "success" &&
							"bg-gradient-to-r from-success/60 via-success to-success/60",
						variant === "warning" &&
							"bg-gradient-to-r from-warning/60 via-warning to-warning/60",
						variant === "destructive" &&
							"bg-gradient-to-r from-destructive/60 via-destructive to-destructive/60",
					)}
				/>
			)}
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
				<CardTitle className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
					{title}
				</CardTitle>
				{renderedIcon && (
					<div
						className={cn(
							"rounded-md p-1.5",
							variant === "muted" ? "text-muted-foreground" : "text-primary",
						)}
					>
						{renderedIcon}
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
						<span className="font-display text-4xl font-bold tracking-tighter text-foreground">
							{value}
						</span>
					)}

					{change && (
						<Badge
							variant="secondary"
							className={cn(
								"rounded-full px-2 py-0.5 text-[0.7rem] font-bold border-0 shadow-none",
								changeStyles[change.type],
							)}
						>
							{changeIcons[change.type]} {change.value}
						</Badge>
					)}
				</div>

				{subtitle && (
					<p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
				)}
			</CardContent>
		</Card>
	);
}
