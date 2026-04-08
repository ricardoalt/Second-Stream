"use client";

import {
	Beaker,
	Calculator,
	Cog,
	Droplets,
	Loader2,
	Settings,
	Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Loading Spinner with Context
interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	context?:
		| "calculating"
		| "generating"
		| "saving"
		| "loading"
		| "analyzing"
		| "processing"
		| "optimizing";
	message?: string;
	className?: string;
}

export function LoadingSpinner({
	size = "md",
	context = "loading",
	message,
	className,
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "h-4 w-4",
		md: "h-6 w-6",
		lg: "h-8 w-8",
	};

	const contextIcons = {
		calculating: Calculator,
		generating: Zap,
		saving: Settings,
		loading: Loader2,
		analyzing: Beaker,
		processing: Droplets,
		optimizing: Cog,
	};

	const contextMessages = {
		calculating: "Calculating flow rates and dimensions...",
		generating: "Generating conceptual proposal...",
		saving: "Saving technical data...",
		loading: "Loading project...",
		analyzing: "Analyzing water parameters...",
		processing: "Processing hydraulic data...",
		optimizing: "Optimizing treatment configuration...",
	};

	const Icon = contextIcons[context];
	const displayMessage = message || contextMessages[context];

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div className="relative">
				<Icon className={cn("animate-spin text-primary", sizeClasses[size])} />
				<div className="absolute inset-0 animate-pulse">
					<Icon className={cn("text-primary/30", sizeClasses[size])} />
				</div>
			</div>
			{displayMessage && (
				<span className="text-sm text-muted-foreground animate-shimmer">
					{displayMessage}
				</span>
			)}
		</div>
	);
}

// Enhanced Project Card Skeleton
export function ProjectCardSkeleton({ className }: { className?: string }) {
	return (
		<Card
			className={cn(
				"h-full bg-card/80 backdrop-blur-sm border border-border/50 animate-pulse",
				className,
			)}
		>
			<CardHeader className="space-y-3 border-b border-border/30 bg-gradient-to-br from-card/50 to-card/30 py-4 backdrop-blur-sm">
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 w-10 rounded-lg" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<div className="flex items-center gap-2">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-3 w-24" />
							</div>
						</div>
					</div>
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-16 rounded-full" />
					<Skeleton className="h-3 w-28" />
				</div>
			</CardHeader>
			<CardContent className="space-y-4 py-5">
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1">
						<Skeleton className="h-3 w-12" />
						<Skeleton className="h-3 w-16" />
					</div>
					<div className="space-y-1">
						<Skeleton className="h-3 w-14" />
						<Skeleton className="h-3 w-18" />
					</div>
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-3 w-32" />
					<Skeleton className="h-5 w-8 ml-auto" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-3 w-36" />
					<Skeleton className="h-5 w-6 ml-auto" />
				</div>
				<div className="flex gap-2 pt-2">
					<Skeleton className="h-9 flex-1 rounded-md" />
					<Skeleton className="h-9 flex-1 rounded-md" />
				</div>
			</CardContent>
		</Card>
	);
}

// Technical Data Form Skeleton
export function TechnicalFormSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="surface-subtle rounded-3xl p-6 space-y-4">
				<div className="flex items-center gap-3">
					<Skeleton className="h-5 w-5" />
					<Skeleton className="h-4 w-32" />
				</div>
				<Skeleton className="h-8 w-80" />
				<Skeleton className="h-4 w-96" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-24 rounded-full" />
					<Skeleton className="h-8 w-28 rounded-full" />
				</div>
			</div>

			{/* Progress Banner */}
			<div className="rounded-3xl border border-warning/30 bg-warning/10 p-5 space-y-3">
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-5" />
					<Skeleton className="h-4 w-48" />
				</div>
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-24 rounded-full" />
					<Skeleton className="h-8 w-32 rounded-full" />
				</div>
			</div>

			{/* Tabs */}
			<div className="space-y-6">
				<div className="flex gap-2">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-10 w-20" />
					))}
				</div>

				{/* Form Fields */}
				<Card className="rounded-3xl border-none bg-card/85">
					<CardContent className="p-6 space-y-6">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
							>
								{[1, 2, 3].map((j) => (
									<div key={j} className="space-y-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-10 w-full" />
									</div>
								))}
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

// Proposal Generation Loading
export function ProposalGenerationLoader() {
	return (
		<Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-xl relative overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
			<CardContent className="relative p-8 text-center space-y-6">
				<div className="mx-auto w-12 h-12 rounded-full bg-muted/50 backdrop-blur-sm shadow-lg hover:animate-pulse flex items-center justify-center">
					<Zap className="h-6 w-6 text-primary animate-pulse" />
				</div>

				<div className="space-y-2">
					<h3 className="text-lg font-semibold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
						Generating conceptual proposal
					</h3>
					<p className="text-sm text-muted-foreground">
						Analyzing technical parameters and calculating optimal solutions...
					</p>
				</div>

				<div className="w-full max-w-md mx-auto space-y-3">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>Progress</span>
						<span>~2-3 minutes</span>
					</div>
					<div className="h-2 bg-muted/30 backdrop-blur-sm rounded-full overflow-hidden">
						<div
							className="h-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-1000"
							style={{ width: "45%" }}
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-success rounded-full animate-pulse" />
						<span className="text-muted-foreground">Parameters validated</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
						<span className="text-muted-foreground">Calculating treatment</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-muted rounded-full" />
						<span className="text-muted-foreground">Generating report</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// Success Animation Component
interface SuccessIndicatorProps {
	message?: string;
	show?: boolean;
	onComplete?: () => void;
}

export function SuccessIndicator({
	message = "Saved successfully",
	show = false,
	onComplete: _onComplete,
}: SuccessIndicatorProps) {
	return (
		<div
			className={cn(
				"fixed top-4 right-4 z-50 transition-[opacity,transform] duration-300",
				show
					? "opacity-100 translate-y-0"
					: "opacity-0 -translate-y-2 pointer-events-none",
			)}
		>
			<div className="bg-success text-success-foreground px-4 py-2 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-2">
				<div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
					<div className="w-2 h-2 bg-white rounded-full animate-ping" />
				</div>
				<span className="text-sm font-medium">{message}</span>
			</div>
		</div>
	);
}

// Technical Data Loading Animation
export function TechnicalDataLoader({
	stage = "analyzing",
	progress = 0,
}: {
	stage?: "analyzing" | "calculating" | "generating" | "finalizing";
	progress?: number;
}) {
	const stageData = {
		analyzing: {
			icon: Beaker,
			title: "Analyzing Parameters",
			description: "Validating water quality and contaminant loads...",
			color: "text-primary",
		},
		calculating: {
			icon: Calculator,
			title: "Calculating Dimensions",
			description: "Determining reactor volumes and equipment...",
			color: "text-success",
		},
		generating: {
			icon: Cog,
			title: "Generating Configuration",
			description: "Optimizing treatment process...",
			color: "text-treatment-auxiliary",
		},
		finalizing: {
			icon: Zap,
			title: "Finalizing Proposal",
			description: "Preparing technical documentation...",
			color: "text-warning",
		},
	};

	const current = stageData[stage];
	const Icon = current.icon;

	return (
		<Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg relative overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10" />
			<CardContent className="relative p-6">
				<div className="flex items-center gap-4">
					<div className="bg-muted/50 backdrop-blur-sm p-3 rounded-xl hover:animate-pulse">
						<Icon className={cn("h-6 w-6", current.color)} />
					</div>
					<div className="flex-1 space-y-2">
						<h3 className="font-semibold text-foreground">{current.title}</h3>
						<p className="text-sm text-muted-foreground">
							{current.description}
						</p>
						<div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
							<div
								className="h-full bg-[var(--gradient-progress)] transition-[width] duration-1000 ease-out"
								style={{ width: `${Math.min(progress, 100)}%` }}
							/>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
