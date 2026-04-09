"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StatusChip - Badges para estados de decisión y cumplimiento
 *
 * Implementa los tokens semánticos del Design System Editorial.
 * NUNCA usa colores hardcodeados como emerald-500, amber-500, etc.
 */

const statusChipVariants = cva(
	"inline-flex items-center justify-start gap-1.5 font-medium transition-colors whitespace-nowrap",
	{
		variants: {
			// Estados de decisión del dominio
			status: {
				// Decisiones
				go: "bg-success text-success-foreground border border-success",
				"no-go":
					"bg-destructive text-destructive-foreground border border-destructive",
				investigate: "bg-warning text-warning-foreground border border-warning",

				// Estados genéricos (mapeados a decisiones para consistencia)
				success: "bg-success text-success-foreground border border-success",
				error:
					"bg-destructive text-destructive-foreground border border-destructive",
				warning: "bg-warning text-warning-foreground border border-warning",
				info: "bg-primary text-primary-foreground border border-primary",

				// Estados de cumplimiento
				compliant: "bg-success text-success-foreground border border-success",
				"non-compliant":
					"bg-destructive text-destructive-foreground border border-destructive",
				partial: "bg-warning text-warning-foreground border border-warning",

				// Estados de progreso
				pending: "bg-muted text-muted-foreground border border-muted",
				active: "bg-primary text-primary-foreground border border-primary",
				completed: "bg-success text-success-foreground border border-success",
				archived:
					"bg-secondary text-secondary-foreground border border-secondary",
				// Pipeline: streams/ofertas en proceso de venta
				pipeline: "bg-info text-info-foreground border border-info",
			},

			// Variantes de apariencia (background vs outline)
			variant: {
				// Filled: Background sólido (default)
				filled: "",

				// Subtle: Uses badge semantic tokens (same tokens as Badge -subtle variants)
				subtle: cn(
					// success family: go, success, completed, compliant
					"data-[status=go]:bg-badge-success-bg data-[status=go]:text-badge-success-text data-[status=go]:border-badge-success-border",
					"data-[status=success]:bg-badge-success-bg data-[status=success]:text-badge-success-text data-[status=success]:border-badge-success-border",
					"data-[status=completed]:bg-badge-success-bg data-[status=completed]:text-badge-success-text data-[status=completed]:border-badge-success-border",
					"data-[status=compliant]:bg-badge-success-bg data-[status=compliant]:text-badge-success-text data-[status=compliant]:border-badge-success-border",
					// destructive family: no-go, error, non-compliant
					"data-[status=no-go]:bg-badge-destructive-bg data-[status=no-go]:text-badge-destructive-text data-[status=no-go]:border-badge-destructive-border",
					"data-[status=error]:bg-badge-destructive-bg data-[status=error]:text-badge-destructive-text data-[status=error]:border-badge-destructive-border",
					"data-[status=non-compliant]:bg-badge-destructive-bg data-[status=non-compliant]:text-badge-destructive-text data-[status=non-compliant]:border-badge-destructive-border",
					// warning family: investigate, warning, partial
					"data-[status=investigate]:bg-badge-warning-bg data-[status=investigate]:text-badge-warning-text data-[status=investigate]:border-badge-warning-border",
					"data-[status=warning]:bg-badge-warning-bg data-[status=warning]:text-badge-warning-text data-[status=warning]:border-badge-warning-border",
					"data-[status=partial]:bg-badge-warning-bg data-[status=partial]:text-badge-warning-text data-[status=partial]:border-badge-warning-border",
					// info family: info, pipeline
					"data-[status=info]:bg-badge-info-bg data-[status=info]:text-badge-info-text data-[status=info]:border-badge-info-border",
					"data-[status=pipeline]:bg-badge-info-bg data-[status=pipeline]:text-badge-info-text data-[status=pipeline]:border-badge-info-border",
					// primary family: active
					"data-[status=active]:bg-badge-primary-bg data-[status=active]:text-badge-primary-text data-[status=active]:border-badge-primary-border",
					// neutral family: pending, archived
					"data-[status=pending]:bg-badge-neutral-bg data-[status=pending]:text-badge-neutral-text data-[status=pending]:border-badge-neutral-border",
					"data-[status=archived]:bg-badge-neutral-bg data-[status=archived]:text-badge-neutral-text data-[status=archived]:border-badge-neutral-border",
				),

				// Ghost: Sin background, solo borde y texto
				ghost: "bg-transparent",

				// Glass: Con glassmorphism
				glass: "bg-card/60 backdrop-blur-md border-border/50",
			},

			// Tamaños (siguiendo escala del Design System)
			size: {
				xs: "h-5 px-2 text-[11px] gap-1", // Micro-data
				sm: "h-6 px-2.5 text-xs gap-1", // Table headers
				md: "h-7 px-3 text-sm gap-1.5", // Default
				lg: "h-8 px-4 text-sm gap-2", // Destacado
			},

			// Forma
			shape: {
				// round-full para status chips (contraste visual con cards md)
				pill: "rounded-full",
				// round-md para consistencia con otros elementos
				rounded: "rounded-md",
			},

			// Efectos adicionales
			glow: {
				true: "shadow-lg",
				false: "",
			},

			// Truncation: opt-in para labels dinámicos largos.
			// El consumer controla el ancho con max-w-* via className.
			truncate: {
				true: "overflow-hidden",
				false: "",
			},
		},
		defaultVariants: {
			status: "pending",
			variant: "filled",
			size: "md",
			shape: "pill",
			glow: false,
			truncate: false,
		},
	},
);

// Configuración de glow por estado (para variante glow)
const glowStyles = {
	go: "shadow-[0_4px_12px_color-mix(in_srgb,var(--success)_30%,transparent)]",
	"no-go":
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--destructive)_30%,transparent)]",
	investigate:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--warning)_30%,transparent)]",
	success:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--success)_30%,transparent)]",
	error:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--destructive)_30%,transparent)]",
	warning:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--warning)_30%,transparent)]",
	info: "shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_30%,transparent)]",
	active:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_30%,transparent)]",
	completed:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--success)_30%,transparent)]",
	pending: "",
	archived: "",
	pipeline:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--info)_30%,transparent)]",
	compliant:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--success)_30%,transparent)]",
	"non-compliant":
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--destructive)_30%,transparent)]",
	partial:
		"shadow-[0_4px_12px_color-mix(in_srgb,var(--warning)_30%,transparent)]",
};

export interface StatusChipProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof statusChipVariants> {
	icon?: React.ReactNode;
	/** Appends "(X days)" to the label, e.g. for "Stalled (28 days)" */
	days?: number;
	/**
	 * Truncate long labels with ellipsis.
	 * Pair with `max-w-*` via className to control the truncation width.
	 * Use `title={fullText}` to preserve accessibility via native tooltip.
	 * @example <StatusChip truncate className="max-w-[200px]" title={label}>{label}</StatusChip>
	 */
	truncate?: boolean;
}

const StatusChip = React.forwardRef<HTMLSpanElement, StatusChipProps>(
	(
		{
			className,
			status = "pending",
			variant,
			size,
			shape,
			glow,
			truncate,
			icon,
			days,
			children,
			...props
		},
		ref,
	) => {
		const glowClass = glow ? glowStyles[status as keyof typeof glowStyles] : "";
		const label =
			days !== undefined ? (
				<>
					{children} ({days} days)
				</>
			) : (
				children
			);

		return (
			<span
				ref={ref}
				data-status={status}
				className={cn(
					statusChipVariants({ status, variant, size, shape, glow, truncate }),
					glowClass,
					className,
				)}
				{...props}
			>
				{icon && <span className="shrink-0">{icon}</span>}
				<span
					className={cn(truncate && "min-w-0 overflow-hidden text-ellipsis")}
				>
					{label}
				</span>
			</span>
		);
	},
);
StatusChip.displayName = "StatusChip";

/**
 * StatusChipGroup - Grupo de chips relacionados
 *
 * No usa space-x (anti-patrón), usa flex gap
 */
interface StatusChipGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

const StatusChipGroup = React.forwardRef<HTMLDivElement, StatusChipGroupProps>(
	({ className, children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("flex flex-wrap items-center gap-2", className)}
			{...props}
		>
			{children}
		</div>
	),
);
StatusChipGroup.displayName = "StatusChipGroup";

export { StatusChip, StatusChipGroup };
export type { StatusChipGroupProps };
