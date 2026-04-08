import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
				secondary:
					"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
				destructive:
					"border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
				outline: "text-foreground",
				success:
					"border-transparent bg-success text-success-foreground shadow hover:bg-success/80",
				warning:
					"border-transparent bg-warning text-warning-foreground shadow hover:bg-warning/80",
				muted: "border-muted-foreground/30 bg-muted text-muted-foreground",
				// Variantes Digital Curator (semantic badge tokens — from @theme inline)
				"success-subtle":
					"border border-badge-success-border bg-badge-success-bg text-badge-success-text hover:opacity-80",
				"warning-subtle":
					"border border-badge-warning-border bg-badge-warning-bg text-badge-warning-text hover:opacity-80",
				"destructive-subtle":
					"border border-badge-destructive-border bg-badge-destructive-bg text-badge-destructive-text hover:opacity-80",
				"primary-subtle":
					"border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text hover:opacity-80",
				"neutral-subtle":
					"border border-badge-neutral-border bg-badge-neutral-bg text-badge-neutral-text hover:opacity-80",
				"info-subtle":
					"border border-badge-info-border bg-badge-info-bg text-badge-info-text hover:opacity-80",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
