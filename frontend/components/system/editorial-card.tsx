"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * EditorialCard - Componente de dominio que implementa el Design System Editorial
 *
 * Principios aplicados:
 * - No-Line Rule: Uso de background color shifts en lugar de bordes
 * - Glass & Gradient: Glassmorphism para elementos flotantes
 * - Tokens semánticos: Uso de variables CSS, nunca colores hardcodeados
 */

const editorialCardVariants = cva(
	"overflow-hidden transition-all duration-300",
	{
		variants: {
			variant: {
				// Default: Card estándar con sutil diferenciación de superficie
				default: "bg-card border border-border/40 shadow-sm",

				// Glass: Glassmorphism para modales, popovers, elementos flotantes
				glass: "bg-card/70 backdrop-blur-xl border border-border/30 shadow-lg",

				// Gradient: Fondo con gradiente signature (primary → primary-container)
				gradient:
					"bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg",

				// Elevated: Sin borde, sombra pronunciada
				elevated: "bg-card border-0 shadow-xl",

				// Subtle: Fondo muy sutil para secciones secundarias
				subtle: "bg-muted/30 border border-border/20",

				// Surface: Para cards anidados dentro de otros cards
				surface: "bg-background border border-border/30",
			},

			// Estados de decisión específicos del dominio
			decision: {
				go: "bg-gradient-to-br from-success/20 to-success/10 border-success/50 border-2",
				"no-go":
					"bg-gradient-to-br from-destructive/20 to-destructive/10 border-destructive/50 border-2",
				investigate:
					"bg-gradient-to-br from-warning/20 to-warning/10 border-warning/50 border-2",
				neutral: "bg-card border border-border/40",
			},

			// Efecto glow para elementos destacados
			glow: {
				true: "shadow-[0_8px_30px_color-mix(in_srgb,var(--primary)_15%,transparent)]",
				false: "",
			},

			// Padding presets
			padding: {
				none: "",
				sm: "p-4",
				md: "p-6",
				lg: "p-8",
			},

			// Radius presets (siguiendo Design.md)
			radius: {
				sm: "rounded-md", // 6px - chips, badges
				md: "rounded-lg", // 10px - inputs, buttons
				lg: "rounded-xl", // 16px - cards, modales
				xl: "rounded-2xl", // 24px - macrocards, secciones
				full: "rounded-3xl", // Hero elements
			},
		},
		defaultVariants: {
			variant: "default",
			glow: false,
			padding: "md",
			radius: "lg",
		},
	},
);

export interface EditorialCardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof editorialCardVariants> {
	asChild?: boolean;
}

const EditorialCard = React.forwardRef<HTMLDivElement, EditorialCardProps>(
	(
		{
			className,
			variant,
			decision,
			glow,
			padding,
			radius,
			asChild = false,
			...props
		},
		ref,
	) => {
		return (
			<Card
				ref={ref}
				className={cn(
					editorialCardVariants({
						variant,
						decision,
						glow,
						padding,
						radius,
					}),
					className,
				)}
				{...props}
			/>
		);
	},
);
EditorialCard.displayName = "EditorialCard";

// Sub-components que preservan la composición de shadcn pero aplican estilos editoriales
const EditorialCardHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<CardHeader
		ref={ref}
		className={cn(
			"flex flex-col gap-1.5", // gap en lugar de space-y
			className,
		)}
		{...props}
	/>
));
EditorialCardHeader.displayName = "EditorialCardHeader";

const EditorialCardTitle = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<CardTitle
		ref={ref}
		className={cn(
			"font-semibold leading-none tracking-tight", // tracking tighter para headlines
			className,
		)}
		{...props}
	/>
));
EditorialCardTitle.displayName = "EditorialCardTitle";

const EditorialCardDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<CardDescription
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
EditorialCardDescription.displayName = "EditorialCardDescription";

const EditorialCardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<CardContent ref={ref} className={cn("pt-0", className)} {...props} />
));
EditorialCardContent.displayName = "EditorialCardContent";

const EditorialCardFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<CardFooter
		ref={ref}
		className={cn(
			"flex items-center gap-2", // gap en lugar de space-x
			className,
		)}
		{...props}
	/>
));
EditorialCardFooter.displayName = "EditorialCardFooter";

export {
	EditorialCard,
	EditorialCardHeader,
	EditorialCardFooter,
	EditorialCardTitle,
	EditorialCardDescription,
	EditorialCardContent,
};
