"use client";

import { Loader2, Mic, Paperclip, PenSquare, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectsAPI } from "@/lib/api/projects";
import { useToast } from "@/lib/hooks/use-toast";
import {
	useWorkspaceActions,
	useWorkspaceStore,
} from "@/lib/stores/workspace-store";
import type { WorkspaceQuickCaptureStatus } from "@/lib/types/workspace";

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

	const isAnyProcessing = submitting;

	const autoFocusTarget = useMemo(() => {
		if (initialAction === "paste") return "text";
		if (initialAction === "voice") return "audio";
		return "files";
	}, [initialAction]);

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
		if (files.length === 0) {
			return;
		}
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
		if (!rawText.trim()) {
			return;
		}
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
		if (audioFiles.length === 0) {
			return;
		}
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
			<DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<DialogTitle>Quick Capture</DialogTitle>
						<Badge variant="secondary" className="rounded-full">
							Unified
						</Badge>
					</div>
					<DialogDescription>
						Capture files, audio, and raw text in one place. Completion is
						confirmed after evidence appears and workspace suggestions refresh.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					{captureStatusMessage ? (
						<div
							className={
								captureStatusMessage.variant === "error"
									? "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
									: captureStatusMessage.variant === "success"
										? "rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800"
										: "rounded-lg border border-secondary/20 bg-secondary/10 px-3 py-2 text-xs text-secondary"
							}
						>
							{captureStatusMessage.text}
						</div>
					) : null}

					<section className="space-y-3 rounded-lg border bg-surface-container-lowest p-4">
						<div className="flex items-center gap-2">
							<Paperclip className="size-4 text-muted-foreground" />
							<p className="text-sm font-semibold">Files</p>
						</div>
						<Label htmlFor="quick-capture-files">Add files</Label>
						<Input
							id="quick-capture-files"
							type="file"
							multiple
							autoFocus={autoFocusTarget === "files"}
							onChange={(event) => {
								setFiles(Array.from(event.target.files ?? []));
							}}
						/>
						<p className="text-xs text-muted-foreground">
							{files.length > 0
								? `${files.length} file(s) selected`
								: "No files selected"}
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								void handleProcessFiles();
							}}
							disabled={files.length === 0 || submitting}
						>
							{submitting ? (
								<Loader2 data-icon="inline-start" className="animate-spin" />
							) : (
								<Upload data-icon="inline-start" />
							)}
							Process files
						</Button>
					</section>

					<section className="space-y-3 rounded-lg border bg-surface-container-lowest p-4">
						<div className="flex items-center gap-2">
							<Mic className="size-4 text-muted-foreground" />
							<p className="text-sm font-semibold">Audio</p>
						</div>
						<Label htmlFor="quick-capture-audio">Add audio files</Label>
						<Input
							id="quick-capture-audio"
							type="file"
							accept="audio/*"
							multiple
							autoFocus={autoFocusTarget === "audio"}
							onChange={(event) => {
								setAudioFiles(Array.from(event.target.files ?? []));
							}}
						/>
						<p className="text-xs text-muted-foreground">
							{audioFiles.length > 0
								? `${audioFiles.length} audio file(s) selected`
								: "No audio selected"}
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								void handleProcessAudio();
							}}
							disabled={audioFiles.length === 0 || submitting}
						>
							{submitting ? (
								<Loader2 data-icon="inline-start" className="animate-spin" />
							) : (
								<Upload data-icon="inline-start" />
							)}
							Process audio
						</Button>
					</section>

					<section className="space-y-3 rounded-lg border bg-surface-container-lowest p-4">
						<div className="flex items-center gap-2">
							<PenSquare className="size-4 text-muted-foreground" />
							<p className="text-sm font-semibold">Raw text</p>
						</div>
						<Label htmlFor="quick-capture-text">Paste notes</Label>
						<Textarea
							id="quick-capture-text"
							value={rawText}
							autoFocus={autoFocusTarget === "text"}
							onChange={(event) => {
								setRawText(event.target.value);
							}}
							rows={6}
							placeholder="Paste meeting notes, field observations, or copied snippets..."
						/>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								void handleProcessText();
							}}
							disabled={!rawText.trim() || submitting}
						>
							{submitting ? (
								<Loader2 data-icon="inline-start" className="animate-spin" />
							) : (
								<Upload data-icon="inline-start" />
							)}
							Process text
						</Button>
					</section>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isAnyProcessing}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
