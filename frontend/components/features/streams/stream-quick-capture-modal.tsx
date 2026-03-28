"use client";

import { Loader2, Mic, Paperclip, PenSquare, Upload } from "lucide-react";
import { useMemo, useState } from "react";
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

type ProcessingState = "idle" | "processing" | "done";

interface StreamQuickCaptureModalProps {
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCaptured?: () => void;
	initialAction?: "upload" | "voice" | "paste";
}

function createTextCaptureFile(rawText: string): File {
	return new File([rawText], `quick-capture-${Date.now()}.txt`, {
		type: "text/plain",
	});
}

export function StreamQuickCaptureModal({
	projectId,
	open,
	onOpenChange,
	onCaptured,
	initialAction,
}: StreamQuickCaptureModalProps) {
	const { toast } = useToast();
	const [files, setFiles] = useState<File[]>([]);
	const [audioFiles, setAudioFiles] = useState<File[]>([]);
	const [rawText, setRawText] = useState("");
	const [filesState, setFilesState] = useState<ProcessingState>("idle");
	const [audioState, setAudioState] = useState<ProcessingState>("idle");
	const [textState, setTextState] = useState<ProcessingState>("idle");

	const isAnyProcessing =
		filesState === "processing" ||
		audioState === "processing" ||
		textState === "processing";

	const autoFocusTarget = useMemo(() => {
		if (initialAction === "paste") return "text";
		if (initialAction === "voice") return "audio";
		return "files";
	}, [initialAction]);

	const processFileBatch = async (items: File[]) => {
		await Promise.all(
			items.map(async (file) => {
				const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
				const isImage =
					extension === "jpg" || extension === "jpeg" || extension === "png";
				await projectsAPI.uploadFile(projectId, file, {
					category: isImage ? "photos" : "general",
					process_with_ai: true,
				});
			}),
		);
	};

	const handleProcessFiles = async () => {
		if (files.length === 0) {
			return;
		}
		setFilesState("processing");
		try {
			await processFileBatch(files);
			setFiles([]);
			setFilesState("done");
			onCaptured?.();
			toast({
				title: "Files captured",
				description: `${files.length} file(s) queued for processing.`,
			});
		} catch (error) {
			setFilesState("idle");
			toast({
				title: "File capture failed",
				description:
					error instanceof Error ? error.message : "Could not process files.",
				variant: "destructive",
			});
		}
	};

	const handleProcessAudio = async () => {
		if (audioFiles.length === 0) {
			return;
		}
		setAudioState("processing");
		try {
			await processFileBatch(audioFiles);
			setAudioFiles([]);
			setAudioState("done");
			onCaptured?.();
			toast({
				title: "Audio captured",
				description: `${audioFiles.length} audio file(s) queued for processing.`,
			});
		} catch (error) {
			setAudioState("idle");
			toast({
				title: "Audio capture failed",
				description:
					error instanceof Error ? error.message : "Could not process audio.",
				variant: "destructive",
			});
		}
	};

	const handleProcessText = async () => {
		if (!rawText.trim()) {
			return;
		}
		setTextState("processing");
		try {
			const textFile = createTextCaptureFile(rawText.trim());
			await projectsAPI.uploadFile(projectId, textFile, {
				category: "general",
				process_with_ai: true,
			});
			setRawText("");
			setTextState("done");
			onCaptured?.();
			toast({
				title: "Text captured",
				description: "Raw notes were converted into a workspace file.",
			});
		} catch (error) {
			setTextState("idle");
			toast({
				title: "Text capture failed",
				description:
					error instanceof Error ? error.message : "Could not process text.",
				variant: "destructive",
			});
		}
	};

	const resetProcessingStates = () => {
		setFilesState("idle");
		setAudioState("idle");
		setTextState("idle");
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) {
					resetProcessingStates();
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
						Capture files, audio, and raw text in one place. Each input is
						processed independently.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
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
								setFilesState("idle");
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
							disabled={files.length === 0 || filesState === "processing"}
						>
							{filesState === "processing" ? (
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
								setAudioState("idle");
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
							disabled={audioFiles.length === 0 || audioState === "processing"}
						>
							{audioState === "processing" ? (
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
								setTextState("idle");
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
							disabled={!rawText.trim() || textState === "processing"}
						>
							{textState === "processing" ? (
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
