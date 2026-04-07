"use client";

import {
	useInView,
	useMotionValue,
	useReducedMotion,
	useSpring,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber - Number counting animation component (2026 Optimized)
 *
 * Animates from 0 to target value with spring physics
 *
 * 2026 best practices:
 * - Respects reduced-motion preference
 * - Spring config: damping 50, stiffness 100, mass 1
 * - Triggers only when in viewport (once)
 * - GPU-accelerated (no layout changes)
 *
 * @example
 * <AnimatedNumber value={124500} prefix="$" />
 * <AnimatedNumber value={42} suffix="%" />
 * <AnimatedNumber value={150} duration={1.5} />
 */

interface AnimatedNumberProps {
	/** Target value to animate to */
	value: number;
	/** Prefix (e.g., "$", "€") */
	prefix?: string;
	/** Suffix (e.g., "%", "K") */
	suffix?: string;
	/** Decimal places (default: 0) */
	decimals?: number;
	/** CSS class */
	className?: string;
	/** Format as compact (1.2K instead of 1200) */
	compact?: boolean;
}

export function AnimatedNumber({
	value,
	prefix = "",
	suffix = "",
	decimals = 0,
	className,
	compact = false,
}: AnimatedNumberProps) {
	const ref = useRef<HTMLSpanElement>(null);
	const shouldReduceMotion = useReducedMotion();
	const isInView = useInView(ref, { once: true, margin: "-50px" });

	const motionValue = useMotionValue(0);
	const springValue = useSpring(motionValue, {
		// 2026 optimized spring config for counters
		damping: 50,
		stiffness: 100,
		mass: 1,
	});

	const [displayValue, setDisplayValue] = useState(0);

	// Skip animation if reduced motion preferred
	useEffect(() => {
		if (shouldReduceMotion) {
			setDisplayValue(value);
			return;
		}

		if (isInView) {
			motionValue.set(value);
		}
	}, [motionValue, value, isInView, shouldReduceMotion]);

	useEffect(() => {
		if (shouldReduceMotion) return;

		const unsubscribe = springValue.on("change", (latest) => {
			setDisplayValue(latest);
		});
		return unsubscribe;
	}, [springValue, shouldReduceMotion]);

	const formatNumber = (num: number): string => {
		if (compact && num >= 1000) {
			return `${(num / 1000).toFixed(1)}K`;
		}
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
