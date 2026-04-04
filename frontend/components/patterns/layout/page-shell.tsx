"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PageShell — Standardized page layout container for SecondStream
 *
 * Provides a consistent vertical rhythm across all pages.
 * Use this instead of ad-hoc `flex flex-col gap-*` or `space-y-*` on pages.
 *
 * @example
 * <PageShell>
 *   <PageHeader title="..." actions={...} />
 *   <StatRail columns={4}>
 *     <KpiCard ... />
 *   </StatRail>
 *   <PageShell.Section>
 *     <DataTable ... />
 *   </PageShell.Section>
 * </PageShell>
 */

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	/**
	 * Gap between page sections.
	 * @default "default"
	 */
	gap?: "sm" | "default" | "lg" | "xl";
}

const gapMap = {
	sm: "gap-4",
	default: "gap-6",
	lg: "gap-8",
	xl: "gap-10",
} as const;

interface PageShellSectionProps extends React.HTMLAttributes<HTMLElement> {
	children: React.ReactNode;
	/** Optional section title */
	title?: string;
	/** Optional action elements (buttons, links) */
	actions?: React.ReactNode;
}

type PageShellComponent = React.ForwardRefExoticComponent<
	PageShellProps & React.RefAttributes<HTMLDivElement>
> & {
	Section: React.ForwardRefExoticComponent<
		PageShellSectionProps & React.RefAttributes<HTMLElement>
	>;
};

export const PageShell = React.forwardRef<HTMLDivElement, PageShellProps>(
	({ className, children, gap = "default", ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn("flex flex-col", gapMap[gap], className)}
				{...props}
			>
				{children}
			</div>
		);
	},
) as PageShellComponent;
PageShell.displayName = "PageShell";

// ── PageShell.Section ───────────────────────────────────────────────────────

PageShell.Section = React.forwardRef<HTMLElement, PageShellSectionProps>(
	({ className, children, title, actions, ...props }, ref) => {
		return (
			<section
				ref={ref}
				className={cn("flex flex-col gap-4", className)}
				{...props}
			>
				{(title || actions) && (
					<div className="flex items-center justify-between">
						{title && (
							<h2 className="text-sm font-semibold text-foreground">{title}</h2>
						)}
						{actions && (
							<div className="flex items-center gap-2">{actions}</div>
						)}
					</div>
				)}
				{children}
			</section>
		);
	},
);
(
	PageShell.Section as React.ForwardRefExoticComponent<PageShellSectionProps>
).displayName = "PageShell.Section";

// Add Section as a named export for convenience
export const PageSection = PageShell.Section;
