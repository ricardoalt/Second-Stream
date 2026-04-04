/**
 * AuthLayout Component - Premium Edition
 *
 * Shared layout for authentication pages (login, register, etc.)
 * Features:
 * - Split-screen design with premium aesthetics
 * - Glassmorphic cards and effects
 * - Animated backgrounds (mesh gradient, floating orbs, grid pattern)
 * - Stats cards with animated numbers
 * - Premium testimonial with avatar
 * - Mobile-responsive (stacks vertically)
 * - Smooth page transitions with Framer Motion
 *
 * @example
 * <AuthLayout
 *   title="Welcome back"
 *   subtitle="Sign in to your account"
 * >
 *   <LoginForm />
 * </AuthLayout>
 */

"use client";

import { motion } from "framer-motion";
import type * as React from "react";
import { DSRLogo } from "@/components/shared/branding/dsr-logo";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LiquidGlassBackground } from "./background-effects";
import { StatsGrid } from "./stats-card";

export interface AuthLayoutProps {
	/** Main heading */
	title: string;
	/** Subtitle or description */
	subtitle?: string | undefined;
	/** Form content */
	children: React.ReactNode;
	/** Additional footer content (e.g., links) */
	footer?: React.ReactNode | undefined;
	/** Show the branded left panel */
	showBrandPanel?: boolean | undefined;
	/** Additional CSS classes */
	className?: string | undefined;
}

export function AuthLayout({
	title,
	subtitle,
	children,
	footer,
	showBrandPanel = true,
	className,
}: AuthLayoutProps) {
	const stats = [
		{ value: "10min", label: "Avg. analysis time" },
		{ value: "95%", label: "Deal accuracy" },
		{ value: "200+", label: "Streams assessed" },
	];

	return (
		<div className="min-h-screen w-full flex" suppressHydrationWarning>
			{/* Left Panel - Premium Brand Experience (Desktop only) */}
			{showBrandPanel && (
				<motion.div
					suppressHydrationWarning
					initial={{ opacity: 0, x: -50 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5 }}
					className="hidden lg:flex lg:w-1/2 p-12 items-center justify-center relative overflow-hidden"
				>
					{/* Liquid glass animated background */}
					<LiquidGlassBackground />

					{/* Content */}
					<div className="relative z-10 max-w-lg w-full space-y-12 lg:space-y-16">
						{/* Logo & Brand - Simplified */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1, duration: 0.5 }}
							className="inline-flex"
						>
							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="flex-shrink-0"
							>
								<DSRLogo width={220} height={90} />
							</motion.div>
						</motion.div>

						{/* Value Proposition */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="space-y-4"
						>
							<h2 className="text-4xl lg:text-5xl font-bold text-foreground dark:text-white leading-[1.1] tracking-tight">
								Analyze Opportunities in Minutes
							</h2>
							<p className="text-foreground/80 dark:text-white/90 text-lg leading-relaxed">
								Transform waste into revenue. AI-powered deal analysis
								identifies profitable circularity opportunities in industrial
								waste streams.
							</p>
						</motion.div>

						{/* Stats Cards - Primary social proof */}
						<StatsGrid stats={stats} />
					</div>
				</motion.div>
			)}

			{/* Right Panel - Premium Form */}
			<div
				className={cn(
					"flex-1 flex items-center justify-center p-6 relative",
					"bg-gradient-to-br from-background via-background to-primary/5",
					showBrandPanel ? "lg:w-1/2" : "w-full",
					className,
				)}
			>
				{/* Subtle noise texture for depth */}
				<div
					className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
					style={{
						backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
						backgroundSize: "100px 100px",
					}}
				/>

				<motion.div
					suppressHydrationWarning
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: showBrandPanel ? 0.3 : 0, duration: 0.4 }}
					className="w-full max-w-md relative z-10"
				>
					{/* Glassmorphic card wrapper with glow */}
					<div className="relative group">
						{/* Animated gradient glow effect */}
						<motion.div
							className="absolute -inset-1 rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition duration-500"
							animate={{
								background: [
									"linear-gradient(45deg, oklch(0.60 0.16 175) 0%, oklch(0.60 0.16 175 / 0.5) 100%)",
									"linear-gradient(90deg, oklch(0.60 0.16 175 / 0.8) 0%, oklch(0.60 0.16 175) 100%)",
									"linear-gradient(180deg, oklch(0.60 0.16 175) 0%, oklch(0.60 0.16 175 / 0.6) 100%)",
									"linear-gradient(270deg, oklch(0.60 0.16 175 / 0.7) 0%, oklch(0.60 0.16 175) 100%)",
									"linear-gradient(45deg, oklch(0.60 0.16 175) 0%, oklch(0.60 0.16 175 / 0.5) 100%)",
								],
							}}
							transition={{
								duration: 8,
								repeat: Infinity,
								ease: "linear",
							}}
						/>

						{/* Main card - Sin glassmorphism */}
						<Card className="relative bg-card border border-border shadow-xl rounded-2xl">
							<CardHeader className="space-y-3 text-center">
								{/* Mobile Logo (shown when brand panel is hidden) */}
								{!showBrandPanel && (
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: "spring", stiffness: 200 }}
										className="mx-auto"
									>
										<DSRLogo width={176} height={72} />
									</motion.div>
								)}

								<CardTitle className="text-3xl font-bold tracking-tight">
									{title}
								</CardTitle>

								{subtitle && (
									<CardDescription className="text-base">
										{subtitle}
									</CardDescription>
								)}
							</CardHeader>

							<CardContent>
								{/* Form Content */}
								{children}

								{/* Footer (e.g., "Don't have an account? Register") */}
								{footer && (
									<div className="mt-6 pt-6 border-t border-border/50">
										{footer}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Additional Footer Links */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.6 }}
						className="mt-6 text-center text-sm text-muted-foreground"
					>
						<p>
							By continuing, you agree to our{" "}
							<a
								href="/terms"
								className="underline hover:text-foreground transition-colors"
							>
								Terms of Service
							</a>{" "}
							and{" "}
							<a
								href="/privacy"
								className="underline hover:text-foreground transition-colors"
							>
								Privacy Policy
							</a>
							.
						</p>
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
}

/**
 * Compact auth layout without brand panel
 * Use for password reset, email verification, etc.
 */
export function CompactAuthLayout({
	title,
	subtitle,
	children,
	footer,
}: Omit<AuthLayoutProps, "showBrandPanel" | "className">) {
	return (
		<AuthLayout
			title={title}
			subtitle={subtitle}
			showBrandPanel={false}
			footer={footer}
		>
			{children}
		</AuthLayout>
	);
}
