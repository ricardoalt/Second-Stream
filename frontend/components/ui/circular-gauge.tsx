/**
 * CircularGauge Component
 *
 * A modern circular gauge built with pure CSS (0 dependencies)
 * Following clean code principles:
 * - Single responsibility: displays a percentage as a circular gauge
 * - Named constants: configurable sizes and colors
 * - Accessible: includes ARIA labels
 * - Performant: CSS-only animation
 */

import { cn } from "@/lib/utils";

interface CircularGaugeProps {
	/** Value between 0-100 */
	value: number;
	/** Size variant */
	size?: "sm" | "md" | "lg";
	/** Color of the progress arc */
	color?: string;
	/** Label displayed in center */
	label?: string;
	/** Optional className for container */
	className?: string;
}

// Size constants (avoid magic numbers)
const GAUGE_SIZES = {
	sm: { size: 80, stroke: 6 },
	md: { size: 120, stroke: 8 },
	lg: { size: 160, stroke: 10 },
} as const;

export function CircularGauge({
	value,
	size = "md",
	color = "var(--color-primary)",
	label,
	className,
}: CircularGaugeProps) {
	// Clamp value between 0-100
	const clampedValue = Math.min(100, Math.max(0, value));

	const { size: diameter, stroke } = GAUGE_SIZES[size];
	const radius = (diameter - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (clampedValue / 100) * circumference;

	return (
		<div
			className={cn(
				"relative inline-flex items-center justify-center",
				className,
			)}
			style={{ width: diameter, height: diameter }}
			role="meter"
			aria-valuenow={clampedValue}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={label || `${clampedValue}% progress`}
		>
			{/* Background circle */}
			<svg
				className="transform -rotate-90"
				width={diameter}
				height={diameter}
				role="img"
				aria-label={`Progress gauge showing ${value}%`}
			>
				<circle
					cx={diameter / 2}
					cy={diameter / 2}
					r={radius}
					fill="none"
					stroke="var(--color-muted)"
					strokeWidth={stroke}
					opacity={0.2}
				/>
				{/* Progress arc */}
				<circle
					cx={diameter / 2}
					cy={diameter / 2}
					r={radius}
					fill="none"
					stroke={color}
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					className="transition-[stroke-dashoffset] duration-500 ease-out"
				/>
			</svg>

			{/* Center content */}
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span className="text-3xl font-bold tabular-nums">
					{Math.round(clampedValue)}%
				</span>
				{label && (
					<span className="text-xs text-muted-foreground mt-1">{label}</span>
				)}
			</div>
		</div>
	);
}
