"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GradientButton - Botón con gradiente signature del Design System Editorial
 *
 * Principios:
 * - Gradient Signature: Primary (#006565) a Primary Container (#008080) a 135°
 * - Glass & Gradient para CTAs principales
 * - NUNCA usa bg-primary directamente para botones primarios
 */

const gradientButtonVariants = cva(
	"inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			// Variantes de apariencia
			variant: {
				// Primary: Gradient signature con sombra
				primary: cn(
					"bg-gradient-to-br from-primary to-primary/80",
					"text-primary-foreground",
					"shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_25%,transparent)]",
					"hover:shadow-[0_6px_20px_color-mix(in_srgb,var(--primary)_35%,transparent)]",
					"hover:translate-y-[-1px]",
					"active:translate-y-[0px]",
				),

				// Secondary: Surface container con primary text
				secondary: cn(
					"bg-secondary text-secondary-foreground",
					"hover:bg-secondary/80",
				),

				// Outline: Borde sutil con background transparente
				outline: cn(
					"border border-border bg-background",
					"hover:bg-accent hover:text-accent-foreground",
				),

				// Ghost: Solo texto, sin background por defecto
				ghost: "hover:bg-accent hover:text-accent-foreground",

				// Glass: Glassmorphism para botones flotantes
				glass: cn(
					"bg-card/70 backdrop-blur-xl border border-border/30",
					"text-foreground",
					"hover:bg-card/90 hover:border-border/50",
				),

				// Success: Para acciones de confirmación/éxito
				success: cn(
					"bg-success text-success-foreground",
					"shadow-[0_4px_14px_color-mix(in_srgb,var(--success)_25%,transparent)]",
					"hover:shadow-[0_6px_20px_color-mix(in_srgb,var(--success)_35%,transparent)]",
					"hover:translate-y-[-1px]",
				),

				// Destructive: Para acciones peligrosas
				destructive: cn(
					"bg-destructive text-destructive-foreground",
					"shadow-[0_4px_14px_color-mix(in_srgb,var(--destructive)_25%,transparent)]",
					"hover:shadow-[0_6px_20px_color-mix(in_srgb,var(--destructive)_35%,transparent)]",
					"hover:translate-y-[-1px]",
				),
			},

			// Tamaños (siguiendo escala del Design System)
			size: {
				xs: "h-7 px-2.5 text-xs gap-1.5", // Micro acciones
				sm: "h-8 px-3 text-sm gap-1.5", // Compacto
				md: "h-10 px-4 text-sm gap-2", // Default
				lg: "h-12 px-6 text-base gap-2.5", // Destacado
				xl: "h-14 px-8 text-lg gap-3", // Hero CTAs
			},

			// Radius (siguiendo Design.md)
			radius: {
				sm: "rounded-md", // 6px
				md: "rounded-lg", // 10px - default
				lg: "rounded-xl", // 16px
				full: "rounded-full", // Para acciones flotantes
			},

			// Estado de loading
			isLoading: {
				true: "cursor-wait opacity-80",
				false: "",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
			radius: "md",
			isLoading: false,
		},
	},
);

export interface GradientButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof gradientButtonVariants> {
	asChild?: boolean;
	loading?: boolean;
	loadingText?: string;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
	(
		{
			className,
			variant,
			size,
			radius,
			isLoading,
			loading,
			loadingText,
			children,
			disabled,
			asChild = false,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		const loadingState = Boolean(loading || isLoading);
		const isDisabled = Boolean(disabled || loading || isLoading);

		return (
			<Comp
				className={cn(
					gradientButtonVariants({
						variant,
						size,
						radius,
						isLoading: loadingState,
					}),
					className,
				)}
				ref={ref}
				disabled={isDisabled}
				{...props}
			>
				{loadingState ? (
					<>
						<svg
							className="animate-spin -ml-1 mr-2 size-4"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						<span className="sr-only">Loading</span>
						{loadingText || children}
					</>
				) : (
					children
				)}
			</Comp>
		);
	},
);
GradientButton.displayName = "GradientButton";

export { GradientButton, gradientButtonVariants };
