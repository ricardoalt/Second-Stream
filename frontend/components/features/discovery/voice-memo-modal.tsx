"use client";

import { Mic, Pause, PlayCircle, Save, StopCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type VoiceMemoModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60)
		.toString()
		.padStart(2, "0");
	const secs = (seconds % 60).toString().padStart(2, "0");
	return `${mins}:${secs}`;
}

export function VoiceMemoModal({ open, onOpenChange }: VoiceMemoModalProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [seconds, setSeconds] = useState(0);
	const [label, setLabel] = useState("Site walk-through notes");

	useEffect(() => {
		if (!open || !isRecording) return undefined;

		const interval = window.setInterval(() => {
			setSeconds((value) => value + 1);
		}, 1000);

		return () => window.clearInterval(interval);
	}, [open, isRecording]);

	useEffect(() => {
		if (!open) {
			setIsRecording(false);
			setSeconds(0);
			setLabel("Site walk-through notes");
		}
	}, [open]);

	const hasRecording = seconds > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,760px)] max-w-none gap-0 rounded-xl p-0">
				<DialogTitle className="sr-only">Record Voice Memo Modal</DialogTitle>
				<DialogDescription className="sr-only">
					Record a voice memo for stream discovery intake.
				</DialogDescription>

				<div className="flex flex-col bg-surface-container-lowest">
					<div className="bg-surface-container-low px-5 py-4">
						<p className="font-display text-lg font-semibold">
							Record Voice Memo
						</p>
						<p className="text-xs text-muted-foreground">
							Capture field observations and process them with AI transcription.
						</p>
					</div>

					<div className="flex flex-col items-center gap-5 px-5 py-8">
						<Button
							type="button"
							size="icon-lg"
							onClick={() => setIsRecording((value) => !value)}
							className={
								isRecording
									? "size-20 rounded-full animate-pulse"
									: "size-20 rounded-full"
							}
						>
							<Mic />
						</Button>

						<p className="font-display text-4xl font-semibold tabular-nums">
							{formatDuration(seconds)}
						</p>

						<p className="text-sm text-muted-foreground">
							{isRecording
								? "Recording waste stream characteristics..."
								: "Tap microphone to start or pause"}
						</p>

						<div className="flex items-end gap-1 rounded-md bg-surface px-3 py-2">
							{Array.from({ length: 24 }, (_, index) => ({
								id: `wave-${index}-${(index * 9) % 24}`,
								height: 8 + ((index * 9) % 24),
							})).map((bar) => (
								<div
									key={bar.id}
									className="w-1 rounded bg-primary/70"
									style={{ height: `${bar.height}px` }}
								/>
							))}
						</div>

						<div className="grid w-full gap-3 sm:grid-cols-[1fr_auto_auto]">
							<Input
								value={label}
								onChange={(event) => setLabel(event.target.value)}
								placeholder="Memo label"
							/>
							<Button
								variant="secondary"
								type="button"
								disabled={!hasRecording}
							>
								<PlayCircle data-icon="inline-start" aria-hidden />
								Preview
							</Button>
							<Badge
								variant="outline"
								className="justify-center rounded-md px-3 py-2"
							>
								Batch ID #CHEM-4092-A
							</Badge>
						</div>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-low px-5 py-4">
						<div className="flex gap-2">
							<Button
								variant="ghost"
								type="button"
								onClick={() => {
									setSeconds(0);
									setIsRecording(false);
								}}
								disabled={!hasRecording}
							>
								<Trash2 data-icon="inline-start" aria-hidden />
								Discard
							</Button>
							<Button
								variant="secondary"
								type="button"
								onClick={() => setIsRecording((value) => !value)}
								disabled={!hasRecording}
							>
								<Pause data-icon="inline-start" aria-hidden />
								Pause
							</Button>
							<Button
								variant="secondary"
								type="button"
								onClick={() => setIsRecording(false)}
								disabled={!hasRecording}
							>
								<StopCircle data-icon="inline-start" aria-hidden />
								Stop
							</Button>
						</div>

						<div className="flex gap-2">
							<Button variant="ghost" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button disabled={!hasRecording}>
								<Save data-icon="inline-start" aria-hidden />
								Save &amp; Process
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
