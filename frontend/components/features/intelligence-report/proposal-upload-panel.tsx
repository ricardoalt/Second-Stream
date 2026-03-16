"use client";

import { CheckCircle2, FileUp, RefreshCw, Upload, X } from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

export type UploadState =
	| "idle"
	| "file_selected"
	| "uploading"
	| "uploaded"
	| "sent";

interface ProposalUploadPanelProps {
	uploadState: UploadState;
	selectedFile: File | null;
	uploadProgress: number;
	onFileSelect: (file: File) => void;
	onFileClear: () => void;
	onUpload: () => void;
	onMarkAsSent: () => void;
	onUploadReplacement: () => void;
}

export function ProposalUploadPanel({
	uploadState,
	selectedFile,
	uploadProgress,
	onFileSelect,
	onFileClear,
	onUpload,
	onMarkAsSent,
	onUploadReplacement,
}: ProposalUploadPanelProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLButtonElement>) => {
			e.preventDefault();
			const file = e.dataTransfer.files[0];
			if (file) onFileSelect(file);
		},
		[onFileSelect],
	);

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) onFileSelect(file);
		},
		[onFileSelect],
	);

	return (
		<Card className="w-full lg:w-80 lg:sticky lg:top-[5.75rem] shrink-0">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">Proposal Upload</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{uploadState === "idle" && (
					<>
						<button
							type="button"
							onDrop={handleDrop}
							onDragOver={(e) => e.preventDefault()}
							onClick={() => inputRef.current?.click()}
							className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
						>
							<FileUp className="h-8 w-8 text-muted-foreground/50" />
							<p className="text-sm font-medium text-muted-foreground">
								Drop proposal file here
							</p>
							<p className="text-xs text-muted-foreground/60">
								or click to browse
							</p>
						</button>
						<input
							ref={inputRef}
							type="file"
							accept=".pdf,.docx,.doc,.xlsx,.xls"
							onChange={handleChange}
							className="hidden"
						/>
					</>
				)}

				{uploadState === "file_selected" && selectedFile && (
					<div className="space-y-3">
						<div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
							<Upload className="h-5 w-5 shrink-0 text-primary" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">
									{selectedFile.name}
								</p>
								<p className="text-xs text-muted-foreground">
									{formatFileSize(selectedFile.size)}
								</p>
							</div>
							<button
								type="button"
								onClick={onFileClear}
								className="shrink-0 rounded-full p-1 hover:bg-muted transition-colors"
								aria-label="Remove file"
							>
								<X className="h-3.5 w-3.5 text-muted-foreground" />
							</button>
						</div>
						<Button onClick={onUpload} className="w-full">
							<Upload className="h-4 w-4" />
							Upload Proposal
						</Button>
					</div>
				)}

				{uploadState === "uploading" && selectedFile && (
					<div className="space-y-3">
						<div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
							<Upload className="h-5 w-5 shrink-0 text-primary animate-pulse" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">
									{selectedFile.name}
								</p>
								<p className="text-xs text-muted-foreground">Uploading...</p>
							</div>
						</div>
						<Progress value={uploadProgress} className="h-2" />
						<p
							className="text-xs text-muted-foreground text-center"
							aria-live="polite"
						>
							{uploadProgress}% complete
						</p>
					</div>
				)}

				{uploadState === "uploaded" && (
					<div className="space-y-3">
						<div
							className={cn(
								"flex items-center gap-3 rounded-lg border p-3",
								"border-success/40 bg-success/5",
							)}
						>
							<CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-success-foreground dark:text-success">
									Proposal uploaded
								</p>
								{selectedFile && (
									<p className="text-xs text-muted-foreground">
										{selectedFile.name}
									</p>
								)}
							</div>
						</div>
						<Button onClick={onMarkAsSent} className="w-full">
							Mark as Sent
						</Button>
					</div>
				)}

				{uploadState === "sent" && (
					<div className="space-y-3">
						<div
							className={cn(
								"flex items-center gap-3 rounded-lg border p-3",
								"border-success/40 bg-success/5",
							)}
						>
							<CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-success-foreground dark:text-success">
									Proposal sent
								</p>
								{selectedFile && (
									<p className="text-xs text-muted-foreground">
										{selectedFile.name}
									</p>
								)}
							</div>
						</div>
						<button
							type="button"
							onClick={onUploadReplacement}
							className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<RefreshCw className="h-3.5 w-3.5" />
							Upload replacement
						</button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
