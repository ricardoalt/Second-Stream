"use client";

import {
	File,
	FileImage,
	FileSpreadsheet,
	FileText,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FileCategory, FileProcessingStatus } from "./types";
import { CATEGORY_CONFIG } from "./types";

interface FileThumbnailProps {
	filename: string;
	fileType: string;
	category: FileCategory;
	processingStatus: FileProcessingStatus;
	thumbnailUrl?: string | null | undefined;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
	pdf: FileText,
	xlsx: FileSpreadsheet,
	xls: FileSpreadsheet,
	csv: FileSpreadsheet,
	json: FileText,
	txt: FileText,
	jpg: FileImage,
	jpeg: FileImage,
	png: FileImage,
};

const SIZE_CLASSES = {
	sm: "h-8 w-8",
	md: "h-12 w-12",
	lg: "h-24 w-24",
};

const ICON_SIZE_CLASSES = {
	sm: "h-4 w-4",
	md: "h-6 w-6",
	lg: "h-10 w-10",
};

function getFileIcon(fileType: string): typeof FileText {
	const type = fileType.toLowerCase();
	return FILE_TYPE_ICONS[type] || File;
}

export function FileThumbnail({
	filename,
	fileType,
	category,
	processingStatus,
	thumbnailUrl,
	size = "md",
	className,
}: FileThumbnailProps) {
	const [imageError, setImageError] = useState(false);
	const Icon = getFileIcon(fileType);
	const categoryConfig = CATEGORY_CONFIG[category];
	const isProcessing = processingStatus === "processing";
	const isImage = ["jpg", "jpeg", "png"].includes(fileType.toLowerCase());

	if (isImage && thumbnailUrl && !imageError) {
		return (
			<div
				className={cn(
					"relative rounded-lg overflow-hidden bg-muted/50",
					SIZE_CLASSES[size],
					className,
				)}
			>
				{/* biome-ignore lint/performance/noImgElement: Using blob URLs which Next.js Image doesn't support */}
				<img
					src={thumbnailUrl}
					alt={filename}
					className="h-full w-full object-cover"
					onError={() => setImageError(true)}
				/>
				{isProcessing && (
					<div className="absolute inset-0 flex items-center justify-center bg-background/60">
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"relative flex items-center justify-center rounded-lg",
				categoryConfig.bgColor,
				SIZE_CLASSES[size],
				className,
			)}
		>
			{isProcessing ? (
				<Loader2
					className={cn("animate-spin text-primary", ICON_SIZE_CLASSES[size])}
				/>
			) : (
				<Icon
					className={cn(categoryConfig.textColor, ICON_SIZE_CLASSES[size])}
				/>
			)}
		</div>
	);
}
