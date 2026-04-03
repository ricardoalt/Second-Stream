"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * 2026 Animation Best Practices Constants
 */
const EASINGS = {
	// Premium easeOut - rápido al inicio, suave al final
	enter: [0.16, 1, 0.3, 1] as const,
	// Smooth easeInOut - equilibrado
	smooth: [0.4, 0, 0.2, 1] as const,
	// Exit - rápido al final
	exit: [0.4, 0, 1, 1] as const,
};

const DURATIONS = {
	micro: 0.15, // hover, active states
	fast: 0.2, // buttons, toggles
	normal: 0.35, // cards, modals entering
	slow: 0.45, // layout shifts
};

/**
 * FadeIn - Elegant fade in animation wrapper (2026 Optimized)
 *
 * Features:
 * - Respects reduced-motion preference
 * - GPU-accelerated (only transform/opacity)
 * - 2026 easing curves for premium feel
 * - Auto will-change management
 *
 * @example
 * <FadeIn>
 *   <Card>Content</Card>
 * </FadeIn>
 *
 * <FadeIn direction="up" delay={0.2} duration={0.35}>
 *   <KpiCard ... />
 * </FadeIn>
 */

interface FadeInProps {
	children: ReactNode;
	/** Animation direction */
	direction?: "up" | "down" | "left" | "right" | "none";
	/** Delay in seconds */
	delay?: number;
	/** Duration in seconds (default: 0.35s - 2026 standard) */
	duration?: number;
	/** Additional classes */
	className?: string;
	/** Enable hover scale effect */
	hoverScale?: boolean;
	/** Enable hover lift effect */
	hoverLift?: boolean;
}

const directionOffset = {
	up: { y: 20 }, // 2026: slightly less offset for subtlety
	down: { y: -20 },
	left: { x: 20 },
	right: { x: -20 },
	none: {},
};

export function FadeIn({
	children,
	direction = "up",
	delay = 0,
	duration = DURATIONS.normal,
	className,
	hoverScale = false,
	hoverLift = false,
}: FadeInProps) {
	const shouldReduceMotion = useReducedMotion();
	const ref = useRef<HTMLDivElement>(null);
	const offset = directionOffset[direction];

	// Auto will-change management
	useEffect(() => {
		if (!ref.current || shouldReduceMotion) {
			return undefined;
		}
		ref.current.style.willChange = "transform, opacity";
		const timer = setTimeout(
			() => {
				if (ref.current) {
					ref.current.style.willChange = "auto";
				}
			},
			(duration + delay) * 1000 + 100,
		);
		return () => clearTimeout(timer);
	}, [duration, delay, shouldReduceMotion]);

	// Skip animation if reduced motion preferred
	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	// Build whileHover config conditionally to avoid undefined in types
	const whileHoverConfig = hoverScale
		? { scale: 1.02, transition: { duration: DURATIONS.micro } }
		: hoverLift
			? { y: -4, transition: { duration: DURATIONS.micro } }
			: undefined;

	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, ...offset }}
			whileInView={{ opacity: 1, x: 0, y: 0 }}
			viewport={{ once: true, margin: "-100px" }}
			transition={{
				duration,
				delay,
				ease: EASINGS.enter, // 2026 premium easing
			}}
			{...(whileHoverConfig ? { whileHover: whileHoverConfig } : {})}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * StaggerContainer - Container for staggered children animations (2026 Snappy)
 *
 * Features:
 * - staggerDelay: 0.06s (snappy default)
 * - Respects reduced-motion preference
 * - GPU-accelerated
 *
 * @example
 * <StaggerContainer staggerDelay={0.06} initialDelay={0.2}>
 *   {items.map((item) => (
 *     <StaggerItem key={item.id}>
 *       <Card>{item.name}</Card>
 *     </StaggerItem>
 *   ))}
 * </StaggerContainer>
 */

interface StaggerContainerProps {
	children: ReactNode;
	/** Delay between each child (2026: 0.05-0.1s recommended) */
	staggerDelay?: number;
	/** Initial delay before starting */
	initialDelay?: number;
	className?: string;
}

export function StaggerContainer({
	children,
	staggerDelay = 0.06, // 2026: snappy - más rápido para mejor UX
	initialDelay = 0,
	className,
}: StaggerContainerProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<motion.div
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: "-100px" }}
			variants={{
				hidden: {},
				visible: {
					transition: {
						staggerChildren: staggerDelay,
						delayChildren: initialDelay,
					},
				},
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

interface StaggerItemProps {
	children: ReactNode;
	direction?: "up" | "down" | "left" | "right";
	className?: string;
	/** Duration override (default: 0.35s) */
	duration?: number;
}

export function StaggerItem({
	children,
	direction = "up",
	className,
	duration = DURATIONS.normal,
}: StaggerItemProps) {
	const shouldReduceMotion = useReducedMotion();
	const offset = directionOffset[direction];

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<motion.div
			variants={{
				hidden: { opacity: 0, ...offset },
				visible: {
					opacity: 1,
					x: 0,
					y: 0,
					transition: {
						duration,
						ease: EASINGS.enter, // 2026 premium easing
					},
				},
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * Pressable - Button press animation wrapper (2026 Optimized)
 *
 * 2026 micro-interaction best practices:
 * - Duration: 150ms (instantáneo pero perceptible)
 * - Scale: 0.97-0.98 (sutil)
 * - Ease: smooth for feedback
 *
 * @example
 * <Pressable>
 *   <Button>Click me</Button>
 * </Pressable>
 */

interface PressableProps {
	children: ReactNode;
	className?: string;
	/** Scale on press (2026: 0.97-0.98 recommended) */
	scale?: number;
	/** Scale on hover */
	hoverScale?: number;
}

export function Pressable({
	children,
	className,
	scale = 0.97,
	hoverScale = 1.01,
}: PressableProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<motion.div
			whileHover={{
				scale: hoverScale,
				transition: { duration: DURATIONS.micro },
			}}
			whileTap={{ scale, transition: { duration: DURATIONS.micro } }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * HoverLift - Card hover lift effect (2026 Optimized)
 *
 * Features:
 * - GPU-accelerated (transform only)
 * - 2026: y: -4px is the sweet spot (not too much)
 * - 150ms for micro-interaction feel
 *
 * @example
 * <HoverLift>
 *   <KpiCard ... />
 * </HoverLift>
 *
 * <HoverLift y={-6} duration={0.15}>
 *   <Card>More prominent lift</Card>
 * </HoverLift>
 */

interface HoverLiftProps {
	children: ReactNode;
	className?: string;
	/** Lift amount in pixels (2026: -4 is standard, -6 prominent) */
	y?: number;
	/** Duration in seconds (default: 0.15s) */
	duration?: number;
}

export function HoverLift({
	children,
	className,
	y = -4,
	duration = DURATIONS.micro,
}: HoverLiftProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <div className={className}>{children}</div>;
	}

	return (
		<motion.div
			whileHover={{
				y,
				transition: { duration, ease: EASINGS.smooth },
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * AnimatedCounter - Animated number counter (2026 Optimized)
 *
 * 2026 best practices for counters:
 * - Spring physics with mass/stiffness/damping
 * - Respects reduced-motion
 * - Triggers when in viewport
 *
 * @example
 * <AnimatedCounter value={124500} prefix="$" duration={1.5} />
 */

interface AnimatedCounterProps {
	value: number;
	prefix?: string;
	suffix?: string;
	decimals?: number;
	/** Duration in seconds (default: 1.5s) */
	duration?: number;
	className?: string;
}

import {
	useInView,
	useMotionValue,
	useSpring,
	useTransform,
} from "framer-motion";

export function AnimatedCounter({
	value,
	prefix = "",
	suffix = "",
	decimals = 0,
	duration = 1.5,
	className,
}: AnimatedCounterProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const isInView = useInView(ref, { once: true, margin: "-50px" });
	const shouldReduceMotion = useReducedMotion();

	const motionValue = useMotionValue(0);
	const springValue = useSpring(motionValue, {
		// 2026 optimized spring config
		damping: 50,
		stiffness: 100,
		mass: 1,
	});

	const [displayValue, setDisplayValue] = useState(0);

	useEffect(() => {
		if (isInView && !shouldReduceMotion) {
			motionValue.set(value);
		}
	}, [motionValue, value, isInView, shouldReduceMotion]);

	useEffect(() => {
		if (shouldReduceMotion) {
			setDisplayValue(value);
			return;
		}

		const unsubscribe = springValue.on("change", (latest) => {
			setDisplayValue(latest);
		});
		return unsubscribe;
	}, [springValue, shouldReduceMotion, value]);

	const formatNumber = (num: number): string => {
		return num.toFixed(decimals);
	};

	return (
		<span ref={ref} className={className}>
			{prefix}
			{formatNumber(displayValue)}
			{suffix}
		</span>
	);
}

import { useState } from "react";
