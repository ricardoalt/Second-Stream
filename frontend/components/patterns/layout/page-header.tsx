"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

/**
 * PageHeader - Standardized page header for SecondStream
 *
 * Provides consistent header structure across all pages.
 * Absorbs the StreamsFamilyHeader hero pattern as a variant.
 *
 * Variants:
 * - `default`: Standard page header with title + subtitle + actions
 * - `compact`: Tighter layout, smaller title, items-center
 * - `hero`: Featured header with gradient accent strip and card-like container
 *
 * @example
 * <PageHeader
 *   title="Waste Stream Management"
 *   subtitle="Track, validate, and propose disposal routes."
 *   icon={Recycle}
 *   variant="hero"
 *   breadcrumbs={[{ label: "Home", href: "/" }, { label: "Streams" }]}
 *   actions={<Button>New Stream</Button>}
 * />
 */

interface BreadcrumbLinkItem {
	label: string;
	href?: string;
}

interface PageHeaderProps {
	/** Page title (h1) */
	title: string;
	/** Optional subtitle/description */
	subtitle?: string;
	/** Icon from lucide-react */
	icon?: LucideIcon;
	/** Badge text (e.g., "Beta", "New") */
	badge?: string;
	/** Action buttons or elements */
	actions?: ReactNode;
	/** Breadcrumb navigation */
	breadcrumbs?: BreadcrumbLinkItem[];
	/** Breadcrumb super-label (text above the title, e.g., category name) */
	superlabel?: string;
	/** Additional classes */
	className?: string;
	/** Visual variant */
	variant?: "default" | "compact" | "hero";
}

export function PageHeader({
	title,
	subtitle,
	icon: Icon,
	badge,
	actions,
	breadcrumbs,
	superlabel,
	className,
	variant = "default",
}: PageHeaderProps) {
	const isHero = variant === "hero";

	const content = (
		<div
			className={cn(
				"flex flex-col gap-4",
				variant === "default" &&
					"sm:flex-row sm:items-start sm:justify-between",
				variant === "compact" &&
					"sm:flex-row sm:items-center sm:justify-between",
				variant === "hero" && "lg:flex-row lg:items-start lg:justify-between",
			)}
		>
			<div className="flex items-start gap-3">
				{Icon && !isHero && (
					<div className="rounded-lg bg-primary/10 p-2.5 hidden sm:flex">
						<Icon className="h-5 w-5 text-primary" />
					</div>
				)}
				<div className="flex flex-col gap-1">
					{/* Superlabel (breadcrumb-style category label) */}
					{superlabel && (
						<p className="text-xs font-medium uppercase tracking-[0.05em] text-primary">
							{superlabel}
						</p>
					)}

					<div className="flex items-center gap-2">
						<h1
							className={cn(
								"font-display font-semibold tracking-tight",
								variant === "compact" && "text-xl",
								variant === "default" && "text-2xl",
								variant === "hero" && "text-3xl",
							)}
						>
							{title}
						</h1>
						{badge && (
							<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
								{badge}
							</span>
						)}
					</div>

					{subtitle && (
						<p className="text-sm text-muted-foreground max-w-2xl">
							{subtitle}
						</p>
					)}
				</div>
			</div>

			{/* Actions */}
			{actions && (
				<div className="flex flex-wrap items-center gap-2 shrink-0">
					{actions}
				</div>
			)}
		</div>
	);

	return (
		<div className={cn("space-y-4", className)}>
			{/* Breadcrumbs */}
			{breadcrumbs && breadcrumbs.length > 0 && (
				<Breadcrumb>
					<BreadcrumbList>
						{breadcrumbs.map((item, index) => (
							<div key={item.label} className="flex items-center">
								{index > 0 && <BreadcrumbSeparator />}
								<BreadcrumbItem>
									{item.href ? (
										<BreadcrumbLink href={item.href}>
											{item.label}
										</BreadcrumbLink>
									) : (
										<BreadcrumbPage>{item.label}</BreadcrumbPage>
									)}
								</BreadcrumbItem>
							</div>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			)}

			{/* Hero wrapper or plain */}
			{isHero ? (
				<section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-8 shadow-xs">
					{/* Primary accent strip */}
					<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-container" />
					{content}
				</section>
			) : (
				content
			)}
		</div>
	);
}
