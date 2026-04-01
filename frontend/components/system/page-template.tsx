"use client";

import * as React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Editorial Page Template - Layout consistente para todas las páginas
 *
 * Design System: Todos los <main> deben usar este template para consistencia
 *
 * @example
 * <PageTemplate>
 *   <PageHeader
 *     title="Dashboard"
 *     subtitle="Resumen de actividad"
 *     actions={<Button>Nuevo</Button>}
 *   />
 *   <PageSection title="KPIs">
 *     <KpiGrid>...</KpiGrid>
 *   </PageSection>
 * </PageTemplate>
 */

interface PageTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	/**
	 * Espaciado entre secciones
	 * @default "lg"
	 */
	gap?: "sm" | "md" | "lg" | "xl";
	/**
	 * Ancho máximo del contenido
	 * @default "xl"
	 */
	maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

const PageTemplate = React.forwardRef<HTMLDivElement, PageTemplateProps>(
	({ className, children, gap = "lg", maxWidth = "xl", ...props }, ref) => {
		const gapClasses = {
			sm: "gap-4",
			md: "gap-6",
			lg: "gap-8",
			xl: "gap-10",
		};

		const widthClasses = {
			sm: "max-w-3xl",
			md: "max-w-4xl",
			lg: "max-w-5xl",
			xl: "max-w-7xl",
			full: "max-w-full",
		};

		return (
			<div
				ref={ref}
				className={cn(
					"flex flex-col",
					gapClasses[gap],
					widthClasses[maxWidth],
					"mx-auto w-full px-4 sm:px-6 lg:px-8",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);
PageTemplate.displayName = "PageTemplate";

// ============================================================================
// PAGE HEADER - Título, subtítulo y acciones consistentes
// ============================================================================

interface PageHeaderProps {
	/**
	 * Título de la página (H1)
	 */
	title: string;
	/**
	 * Subtítulo opcional
	 */
	subtitle?: string;
	/**
	 * Elementos de acción (botones, etc.)
	 */
	actions?: React.ReactNode;
	/**
	 * Icono decorativo al lado del título
	 */
	icon?: React.ReactNode;
	/**
	 * Breadcrumb opcional
	 */
	breadcrumb?: string;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
	({ title, subtitle, actions, icon, breadcrumb }, ref) => {
		return (
			<div ref={ref} className="flex flex-col gap-1">
				{breadcrumb && (
					<span className="text-xs text-muted-foreground font-medium">
						{breadcrumb}
					</span>
				)}
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-2">
							{icon && <span className="text-primary">{icon}</span>}
							<h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
								{title}
							</h1>
						</div>
						{subtitle && (
							<p className="text-sm text-muted-foreground">{subtitle}</p>
						)}
					</div>
					{actions && (
						<div className="flex items-center gap-2 shrink-0">{actions}</div>
					)}
				</div>
			</div>
		);
	},
);
PageHeader.displayName = "PageHeader";

// ============================================================================
// PAGE SECTION - Secciones consistentes con título
// ============================================================================

interface PageSectionProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Título de la sección
	 */
	title?: string;
	/**
	 * Icono del título
	 */
	titleIcon?: React.ReactNode;
	/**
	 * Acciones del header de sección
	 */
	actions?: React.ReactNode;
	/**
	 * Espaciado interno
	 * @default "default"
	 */
	padding?: "none" | "sm" | "default" | "lg";
	/**
	 * Si la sección debe tener fondo de card
	 * @default false
	 */
	contained?: boolean;
}

const PageSection = React.forwardRef<HTMLDivElement, PageSectionProps>(
	(
		{
			className,
			children,
			title,
			titleIcon,
			actions,
			padding = "default",
			contained = false,
			...props
		},
		ref,
	) => {
		const paddingClasses = {
			none: "",
			sm: "p-3",
			default: "p-4",
			lg: "p-6",
		};

		const content = (
			<>
				{(title || actions) && (
					<div className="flex items-center justify-between gap-4 mb-4">
						{title && (
							<div className="flex items-center gap-2">
								{titleIcon && <span className="text-primary">{titleIcon}</span>}
								<h2 className="font-heading text-xl font-semibold">{title}</h2>
							</div>
						)}
						{actions && (
							<div className="flex items-center gap-2">{actions}</div>
						)}
					</div>
				)}
				<div className={cn(!title && !actions && paddingClasses[padding])}>
					{children}
				</div>
			</>
		);

		if (contained) {
			return (
				<Card
					ref={ref}
					className={cn("border-0 shadow-sm bg-card", className)}
					{...props}
				>
					<CardContent className={cn("p-0", paddingClasses[padding])}>
						{content}
					</CardContent>
				</Card>
			);
		}

		return (
			<section ref={ref} className={cn("flex flex-col", className)} {...props}>
				{content}
			</section>
		);
	},
);
PageSection.displayName = "PageSection";

// ============================================================================
// KPI GRID - Grid consistente para métricas
// ============================================================================

interface KpiGridProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	/**
	 * Número de columnas
	 * @default 4
	 */
	cols?: 2 | 3 | 4 | 5;
	/**
	 * Gap entre KPIs
	 * @default "default"
	 */
	gap?: "sm" | "default" | "lg";
}

const KpiGrid = React.forwardRef<HTMLDivElement, KpiGridProps>(
	({ className, children, cols = 4, gap = "default", ...props }, ref) => {
		const colClasses = {
			2: "grid-cols-1 md:grid-cols-2",
			3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
			4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
			5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
		};

		const gapClasses = {
			sm: "gap-3",
			default: "gap-4",
			lg: "gap-6",
		};

		return (
			<div
				ref={ref}
				className={cn("grid", colClasses[cols], gapClasses[gap], className)}
				{...props}
			>
				{children}
			</div>
		);
	},
);
KpiGrid.displayName = "KpiGrid";

// ============================================================================
// KPI CARD - Tarjeta de métrica consistente
// ============================================================================

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Título del KPI
	 */
	label: string;
	/**
	 * Valor principal
	 */
	value: string | number | null;
	/**
	 * Cambio porcentual o absoluto
	 */
	change?: {
		value: string;
		type: "positive" | "negative" | "neutral";
	};
	/**
	 * Subtítulo
	 */
	subtitle?: string;
	/**
	 * Icono decorativo
	 */
	icon?: React.ReactNode;
	/**
	 * Badge opcional
	 */
	badge?: {
		text: string;
		variant: "success" | "warning" | "destructive" | "default";
	};
	/**
	 * Si es el KPI principal
	 * @default false
	 */
	isPrimary?: boolean;
	/**
	 * Indicador de carga
	 * @default false
	 */
	loading?: boolean;
}

const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(
	(
		{
			className,
			label,
			value,
			change,
			subtitle,
			icon,
			badge,
			isPrimary = false,
			loading = false,
			...props
		},
		ref,
	) => {
		return (
			<Card
				ref={ref}
				className={cn(
					"border-0 shadow-sm bg-card transition-all duration-200",
					"hover:shadow-md hover:-translate-y-0.5",
					className,
				)}
				{...props}
			>
				<CardContent className="p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="flex-1 min-w-0">
							{/* Label */}
							<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								{label}
							</p>

							{/* Value + Change */}
							<div className="mt-1 flex items-baseline gap-2 flex-wrap">
								{loading || value === null ? (
									<span className="font-heading text-2xl font-bold text-muted-foreground">
										—
									</span>
								) : (
									<span
										className={cn(
											"font-heading text-2xl font-bold",
											isPrimary ? "text-primary" : "text-foreground",
										)}
									>
										{value}
									</span>
								)}

								{change && (
									<span
										className={cn(
											"text-xs font-medium",
											change.type === "positive" && "text-success",
											change.type === "negative" && "text-destructive",
											change.type === "neutral" && "text-muted-foreground",
										)}
									>
										{change.value}
									</span>
								)}
							</div>

							{/* Subtitle */}
							{subtitle && (
								<p className="text-xs text-muted-foreground mt-0.5">
									{subtitle}
								</p>
							)}

							{/* Badge */}
							{badge && (
								<div className="mt-2">
									<span
										className={cn(
											"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
											badge.variant === "success" &&
												"bg-success/15 text-success",
											badge.variant === "warning" &&
												"bg-warning/15 text-warning",
											badge.variant === "destructive" &&
												"bg-destructive/15 text-destructive",
											badge.variant === "default" &&
												"bg-muted text-muted-foreground",
										)}
									>
										{badge.text}
									</span>
								</div>
							)}
						</div>

						{/* Icon */}
						{icon && (
							<div
								className={cn(
									"shrink-0 flex items-center justify-center rounded-lg size-10",
									isPrimary ? "bg-primary/10" : "bg-muted",
								)}
							>
								<span
									className={
										isPrimary ? "text-primary" : "text-muted-foreground"
									}
								>
									{icon}
								</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);
	},
);
KpiCard.displayName = "KpiCard";

// ============================================================================
// ACTION CARD - Tarjetas de acción crítica
// ============================================================================

interface ActionCardProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Severidad/Nivel de la acción
	 */
	severity: "critical" | "warning" | "success" | "info";
	/**
	 * Label del badge
	 */
	label: string;
	/**
	 * Cliente o entidad
	 */
	entity: string;
	/**
	 * Descripción de la acción
	 */
	description: string;
	/**
	 * Texto del CTA
	 */
	ctaText: string;
	/**
	 * Handler del CTA
	 */
	onAction?: () => void;
	/**
	 * Icono personalizado (opcional)
	 */
	icon?: React.ReactNode;
}

const ActionCard = React.forwardRef<HTMLDivElement, ActionCardProps>(
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
		const severityConfig = {
			critical: {
				border: "border-destructive/20",
				bg: "bg-destructive/5",
				iconBg: "bg-destructive/15",
				iconColor: "text-destructive",
				badge: "bg-destructive/15 text-destructive",
				ctaVariant: "destructive" as const,
			},
			warning: {
				border: "border-warning/20",
				bg: "bg-warning/5",
				iconBg: "bg-warning/15",
				iconColor: "text-warning",
				badge: "bg-warning/15 text-warning",
				ctaVariant: "secondary" as const,
			},
			success: {
				border: "border-success/20",
				bg: "bg-success/5",
				iconBg: "bg-success/15",
				iconColor: "text-success",
				badge: "bg-success/15 text-success",
				ctaVariant: "default" as const,
			},
			info: {
				border: "border-primary/20",
				bg: "bg-primary/5",
				iconBg: "bg-primary/15",
				iconColor: "text-primary",
				badge: "bg-primary/15 text-primary",
				ctaVariant: "outline" as const,
			},
		};

		const config = severityConfig[severity];

		return (
			<Card
				ref={ref}
				className={cn(
					"border shadow-sm transition-all duration-200",
					"hover:shadow-md hover:-translate-y-0.5",
					config.border,
					config.bg,
					className,
				)}
				{...props}
			>
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						<div
							className={cn(
								"flex size-9 shrink-0 items-center justify-center rounded-full",
								config.iconBg,
							)}
						>
							{icon && (
								<span className={cn("size-4", config.iconColor)}>{icon}</span>
							)}
						</div>
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
							<button
								type="button"
								onClick={onAction}
								className={cn(
									"mt-3 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
									config.ctaVariant === "destructive" &&
										"bg-destructive text-destructive-foreground hover:bg-destructive/90",
									config.ctaVariant === "secondary" &&
										"bg-secondary text-secondary-foreground hover:bg-secondary/80",
									config.ctaVariant === "default" &&
										"bg-primary text-primary-foreground hover:bg-primary/90",
									config.ctaVariant === "outline" &&
										"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
								)}
							>
								{ctaText}
							</button>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	},
);
ActionCard.displayName = "ActionCard";

export { PageTemplate, PageHeader, PageSection, KpiGrid, KpiCard, ActionCard };
