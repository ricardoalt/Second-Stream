"use client";

import {
	FileAudio,
	FileText,
	Loader2,
	Music,
	Paperclip,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { projectsAPI } from "@/lib/api/projects";
import { formatFileSize } from "@/lib/format";
import { useToast } from "@/lib/hooks/use-toast";
import {
	useWorkspaceActions,
	useWorkspaceStore,
} from "@/lib/stores/workspace-store";
import type { WorkspaceQuickCaptureStatus } from "@/lib/types/workspace";
import { cn } from "@/lib/utils";

interface StreamQuickCaptureModalProps {
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCaptured?: () => void;
	initialAction?: "upload" | "voice" | "paste";
}

export function createTextCaptureFile(rawText: string): File {
	return new File([rawText], `quick-capture-${Date.now()}.txt`, {
		type: "text/plain",
	});
}

type UploadQuickCaptureBatchOptions = {
	projectId: string;
	items: File[];
	uploadFile: typeof projectsAPI.uploadFile;
	registerUploadedFile: (fileId: string) => void;
	hydrate: (projectId: string) => Promise<void>;
};

export async function uploadQuickCaptureBatch({
	projectId,
	items,
	uploadFile,
	registerUploadedFile,
	hydrate,
}: UploadQuickCaptureBatchOptions): Promise<void> {
	const uploads = await Promise.all(
		items.map(async (file) => {
			const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
			const isImage =
				extension === "jpg" || extension === "jpeg" || extension === "png";
			return uploadFile(projectId, file, {
				category: isImage ? "photos" : "general",
				process_with_ai: true,
			});
		}),
	);

	for (const upload of uploads) {
		registerUploadedFile(upload.id);
	}

	await hydrate(projectId);
}

export function resolveQuickCaptureModalStatusMessage({
	quickCaptureStatus,
	backgroundHydrateError,
	uploadSessionFileCount,
}: {
	quickCaptureStatus: WorkspaceQuickCaptureStatus;
	backgroundHydrateError: string | null;
	uploadSessionFileCount: number;
}) {
	if (quickCaptureStatus === "retry_required") {
		return {
			variant: "error" as const,
			text:
				backgroundHydrateError ??
				"Quick Capture could not finish automatically. Retry analysis manually.",
		};
	}

	if (quickCaptureStatus === "completed") {
		return {
			variant: "success" as const,
			text: "Quick Capture complete. Workspace evidence and suggestions were refreshed.",
		};
	}

	if (quickCaptureStatus === "analyzing") {
		return {
			variant: "pending" as const,
			text: "Evidence is visible. Refreshing workspace suggestions now...",
		};
	}

	if (quickCaptureStatus === "pending") {
		return {
			variant: "pending" as const,
			text:
				uploadSessionFileCount > 0
					? `Waiting for ${uploadSessionFileCount} captured file(s) to appear in workspace evidence...`
					: "Waiting for captured evidence to appear in workspace...",
		};
	}

	return null;
}

const ACCEPTED_DOCUMENT_TYPES = {
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

const ACCEPTED_AUDIO_TYPES = {
	"audio/mpeg": [".mp3"],
	"audio/wav": [".wav"],
	"audio/mp4": [".m4a"],
	"audio/*": [],
};

function FileChip({
	file,
	onRemove,
	isAudio = false,
}: {
	file: File;
	onRemove: () => void;
	isAudio?: boolean;
}) {
	const Icon = isAudio ? FileAudio : FileText;
	return (
		<div className="flex items-center gap-2 rounded-lg border border-border/40 bg-surface-container-lowest px-3 py-2">
			<Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
			<div className="min-w-0 flex-1">
				<p className="truncate text-xs font-medium text-foreground">
					{file.name}
				</p>
				<p className="text-[10px] text-muted-foreground">
					{formatFileSize(file.size)}
				</p>
			</div>
			<button
				type="button"
				onClick={onRemove}
				className="shrink-0 text-muted-foreground/50 transition-colors hover:text-foreground"
				aria-label={`Remove ${file.name}`}
			>
				<X className="size-3.5" aria-hidden />
			</button>
		</div>
	);
}

function DropZone({
	isDragActive,
	accept,
	getRootProps,
	getInputProps,
}: {
	isDragActive: boolean;
	accept?: Record<string, string[]>;
	getRootProps: () => React.HTMLAttributes<HTMLElement>;
	getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
}) {
	return (
		<div
			{...getRootProps()}
			className={cn(
				"flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
				isDragActive
					? "border-primary bg-primary/5"
					: "border-border/40 bg-surface-container-lowest hover:border-primary/40 hover:bg-primary/[0.02]",
			)}
		>
			<input {...getInputProps()} />
			<div
				className={cn(
					"flex size-10 items-center justify-center rounded-xl transition-colors",
					isDragActive
						? "bg-primary/15 text-primary"
						: "bg-surface-container-high text-muted-foreground",
				)}
			>
				<Upload className="size-5" aria-hidden />
			</div>
			<div className="text-center">
				<p className="text-sm font-medium text-foreground">
					{isDragActive
						? "Drop files here"
						: "Drag files here or click to browse"}
				</p>
				<p className="mt-0.5 text-[11px] text-muted-foreground">
					{accept === ACCEPTED_AUDIO_TYPES
						? "MP3, WAV, M4A — up to 25 MB"
						: "PDF, DOCX, XLSX, CSV, TXT, images — up to 10 MB"}
				</p>
			</div>
		</div>
	);
}

export function StreamQuickCaptureModal({
	projectId,
	open,
	onOpenChange,
	onCaptured,
	initialAction,
}: StreamQuickCaptureModalProps) {
	const { toast } = useToast();
	const { hydrate, registerUploadedFile, clearBackgroundHydrateError } =
		useWorkspaceActions();
	const { quickCaptureStatus, backgroundHydrateError, uploadSessionFileIds } =
		useWorkspaceStore(
			useShallow((state) => ({
				quickCaptureStatus: state.quickCaptureStatus,
				backgroundHydrateError: state.backgroundHydrateError,
				uploadSessionFileIds: state.uploadSessionFileIds,
			})),
		);

	const [files, setFiles] = useState<File[]>([]);
	const [audioFiles, setAudioFiles] = useState<File[]>([]);
	const [rawText, setRawText] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const defaultTab = useMemo(() => {
		if (initialAction === "paste") return "notes";
		if (initialAction === "voice") return "audio";
		return "files";
	}, [initialAction]);

	const onDropFiles = useCallback((accepted: File[]) => {
		setFiles((prev) => [...prev, ...accepted]);
	}, []);

	const onDropAudio = useCallback((accepted: File[]) => {
		setAudioFiles((prev) => [...prev, ...accepted]);
	}, []);

	const {
		getRootProps: getFileRootProps,
		getInputProps: getFileInputProps,
		isDragActive: isFileDragActive,
	} = useDropzone({
		onDrop: onDropFiles,
		accept: ACCEPTED_DOCUMENT_TYPES,
		maxFiles: 10,
		maxSize: 10 * 1024 * 1024,
	});

	const {
		getRootProps: getAudioRootProps,
		getInputProps: getAudioInputProps,
		isDragActive: isAudioDragActive,
	} = useDropzone({
		onDrop: onDropAudio,
		accept: ACCEPTED_AUDIO_TYPES,
		maxSize: 25 * 1024 * 1024,
	});

	const uploadCaptureBatch = async (items: File[]) => {
		setSubmitting(true);
		try {
			await uploadQuickCaptureBatch({
				projectId,
				items,
				uploadFile: projectsAPI.uploadFile,
				registerUploadedFile,
				hydrate,
			});
			onCaptured?.();
		} finally {
			setSubmitting(false);
		}
	};

	const handleProcessFiles = async () => {
		if (files.length === 0) return;
		try {
			await uploadCaptureBatch(files);
			setFiles([]);
		} catch (error) {
			toast({
				title: "File capture failed",
				description:
					error instanceof Error ? error.message : "Could not process files.",
				variant: "destructive",
			});
		}
	};

	const handleProcessText = async () => {
		if (!rawText.trim()) return;
		try {
			const textFile = createTextCaptureFile(rawText.trim());
			await uploadCaptureBatch([textFile]);
			setRawText("");
		} catch (error) {
			toast({
				title: "Text capture failed",
				description:
					error instanceof Error ? error.message : "Could not process text.",
				variant: "destructive",
			});
		}
	};

	const handleProcessAudio = async () => {
		if (audioFiles.length === 0) return;
		try {
			await uploadCaptureBatch(audioFiles);
			setAudioFiles([]);
		} catch (error) {
			toast({
				title: "Audio capture failed",
				description:
					error instanceof Error ? error.message : "Could not process audio.",
				variant: "destructive",
			});
		}
	};

	const captureStatusMessage = useMemo(
		() =>
			resolveQuickCaptureModalStatusMessage({
				quickCaptureStatus,
				backgroundHydrateError,
				uploadSessionFileCount: uploadSessionFileIds.length,
			}),
		[backgroundHydrateError, quickCaptureStatus, uploadSessionFileIds.length],
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) {
					clearBackgroundHydrateError();
				}
			}}
		>
			<DialogContent className="glass-popover w-[min(94vw,680px)] max-w-none gap-0 overflow-hidden rounded-2xl p-0">
				<DialogTitle className="sr-only">Quick Capture</DialogTitle>
				<DialogDescription className="sr-only">
					Capture files, audio, and raw text. Completion is confirmed after
					evidence appears and workspace suggestions refresh.
				</DialogDescription>

				{/* Header */}
				<div className="border-b border-border/20 bg-surface-container-low px-6 py-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h2 className="font-display text-base font-semibold text-foreground">
								Quick Capture
							</h2>
							<p className="mt-0.5 text-[11px] text-muted-foreground">
								Evidence is processed by AI and applied to workspace
								suggestions.
							</p>
						</div>
						{submitting ? (
							<div className="flex items-center gap-1.5 text-xs text-primary">
								<Loader2 className="size-3.5 animate-spin" aria-hidden />
								Processing...
							</div>
						) : null}
					</div>

					{/* Status banner */}
					{captureStatusMessage ? (
						<div
							className={cn(
								"mt-3 rounded-lg px-3 py-2 text-xs",
								captureStatusMessage.variant === "error"
									? "border border-destructive/30 bg-destructive/5 text-destructive"
									: captureStatusMessage.variant === "success"
										? "border border-emerald-300/40 bg-emerald-500/10 text-emerald-800"
										: "border border-secondary/20 bg-secondary/10 text-secondary",
							)}
						>
							{captureStatusMessage.text}
						</div>
					) : null}
				</div>

				{/* Tabs */}
				<Tabs defaultValue={defaultTab} className="flex flex-col">
					<div className="border-b border-border/15 px-6 pt-3">
						<TabsList className="h-9 bg-transparent p-0 gap-1">
							<TabsTrigger
								value="files"
								className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-surface-container-lowest data-[state=active]:shadow-xs"
							>
								<Paperclip className="size-3.5" aria-hidden />
								Documents
							</TabsTrigger>
							<TabsTrigger
								value="audio"
								className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-surface-container-lowest data-[state=active]:shadow-xs"
							>
								<Music className="size-3.5" aria-hidden />
								Audio
							</TabsTrigger>
							<TabsTrigger
								value="notes"
								className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-surface-container-lowest data-[state=active]:shadow-xs"
							>
								<FileText className="size-3.5" aria-hidden />
								Notes
							</TabsTrigger>
						</TabsList>
					</div>

					{/* Documents tab */}
					<TabsContent value="files" className="flex flex-col gap-4 px-6 py-5">
						<DropZone
							isDragActive={isFileDragActive}
							accept={ACCEPTED_DOCUMENT_TYPES}
							getRootProps={getFileRootProps}
							getInputProps={getFileInputProps}
						/>
						{files.length > 0 ? (
							<div className="flex flex-col gap-2">
								{files.map((file, index) => (
									<FileChip
										key={`${file.name}-${index}`}
										file={file}
										onRemove={() =>
											setFiles((prev) => prev.filter((_, i) => i !== index))
										}
									/>
								))}
							</div>
						) : null}
						<div className="flex justify-end">
							<Button
								type="button"
								onClick={() => {
									void handleProcessFiles();
								}}
								disabled={files.length === 0 || submitting}
								className="gap-2"
							>
								{submitting ? (
									<Loader2 className="size-4 animate-spin" aria-hidden />
								) : (
									<Upload className="size-4" aria-hidden />
								)}
								Process{" "}
								{files.length > 0
									? `${files.length} file${files.length > 1 ? "s" : ""}`
									: "files"}
							</Button>
						</div>
					</TabsContent>

					{/* Audio tab */}
					<TabsContent value="audio" className="flex flex-col gap-4 px-6 py-5">
						<DropZone
							isDragActive={isAudioDragActive}
							accept={ACCEPTED_AUDIO_TYPES}
							getRootProps={getAudioRootProps}
							getInputProps={getAudioInputProps}
						/>
						{audioFiles.length > 0 ? (
							<div className="flex flex-col gap-2">
								{audioFiles.map((file, index) => (
									<FileChip
										key={`${file.name}-${index}`}
										file={file}
										isAudio
										onRemove={() =>
											setAudioFiles((prev) =>
												prev.filter((_, i) => i !== index),
											)
										}
									/>
								))}
							</div>
						) : null}
						<div className="flex justify-end">
							<Button
								type="button"
								onClick={() => {
									void handleProcessAudio();
								}}
								disabled={audioFiles.length === 0 || submitting}
								className="gap-2"
							>
								{submitting ? (
									<Loader2 className="size-4 animate-spin" aria-hidden />
								) : (
									<Upload className="size-4" aria-hidden />
								)}
								Process{" "}
								{audioFiles.length > 0
									? `${audioFiles.length} recording${audioFiles.length > 1 ? "s" : ""}`
									: "audio"}
							</Button>
						</div>
					</TabsContent>

					{/* Notes tab */}
					<TabsContent value="notes" className="flex flex-col gap-4 px-6 py-5">
						<Textarea
							value={rawText}
							onChange={(event) => setRawText(event.target.value)}
							rows={8}
							placeholder="Paste meeting notes, field observations, or copied snippets from emails..."
							className="resize-none text-sm"
						/>
						<div className="flex justify-end">
							<Button
								type="button"
								onClick={() => {
									void handleProcessText();
								}}
								disabled={!rawText.trim() || submitting}
								className="gap-2"
							>
								{submitting ? (
									<Loader2 className="size-4 animate-spin" aria-hidden />
								) : (
									<Upload className="size-4" aria-hidden />
								)}
								Process notes
							</Button>
						</div>
					</TabsContent>
				</Tabs>

				{/* Footer */}
				<div className="border-t border-border/15 bg-surface-container-low px-6 py-3">
					<div className="flex justify-end">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
							disabled={submitting}
						>
							Close
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
