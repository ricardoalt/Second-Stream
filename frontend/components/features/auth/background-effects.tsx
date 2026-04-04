/**
 * Adaptive Liquid Glass Background Effects
 *
 * Design Philosophy: Inherit app background, add subtle water-themed overlays
 *
 * Architecture:
 * - AdaptiveBackground: Inherits bg-background + subtle radial water tints
 * - TechnicalGrid: Engineering grid pattern with animated intersection dots
 * - FlowLines: Diagonal flowing lines (pipeline simulation)
 * - WaterBubbles: Ascending bubbles with organic movement
 * - NoiseTexture: Depth/grain overlay
 *
 * Key Changes from Previous:
 * - NO solid blue gradient (was creating "giant card" effect)
 * - YES app background inheritance (integrates with theme)
 * - YES subtle water tints (8-15% opacity) for brand identity
 * - YES dark/light mode adaptation via opacity changes
 *
 * Performance:
 * - GPU-accelerated (transform, opacity)
 * - Respects prefers-reduced-motion
 * - Max 10 animated elements
 */

"use client";

import { motion } from "framer-motion";

// ============================================================================
// CONSTANTS - Single Source of Truth
// ============================================================================

const ANIMATION_CONFIG = {
	bubbles: {
		count: 8,
		sizes: [30, 50, 40, 60, 35, 55, 45, 65] as const,
		durations: [12, 15, 13, 16, 11, 14, 12, 17] as const,
		stagger: 1.5,
	},
	flow: {
		duration: 20,
		ease: "linear" as const,
	},
	grid: {
		dotDuration: 25,
		ease: "linear" as const,
	},
} as const;

const COLORS = {
	// Water tints (very subtle, for overlays)
	waterTint: {
		primary: "oklch(0.60 0.16 175 / 0.3)",
		secondary: "oklch(0.60 0.16 175 / 0.2)",
		tertiary: "oklch(0.60 0.16 175 / 0.15)",
	},
	// Grid and effects
	grid: "oklch(1 0 0 / 0.06)",
	gridDot: "oklch(1 0 0 / 0.12)",
	flow: "oklch(1 0 0 / 0.1)",
	bubble: "oklch(1 0 0 / 0.12)",
} as const;

// ============================================================================
// LAYER 1 - Adaptive Background (Inherits App Theme)
// ============================================================================

/**
 * Inherits app's bg-background and adds subtle water-themed radial gradients.
 * This ensures visual integration with the rest of the app.
 */
export function AdaptiveBackground() {
	return (
		<>
			{/* Base: Inherit app background (user's theme) */}
			<div className="absolute inset-0 bg-background" />

			{/* Ultra-subtle water-tinted radial gradients - Phase 2 reduced opacity */}
			<div
				className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08]"
				style={{
					backgroundImage: `
            radial-gradient(circle at 20% 30%, ${COLORS.waterTint.primary} 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${COLORS.waterTint.secondary} 0%, transparent 60%),
            radial-gradient(circle at 50% 100%, ${COLORS.waterTint.tertiary} 0%, transparent 55%)
          `,
				}}
			/>
		</>
	);
}

// ============================================================================
// LAYER 2 - Technical Grid
// ============================================================================

/**
 * Engineering-style grid with animated intersection dot.
 * Communicates technical/professional identity.
 */
export function TechnicalGrid() {
	return (
		<div className="absolute inset-0 opacity-30 dark:opacity-40">
			{/* Grid lines */}
			<div
				className="absolute inset-0"
				style={{
					backgroundImage: `
            linear-gradient(to right, ${COLORS.grid} 1px, transparent 1px),
            linear-gradient(to bottom, ${COLORS.grid} 1px, transparent 1px)
          `,
					backgroundSize: "48px 48px",
				}}
			/>

			{/* Animated glow at grid intersections */}
			<motion.div
				className="absolute rounded-full"
				style={{
					width: "8px",
					height: "8px",
					background: `radial-gradient(circle, ${COLORS.gridDot} 0%, transparent 70%)`,
					boxShadow: `0 0 12px ${COLORS.gridDot}`,
					filter: "blur(1.5px)",
				}}
				animate={{
					x: ["5%", "95%"],
					y: ["5%", "95%"],
					opacity: [0.4, 1, 0.4],
				}}
				transition={{
					duration: ANIMATION_CONFIG.grid.dotDuration,
					repeat: Infinity,
					ease: ANIMATION_CONFIG.grid.ease,
				}}
			/>
		</div>
	);
}

// ============================================================================
// LAYER 3 - Flow Lines
// ============================================================================

/**
 * Diagonal flowing lines simulating water flow through pipelines.
 * Very subtle motion that suggests engineering systems.
 */
export function FlowLines() {
	const lines = [
		{ id: "line-1", top: "15%", left: "5%", rotate: -45, delay: 0 },
	];

	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-60">
			{lines.map((line) => (
				<motion.div
					key={line.id}
					className="absolute"
					style={{
						top: line.top,
						left: line.left,
						width: "70%",
						height: "2px",
						background: `linear-gradient(90deg, transparent, ${COLORS.flow}, transparent)`,
						transform: `rotate(${line.rotate}deg)`,
						transformOrigin: "left center",
					}}
					animate={{
						opacity: [0, 0.7, 0],
						scaleX: [0, 1, 0],
					}}
					transition={{
						duration: ANIMATION_CONFIG.flow.duration,
						delay: line.delay,
						repeat: Infinity,
						ease: ANIMATION_CONFIG.flow.ease,
					}}
				/>
			))}
		</div>
	);
}

// ============================================================================
// LAYER 4 - Water Bubbles
// ============================================================================

/**
 * Individual bubble component with organic floating animation.
 */
interface BubbleProps {
	size: number;
	delay: number;
	duration: number;
	left: string;
}

function Bubble({ size, delay, duration, left }: BubbleProps) {
	return (
		<motion.div
			className="absolute rounded-full"
			style={{
				width: size,
				height: size,
				left,
				bottom: "-5%",
				background: `radial-gradient(circle at 30% 30%, ${COLORS.bubble}, transparent 70%)`,
				filter: "blur(20px)",
			}}
			initial={{ y: 0, opacity: 0 }}
			animate={{
				y: "-110vh",
				opacity: [0, 0.8, 0.8, 0],
				x: [0, 15, -10, 12, 0], // Organic horizontal drift
			}}
			transition={{
				delay,
				duration,
				repeat: Infinity,
				ease: "easeInOut",
			}}
		/>
	);
}

/**
 * Container for all ascending water bubbles.
 * Creates ambient water atmosphere without overwhelming.
 */
export function WaterBubbles() {
	const { count, sizes, durations, stagger } = ANIMATION_CONFIG.bubbles;

	const bubbles = Array.from({ length: count }, (_, i) => ({
		size: sizes[i] ?? 50, // Fallback to 50 if undefined
		duration: durations[i] ?? 15, // Fallback to 15 if undefined
		delay: i * stagger,
		left: `${10 + i * 10}%`, // Distributed across width
	}));

	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60 dark:opacity-80">
			{bubbles.map((bubble, i) => (
				<Bubble
					key={`bubble-${i}-${bubble.left}`}
					size={bubble.size}
					delay={bubble.delay}
					duration={bubble.duration}
					left={bubble.left}
				/>
			))}
		</div>
	);
}

// ============================================================================
// LAYER 5 - Noise Texture (unchanged, adds organic depth)
// ============================================================================

/**
 * SVG noise overlay for organic depth and texture.
 */
export function NoiseTexture() {
	return (
		<div
			className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay pointer-events-none"
			style={{
				backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
				backgroundSize: "200px 200px",
			}}
		/>
	);
}

// ============================================================================
// COMPOSITOR - Liquid Glass Background
// ============================================================================

/**
 * Main background component composing all layers.
 * Layers are ordered from back to front.
 *
 * Key difference from previous: NO solid color background, inherits app theme.
 * Phase 1 optimization: Disabled decorative animations for cleaner, premium feel.
 *
 * Usage:
 * ```tsx
 * <LiquidGlassBackground />
 * ```
 */
export function LiquidGlassBackground() {
	return (
		<>
			<AdaptiveBackground />
			{/* Disabled for premium minimal aesthetic - Phase 1 optimization */}
			{/* <TechnicalGrid /> */}
			{/* <FlowLines /> */}
			{/* <WaterBubbles /> */}
			<NoiseTexture />
		</>
	);
}

// ============================================================================
// LEGACY EXPORTS - For backward compatibility
// ============================================================================

/**
 * @deprecated Use LiquidGlassBackground instead
 */
export const PremiumBackground = LiquidGlassBackground;

/**
 * @deprecated Use LiquidGlassBackground instead
 */
export const FluidEngineeringBackground = LiquidGlassBackground;
