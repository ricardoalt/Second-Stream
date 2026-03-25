"use client";

import { Bolt, ClipboardPaste, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type QuickPasteModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function QuickPasteModal({ open, onOpenChange }: QuickPasteModalProps) {
	const [text, setText] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (!isProcessing) return undefined;

		const interval = window.setInterval(() => {
			setProgress((value) => Math.min(100, value + 12));
		}, 120);

		const timeout = window.setTimeout(() => {
			setIsProcessing(false);
			setProgress(100);
		}, 1200);

		return () => {
			window.clearInterval(interval);
			window.clearTimeout(timeout);
		};
	}, [isProcessing]);

	useEffect(() => {
		if (!open) {
			setText("");
			setIsProcessing(false);
			setProgress(0);
		}
	}, [open]);

	const finished = !isProcessing && progress === 100;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,760px)] max-w-none gap-0 rounded-xl p-0">
				<DialogTitle className="sr-only">Quick Paste Modal</DialogTitle>
				<DialogDescription className="sr-only">
					Paste unstructured data and run mock AI extraction.
				</DialogDescription>

				<div className="flex flex-col bg-surface-container-lowest">
					<div className="flex items-center justify-between gap-2 bg-surface-container-low px-5 py-4">
						<div className="flex items-center gap-2">
							<ClipboardPaste className="text-primary" />
							<p className="font-display text-lg font-semibold">Quick Paste</p>
						</div>
						<Badge variant="secondary" className="rounded-full">
							AI Extraction Enabled
						</Badge>
					</div>

					<div className="flex flex-col gap-3 p-5">
						<Textarea
							value={text}
							onChange={(event) => setText(event.target.value)}
							placeholder="Paste laboratory certificates, shipping manifests, or supplier emails..."
							className="min-h-60 bg-surface"
						/>

						{isProcessing || finished ? (
							<div className="flex flex-col gap-2 rounded-lg bg-surface p-3">
								<Progress value={progress} aria-label="Extraction progress" />
								{finished ? (
									<div className="flex flex-wrap gap-2">
										<Badge className="rounded-full">Material identified</Badge>
										<Badge className="rounded-full">Volume identified</Badge>
										<Badge className="rounded-full">Location identified</Badge>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">
										Analyzing content and extracting structured fields...
									</p>
								)}
							</div>
						) : null}
					</div>

					<div className="flex items-center justify-end gap-2 bg-surface-container-low px-5 py-4">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								setProgress(8);
								setIsProcessing(true);
							}}
							disabled={text.trim().length < 20 || isProcessing}
						>
							{isProcessing ? (
								<>
									<Sparkles data-icon="inline-start" aria-hidden />
									Extracting...
								</>
							) : (
								<>
									<Bolt data-icon="inline-start" aria-hidden />
									Analyze &amp; Extract
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
