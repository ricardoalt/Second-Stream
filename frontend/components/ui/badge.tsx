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
				// Variantes Digital Curator (Sin bordes, alto contraste tonal)
				"success-subtle":
					"border-transparent bg-success-bg text-success-text hover:opacity-80",
				"warning-subtle":
					"border-transparent bg-warning-bg text-warning-text hover:opacity-80",
				"destructive-subtle":
					"border-transparent bg-destructive-bg text-destructive-text hover:opacity-80",
				"primary-subtle":
					"border-transparent bg-primary-bg text-primary-text hover:opacity-80",
				"neutral-subtle":
					"border-transparent bg-neutral-bg text-neutral-text hover:opacity-80",
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
