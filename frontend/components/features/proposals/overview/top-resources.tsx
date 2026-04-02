"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	Camera,
	CheckCircle2,
	ImageIcon,
	ImageOff,
	Upload,
	X,
	ZoomIn,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Image Lightbox Modal
function ImageLightbox({
	src,
	alt,
	onClose,
}: {
	src: string;
	alt: string;
	onClose: () => void;
}) {
	// Close on Escape key
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		},
		[onClose],
	);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "";
		};
	}, [handleKeyDown]);

	// Use portal to render at document.body level (escapes parent transforms)
	if (typeof document === "undefined") return null;

	return createPortal(
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
			onClick={onClose}
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
			>
				<X className="h-6 w-6 text-white" />
			</button>
			<motion.img
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.9, opacity: 0 }}
				transition={{ duration: 0.2 }}
				src={src}
				alt={alt}
				className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			/>
			<p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
				{alt} - Click outside or press Escape to close
			</p>
		</motion.div>,
		document.body,
	);
}

export interface ResourceInsight {
	id: string;
	fileId?: string;
	imageUrl?: string; // Presigned URL from backend
	material: string;
	quality: "High" | "Medium" | "Low";
	lifecycle?:
		| "Like-new"
		| "Good"
		| "Used"
		| "Degraded"
		| "End-of-life"
		| undefined;
	priceHint: string;
	insight: string;
	confidence: number;
}

interface TopResourcesProps {
	insights?: ResourceInsight[];
	onUploadClick?: () => void;
}

const LIFECYCLE_CONFIG = {
	"Like-new": { color: "bg-success", label: "Like-new" },
	Good: { color: "bg-success/80", label: "Good" },
	Used: { color: "bg-warning", label: "Used" },
	Degraded: { color: "bg-warning/80", label: "Degraded" },
	"End-of-life": { color: "bg-destructive", label: "End-of-life" },
} as const;

const QUALITY_CONFIG = {
	High: {
		border: "border-success",
		text: "text-success",
	},
	Medium: {
		border: "border-warning",
		text: "text-warning",
	},
	Low: { border: "border-destructive", text: "text-destructive" },
} as const;

// Empty State Component
function TopResourcesEmpty({
	onUploadClick,
}: {
	onUploadClick?: (() => void) | undefined;
}) {
	return (
		<Card className="border-dashed">
			<CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
				<div className="rounded-full bg-muted p-4">
					<Camera className="h-8 w-8 text-muted-foreground" />
				</div>
				<div className="space-y-1">
					<h3 className="text-base font-semibold text-foreground">
						No photos uploaded
					</h3>
					<p className="text-sm text-muted-foreground max-w-xs">
						Upload site photos to get AI-powered material analysis and pricing
						insights.
					</p>
				</div>
				{onUploadClick && (
					<Button
						onClick={onUploadClick}
						variant="outline"
						size="sm"
						className="gap-2"
					>
						<Upload className="h-4 w-4" />
						Upload Photos
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

export function TopResources({
	insights = [],
	onUploadClick,
}: TopResourcesProps) {
	const [lightboxImage, setLightboxImage] = useState<{
		url: string;
		alt: string;
	} | null>(null);

	const handleImageClick = (url: string, alt: string) => {
		setLightboxImage({ url, alt });
	};

	// Show empty state when no insights
	if (insights.length === 0) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Camera className="h-5 w-5 text-primary" />
							Photo Evidence
						</h3>
						<p className="text-sm text-muted-foreground">
							Resources identified from site photos
						</p>
					</div>
				</div>
				<TopResourcesEmpty onUploadClick={onUploadClick} />
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Camera className="h-5 w-5 text-primary" />
							Photo Evidence
						</h3>
						<p className="text-sm text-muted-foreground">
							Resources identified from site photos
						</p>
					</div>
					<Badge variant="outline" className="h-7">
						{insights.length} Detected
					</Badge>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{insights.map((item, idx) => (
						<ResourceCard
							key={item.id}
							item={item}
							index={idx}
							onImageClick={handleImageClick}
						/>
					))}
				</div>
			</div>

			{/* Image Lightbox Modal */}
			<AnimatePresence>
				{lightboxImage && (
					<ImageLightbox
						src={lightboxImage.url}
						alt={lightboxImage.alt}
						onClose={() => setLightboxImage(null)}
					/>
				)}
			</AnimatePresence>
		</>
	);
}

function ResourceCard({
	item,
	index,
	onImageClick,
}: {
	item: ResourceInsight;
	index: number;
	onImageClick?: (url: string, alt: string) => void;
}) {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);

	const lifecycleConfig = item.lifecycle
		? LIFECYCLE_CONFIG[item.lifecycle]
		: null;
	const qualityConfig = QUALITY_CONFIG[item.quality];

	// Use presigned URL from backend (no auth required)
	const imageUrl = item.imageUrl || null;
	const canExpand = imageUrl && !imageError && imageLoaded;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
		>
			<Card
				className={cn(
					"group overflow-hidden hover:shadow-md transition-shadow duration-300",
					"border-l-4",
					qualityConfig.border,
				)}
			>
				<CardContent className="p-0">
					{/* Photo Area - increased height */}
					<button
						type="button"
						className={cn(
							"h-40 bg-muted/30 relative flex items-center justify-center transition-colors overflow-hidden w-full",
							canExpand && "cursor-pointer",
						)}
						onClick={() => canExpand && onImageClick?.(imageUrl, item.material)}
						disabled={!canExpand}
					>
						{/* Gradient overlay */}
						<div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />

						{/* Real Image with hover zoom */}
						{imageUrl && !imageError ? (
							<>
								{!imageLoaded && <Skeleton className="absolute inset-0 z-0" />}
								<img
									src={imageUrl}
									alt={item.material}
									className={cn(
										"absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-300",
										imageLoaded ? "opacity-100" : "opacity-0",
										canExpand && "group-hover:scale-105",
									)}
									onLoad={() => setImageLoaded(true)}
									onError={() => setImageError(true)}
								/>
								{/* Zoom indicator on hover */}
								{canExpand && (
									<div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
										<div className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm">
											<ZoomIn className="h-4 w-4 text-white" />
										</div>
									</div>
								)}
							</>
						) : (
							// Placeholder when no image or error
							<div className="flex flex-col items-center gap-1 text-white/40 relative z-10">
								{imageError ? (
									<>
										<ImageOff className="h-6 w-6" />
										<span className="text-[10px]">Load failed</span>
									</>
								) : (
									<ImageIcon className="h-8 w-8" />
								)}
							</div>
						)}

						{/* Badges overlay */}
						<div className="absolute bottom-2 left-2 right-2 flex justify-between items-end z-20">
							<Badge
								variant="secondary"
								className="bg-white/95 text-black hover:bg-white backdrop-blur-sm shadow-sm text-xs"
							>
								{item.material}
							</Badge>

							{/* Lifecycle Badge */}
							{lifecycleConfig && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger>
											<div
												className={cn(
													"px-2 py-0.5 rounded-full text-white text-[10px] font-semibold shadow-sm",
													lifecycleConfig.color,
												)}
											>
												{lifecycleConfig.label}
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p>Material Lifecycle Status</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
					</button>

					<div className="p-4 space-y-3">
						{/* Quality & Price Row */}
						<div className="flex items-center justify-between gap-2">
							<Badge
								variant="outline"
								className={cn("text-[10px] h-5 px-1.5", qualityConfig.text)}
							>
								{item.quality} Quality
							</Badge>
							<span className="text-xs font-semibold text-success">
								{item.priceHint}
							</span>
						</div>

						{/* Insight - truncated with tooltip for full text */}
						<div className="flex gap-2 items-start">
							<CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<p className="text-sm text-muted-foreground leading-snug line-clamp-2 cursor-help">
											{item.insight}
										</p>
									</TooltipTrigger>
									<TooltipContent side="bottom" className="max-w-xs">
										<p>{item.insight}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>

						{/* Confidence */}
						<div className="flex items-center gap-2">
							<div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${item.confidence}%` }}
									transition={{ duration: 0.8, delay: 0.3 }}
									className="h-full bg-primary rounded-full"
								/>
							</div>
							<span className="text-xs text-muted-foreground font-medium">
								{item.confidence}%
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}
