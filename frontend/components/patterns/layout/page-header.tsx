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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * PageHeader - Standardized page header for SecondStream
 *
 * Provides consistent header structure across all pages:
 * - Title with optional icon
 * - Breadcrumb navigation (optional)
 * - Actions slot for buttons
 * - Consistent spacing and typography
 *
 * @example
 * <PageHeader
 *   title="Clients"
 *   subtitle="Manage your client portfolio"
 *   icon={Users}
 *   actions={<Button>Add Client</Button>}
 *   breadcrumbs={[{ label: "Home", href: "/" }, { label: "Clients" }]}
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
	className,
	variant = "default",
}: PageHeaderProps) {
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

			{/* Main Header */}
			<div
				className={cn(
					"flex flex-col gap-4",
					variant === "default" &&
						"sm:flex-row sm:items-start sm:justify-between",
					variant === "compact" &&
						"sm:flex-row sm:items-center sm:justify-between",
					variant === "hero" && "sm:flex-row sm:items-end sm:justify-between",
				)}
			>
				<div className="flex items-start gap-3">
					{Icon && (
						<div className="rounded-lg bg-primary/10 p-2.5 hidden sm:flex">
							<Icon className="h-5 w-5 text-primary" />
						</div>
					)}
					<div className="space-y-1">
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
					<div className="flex items-center gap-2 shrink-0">{actions}</div>
				)}
			</div>
		</div>
	);
}
