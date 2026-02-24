"use client";

import { Mic, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { voiceInterviewsApi } from "@/lib/api/voice-interviews";
import { pollVoiceInterviewUntilReady } from "./voice-interview-polling";

const MAX_UPLOAD_BYTES = 25_000_000;
const ACCEPTED_EXTENSIONS = ["mp3", "wav", "m4a"];

interface VoiceInterviewLauncherProps {
	companyId: string;
	locationId?: string;
	disabled?: boolean;
	onRunReady: (payload: {
		runId: string;
		voiceInterviewId: string;
	}) => Promise<void>;
}

export function VoiceInterviewLauncher({
	companyId,
	locationId,
	disabled,
	onRunReady,
}: VoiceInterviewLauncherProps) {
	const [open, setOpen] = useState(false);
	const [consentGiven, setConsentGiven] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [pollingId, setPollingId] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const helperText = useMemo(
		() => "Accepted formats: mp3, wav, m4a. Max size: 25MB.",
		[],
	);

	const reset = () => {
		setConsentGiven(false);
		setUploading(false);
		setSelectedFile(null);
		setPollingId(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const validateFile = (file: File): string | null => {
		const extension = file.name.split(".").pop()?.toLowerCase();
		if (!extension || !ACCEPTED_EXTENSIONS.includes(extension)) {
			return "Unsupported format. Upload mp3, wav, or m4a.";
		}
		if (file.size > MAX_UPLOAD_BYTES) {
			return "File too large. Max size is 25MB.";
		}
		return null;
	};

	const pollUntilReady = async (voiceInterviewId: string, runId: string) => {
		setPollingId(voiceInterviewId);
		await pollVoiceInterviewUntilReady({
			voiceInterviewId,
			runId,
			getDetails: voiceInterviewsApi.get,
			onReady: onRunReady,
			onSuccess: toast.success,
			onError: toast.error,
			onCloseAfterReady: () => {
				setOpen(false);
				reset();
			},
			onDone: () => setPollingId(null),
		});
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) reset();
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled || uploading || !!pollingId}
				>
					<Mic className="mr-2 h-4 w-4" />
					Voice Interview
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Upload Voice Interview</DialogTitle>
					<DialogDescription>
						Upload-only flow. Audio retained 180 days, transcript 24 months.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="space-y-2">
						<Label htmlFor="voice-audio-file">Audio file</Label>
						<Input
							id="voice-audio-file"
							ref={fileInputRef}
							type="file"
							accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4"
							onChange={(event) => {
								const file = event.target.files?.[0] ?? null;
								setSelectedFile(file);
							}}
						/>
						<p className="text-xs text-muted-foreground">{helperText}</p>
					</div>

					<label className="flex items-start gap-2 text-sm">
						<input
							type="checkbox"
							checked={consentGiven}
							onChange={(event) => setConsentGiven(event.target.checked)}
						/>
						<span>I confirm consent was obtained for this recording.</span>
					</label>
				</div>

				<DialogFooter>
					<Button
						type="button"
						disabled={uploading || !!pollingId}
						onClick={() => {
							setOpen(false);
							reset();
						}}
						variant="ghost"
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={uploading || !!pollingId}
						onClick={async () => {
							if (!selectedFile) {
								toast.error("Select an audio file");
								return;
							}
							const fileError = validateFile(selectedFile);
							if (fileError) {
								toast.error(fileError);
								return;
							}
							if (!consentGiven) {
								toast.error("Consent is required");
								return;
							}

							setUploading(true);
							try {
								const createPayload = {
									audioFile: selectedFile,
									companyId,
									consentGiven: true,
									...(locationId ? { locationId } : {}),
								};
								const created = await voiceInterviewsApi.create({
									...createPayload,
								});
								await pollUntilReady(
									created.voiceInterviewId,
									created.bulkImportRunId,
								);
							} catch (error) {
								toast.error(
									error instanceof Error
										? error.message
										: "Voice upload failed",
								);
							} finally {
								setUploading(false);
							}
						}}
					>
						<Upload className="mr-2 h-4 w-4" />
						{uploading
							? "Uploading..."
							: pollingId
								? "Processing..."
								: "Upload"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
