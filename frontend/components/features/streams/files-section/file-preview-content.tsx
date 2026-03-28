"use client";

import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileThumbnail } from "./file-thumbnail";
import type { EnhancedProjectFile } from "./types";

interface FilePreviewContentProps {
	file: EnhancedProjectFile;
	previewUrl: string | null;
	isLoading: boolean;
}

export function FilePreviewContent({
	file,
	previewUrl,
	isLoading,
}: FilePreviewContentProps) {
	const fileType = file.fileType.toLowerCase();
	const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileType);
	const isPdf = fileType === "pdf";

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="flex flex-col items-center gap-3 text-muted-foreground">
					<Loader2 className="h-8 w-8 animate-spin" />
					<span className="text-sm">Loading preview...</span>
				</div>
			</div>
		);
	}

	if (isImage && previewUrl) {
		return (
			<div className="h-full flex items-center justify-center p-4">
				{/* biome-ignore lint/performance/noImgElement: Using blob URLs which Next.js Image doesn't support */}
				<img
					src={previewUrl}
					alt={file.filename}
					className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
				/>
			</div>
		);
	}

	if (isPdf && previewUrl) {
		return (
			<div className="h-full w-full p-4">
				<iframe
					src={previewUrl}
					title={file.filename}
					className="h-full w-full rounded-lg border-0 bg-white"
				/>
			</div>
		);
	}

	return (
		<div className="h-full flex items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<div
					className={cn(
						"rounded-2xl p-8",
						"bg-muted/30 border border-border/50",
					)}
				>
					<FileThumbnail
						filename={file.filename}
						fileType={file.fileType}
						category={file.category}
						processingStatus={file.processingStatus}
						size="lg"
						className="h-24 w-24"
					/>
				</div>
				<div className="flex items-center gap-2 text-muted-foreground">
					<FileText className="h-4 w-4" />
					<span className="text-sm uppercase font-medium">
						{file.fileType} file
					</span>
				</div>
			</div>
		</div>
	);
}
