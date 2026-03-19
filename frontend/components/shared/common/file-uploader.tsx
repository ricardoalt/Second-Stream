"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import type { UploadingFile } from "@/components/shared/common/file-uploader-sections";
import {
	UploadDropZone,
	UploadingFilesCard,
} from "@/components/shared/common/file-uploader-sections";
import { projectsAPI } from "@/lib/api/projects";
import { UI_DELAYS } from "@/lib/constants";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface FileUploaderProps {
	projectId: string;
	onUploadComplete?: (() => void) | undefined;
	maxFiles?: number;
	maxSize?: number; // in bytes
	className?: string;
	readOnly?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ACCEPTED_FILE_TYPES = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
		".docx",
	],
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
		".xlsx",
	],
	"text/csv": [".csv"],
	"text/plain": [".txt"],
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
};

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 5;

// ============================================================================
// Main Component
// ============================================================================

/**
 * File upload dropzone component.
 *
 * This component ONLY handles file uploads (drag-drop zone + progress indicators).
 * File listing and preview is handled by FilesSection/FilesBrowser.
 */
export function FileUploader({
	projectId,
	onUploadComplete,
	maxFiles = DEFAULT_MAX_FILES,
	maxSize = DEFAULT_MAX_SIZE,
	className,
	readOnly = false,
}: FileUploaderProps) {
	const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

	// ========================================================================
	// Upload file to backend
	// ========================================================================

	const uploadFile = useCallback(
		async (file: File, fileId: string) => {
			const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
			const isDocument =
				extension === "pdf" ||
				extension === "docx" ||
				extension === "xlsx" ||
				extension === "csv" ||
				extension === "txt";
			const isImage =
				extension === "jpg" || extension === "jpeg" || extension === "png";

			const category = isImage ? "photos" : "general";
			const processWithAi = isImage || isDocument;

			try {
				// Simulate progress (since underlying fetch doesn't support upload progress natively)
				const progressInterval = setInterval(() => {
					setUploadingFiles((prev) =>
						prev.map((f) =>
							f.id === fileId && f.progress < 90
								? { ...f, progress: f.progress + 10 }
								: f,
						),
					);
				}, 200);

				await projectsAPI.uploadFile(projectId, file, {
					category,
					process_with_ai: processWithAi,
				});

				clearInterval(progressInterval);

				// Mark as complete
				setUploadingFiles((prev) =>
					prev.map((f) =>
						f.id === fileId
							? { ...f, progress: 100, status: "success" as const }
							: f,
					),
				);

				toast.success(`${file.name} uploaded successfully`);

				// Notify parent to refresh file list
				onUploadComplete?.();

				// Remove from uploading list after a delay
				setTimeout(() => {
					setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
				}, UI_DELAYS.SUCCESS_INDICATOR);
			} catch (_error) {
				setUploadingFiles((prev) =>
					prev.map((f) =>
						f.id === fileId
							? {
									...f,
									status: "error" as const,
									error:
										_error instanceof Error ? _error.message : "Upload failed",
								}
							: f,
					),
				);
				toast.error(`Failed to upload ${file.name}`);
			}
		},
		[projectId, onUploadComplete],
	);

	// ========================================================================
	// Handle file drop
	// ========================================================================

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (readOnly) {
				toast.info("Uploads are disabled for archived projects");
				return;
			}

			// Only check against currently uploading files for max limit
			if (uploadingFiles.length + acceptedFiles.length > maxFiles) {
				toast.error(`Maximum ${maxFiles} files can be uploaded at once`);
				return;
			}

			acceptedFiles.forEach((file) => {
				if (file.size > maxSize) {
					toast.error(
						`${file.name} is too large. Max size: ${formatFileSize(maxSize)}`,
					);
					return;
				}

				const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
				const newUploadingFile: UploadingFile = {
					id: fileId,
					file,
					progress: 0,
					status: "uploading",
				};

				setUploadingFiles((prev) => [...prev, newUploadingFile]);
				uploadFile(file, fileId);
			});
		},
		[maxFiles, maxSize, readOnly, uploadingFiles.length, uploadFile],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_FILE_TYPES,
		maxSize,
		multiple: true,
		disabled: readOnly,
	});

	// ========================================================================
	// Cancel uploading file
	// ========================================================================

	const cancelUpload = (fileId: string) => {
		setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
		toast.info("Upload cancelled");
	};

	// ========================================================================
	// Render
	// ========================================================================

	return (
		<div className={cn("space-y-4", className)}>
			<UploadDropZone
				rootProps={getRootProps()}
				inputProps={getInputProps()}
				isDragActive={isDragActive}
				maxSize={maxSize}
				disabled={readOnly}
			/>

			<UploadingFilesCard
				files={uploadingFiles}
				onCancelUpload={cancelUpload}
			/>
		</div>
	);
}
