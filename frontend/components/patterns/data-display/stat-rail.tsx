"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { StaggerContainer, StaggerItem } from "../animations/motion-components";

/**
 * StatRail — Consistent KPI grid container with built-in stagger animations
 *
 * Replaces all ad-hoc `grid grid-cols-* gap-*` + StaggerContainer patterns for KPI rows.
 *
 * @example
 * <StatRail columns={4}>
 *   <KpiCard title="Active" value={42} />
 *   <KpiCard title="Pending" value={7} />
 * </StatRail>
 */

interface StatRailProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	/**
	 * Number of columns at max width.
	 * @default 4
	 */
	columns?: 2 | 3 | 4 | 5;
	/**
	 * Gap between stat cards.
	 * @default "default"
	 */
	gap?: "sm" | "default" | "lg";
	/**
	 * Whether to apply stagger entrance animation.
	 * @default true
	 */
	animated?: boolean;
	/**
	 * Stagger delay between items in seconds.
	 * @default 0.08
	 */
	staggerDelay?: number;
}

const colMap = {
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
	4: "grid-cols-2 lg:grid-cols-4",
	5: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
} as const;

const gapMap = {
	sm: "gap-3",
	default: "gap-4",
	lg: "gap-6",
} as const;

export function StatRail({
	children,
	columns = 4,
	gap = "default",
	animated = true,
	staggerDelay = 0.08,
	className,
}: StatRailProps) {
	const gridClass = cn("grid", colMap[columns], gapMap[gap], className);

	if (!animated) {
		return <div className={gridClass}>{children}</div>;
	}

	const items = React.Children.toArray(children);

	return (
		<StaggerContainer staggerDelay={staggerDelay} className={gridClass}>
			{items.map((child, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static stat card layout
				<StaggerItem key={i}>{child}</StaggerItem>
			))}
		</StaggerContainer>
	);
}
