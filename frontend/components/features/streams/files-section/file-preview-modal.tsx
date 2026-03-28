"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { projectsAPI } from "@/lib/api/projects";
import { cn } from "@/lib/utils";
import { isRecord, parseAnalysis } from "./analysis-parsers";
import { FilePreviewContent } from "./file-preview-content";
import { FilePreviewMetadata } from "./file-preview-metadata";
import type { EnhancedProjectFile, FileAIAnalysis } from "./types";

interface FilePreviewModalProps {
	file: EnhancedProjectFile | null;
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDelete: (file: EnhancedProjectFile) => void;
	disabled?: boolean;
}

const PREVIEWABLE_EXTENSIONS = [
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"pdf",
] as const;

type PreviewableExtension = (typeof PREVIEWABLE_EXTENSIONS)[number];

function isPreviewableExtension(value: string): value is PreviewableExtension {
	return PREVIEWABLE_EXTENSIONS.some((ext) => ext === value);
}

export function FilePreviewModal({
	file,
	projectId,
	open,
	onOpenChange,
	onDelete,
	disabled = false,
}: FilePreviewModalProps) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = useState(false);
	const [analysis, setAnalysis] = useState<FileAIAnalysis | null>(null);

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	useEffect(() => {
		if (!open || !file) {
			setPreviewUrl(null);
			setAnalysis(null);
			return;
		}

		let isActive = true;

		const loadFileData = async () => {
			setIsLoadingPreview(true);
			setPreviewUrl(null);
			setAnalysis(null);

			try {
				const detail = await projectsAPI.getFileDetail(projectId, file.id);

				if (detail.ai_analysis && isRecord(detail.ai_analysis)) {
					setAnalysis(
						parseAnalysis(detail.ai_analysis, {
							fileType: file.fileType,
							category: file.category,
						}),
					);
				} else {
					setAnalysis(null);
				}

				const fileType = file.fileType.toLowerCase();
				const canPreview = isPreviewableExtension(fileType);

				if (canPreview) {
					try {
						const blob = await projectsAPI.downloadFileBlob(file.id);
						const url = URL.createObjectURL(blob);
						if (!isActive) {
							URL.revokeObjectURL(url);
							return;
						}
						setPreviewUrl(url);
					} catch {
						// Silently fail preview: metadata/actions still work.
					}
				}
			} catch {
				toast.error("Failed to load file details");
			} finally {
				setIsLoadingPreview(false);
			}
		};

		void loadFileData();

		return () => {
			isActive = false;
		};
	}, [open, file, projectId]);

	const handleDownload = useCallback(async () => {
		if (!file) return;

		try {
			const blob = await projectsAPI.downloadFileBlob(file.id);
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = file.filename;
			link.rel = "noopener";
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 100);
		} catch {
			toast.error("Failed to download file");
		}
	}, [file]);

	const handleView = useCallback(async () => {
		if (!file) return;

		try {
			const blob = await projectsAPI.downloadFileBlob(file.id);
			const url = URL.createObjectURL(blob);
			window.open(url, "_blank", "noopener,noreferrer");
			setTimeout(() => URL.revokeObjectURL(url), 60000);
		} catch {
			toast.error("Failed to open file");
		}
	}, [file]);

	const handleDelete = useCallback(() => {
		if (!file) return;
		onDelete(file);
	}, [file, onDelete]);

	if (!file) return null;

	const fileWithAnalysis: EnhancedProjectFile = {
		...file,
		aiAnalysis: analysis,
	};

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					className={cn(
						"fixed inset-0 z-50",
						"bg-background/80 backdrop-blur-md",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"duration-200",
					)}
				/>

				<DialogPrimitive.Content
					aria-labelledby="file-preview-title"
					aria-describedby="file-preview-description"
					className={cn(
						"fixed z-50 top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]",
						"w-[calc(100%-2rem)] max-w-5xl",
						"h-[calc(100%-2rem)] max-h-[85vh]",
						"glass-liquid-strong rounded-2xl overflow-hidden",
						"shadow-2xl",
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						"duration-250 ease-out",
						"max-md:rounded-none max-md:w-full max-md:h-full max-md:max-h-full",
					)}
				>
					<DialogPrimitive.Title id="file-preview-title" className="sr-only">
						File Preview: {file.filename}
					</DialogPrimitive.Title>
					<DialogPrimitive.Description
						id="file-preview-description"
						className="sr-only"
					>
						Preview and details for {file.filename}
					</DialogPrimitive.Description>

					<DialogPrimitive.Close asChild>
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								"absolute top-4 right-4 z-10",
								"h-9 w-9 rounded-full",
								"bg-background/50 hover:bg-background/80",
								"backdrop-blur-sm",
							)}
						>
							<X className="h-5 w-5" />
							<span className="sr-only">Close</span>
						</Button>
					</DialogPrimitive.Close>

					<div className={cn("h-full flex", "max-md:flex-col")}>
						<div
							className={cn(
								"bg-muted/10 border-r border-border/50",
								"w-[60%]",
								"max-md:w-full max-md:h-[40vh] max-md:flex-shrink-0 max-md:border-r-0 max-md:border-b",
							)}
						>
							<FilePreviewContent
								file={file}
								previewUrl={previewUrl}
								isLoading={isLoadingPreview}
							/>
						</div>

						<div
							className={cn(
								"p-6",
								"w-[40%]",
								"max-md:w-full max-md:flex-1 max-md:overflow-auto",
							)}
						>
							<FilePreviewMetadata
								file={fileWithAnalysis}
								onDownload={handleDownload}
								onView={handleView}
								onDelete={handleDelete}
								disabled={disabled}
							/>
						</div>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
