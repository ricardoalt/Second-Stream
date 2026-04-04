"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ActionCard — Prioritized action card for critical alerts and next steps
 *
 * Migrated from components/system/page-template.tsx.
 * Use for surfacing critical alerts, warnings, or suggested next actions.
 *
 * @example
 * <ActionCard
 *   severity="warning"
 *   label="Follow-up Needed"
 *   entity="ACME Corp"
 *   description="3 waste streams are missing disposal routes."
 *   ctaText="Review streams"
 *   onAction={() => setActiveTab("missing-info")}
 * />
 */

type ActionCardSeverity = "critical" | "warning" | "success" | "info";

interface ActionCardProps extends React.HTMLAttributes<HTMLDivElement> {
	severity: ActionCardSeverity;
	label: string;
	entity: string;
	description: string;
	ctaText: string;
	onAction?: () => void;
	icon?: React.ReactNode;
}

const severityConfig: Record<
	ActionCardSeverity,
	{
		border: string;
		bg: string;
		iconBg: string;
		iconColor: string;
		badge: string;
		ctaVariant: "destructive" | "secondary" | "default" | "outline";
	}
> = {
	critical: {
		border: "border-destructive/20",
		bg: "bg-destructive/5",
		iconBg: "bg-destructive/15",
		iconColor: "text-destructive",
		badge: "bg-destructive/15 text-destructive",
		ctaVariant: "destructive",
	},
	warning: {
		border: "border-warning/20",
		bg: "bg-warning/5",
		iconBg: "bg-warning/15",
		iconColor: "text-warning",
		badge: "bg-warning/15 text-warning",
		ctaVariant: "secondary",
	},
	success: {
		border: "border-success/20",
		bg: "bg-success/5",
		iconBg: "bg-success/15",
		iconColor: "text-success",
		badge: "bg-success/15 text-success",
		ctaVariant: "default",
	},
	info: {
		border: "border-primary/20",
		bg: "bg-primary/5",
		iconBg: "bg-primary/15",
		iconColor: "text-primary",
		badge: "bg-primary/15 text-primary",
		ctaVariant: "outline",
	},
};

export const ActionCard = React.forwardRef<HTMLDivElement, ActionCardProps>(
	(
		{
			className,
			severity,
			label,
			entity,
			description,
			ctaText,
			onAction,
			icon,
			...props
		},
		ref,
	) => {
		const config = severityConfig[severity];

		return (
			<div
				ref={ref}
				className={cn(
					"flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-all duration-200",
					"hover:shadow-md hover:-translate-y-0.5",
					config.border,
					config.bg,
					className,
				)}
				{...props}
			>
				{icon && (
					<div
						className={cn(
							"flex size-9 shrink-0 items-center justify-center rounded-full",
							config.iconBg,
						)}
					>
						<span className={cn("size-4", config.iconColor)}>{icon}</span>
					</div>
				)}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span
							className={cn(
								"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
								config.badge,
							)}
						>
							{label}
						</span>
						<span className="text-xs text-muted-foreground">{entity}</span>
					</div>
					<p className="mt-1 text-sm text-foreground">{description}</p>
					<Button
						variant={config.ctaVariant}
						size="sm"
						className="mt-3"
						onClick={onAction}
					>
						{ctaText}
					</Button>
				</div>
			</div>
		);
	},
);
ActionCard.displayName = "ActionCard";
