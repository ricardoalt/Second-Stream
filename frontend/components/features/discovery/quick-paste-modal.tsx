"use client";

import { ClipboardPaste, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const MIN_QUICK_PASTE_LENGTH = 20;

type QuickPasteModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function QuickPasteModal({ open, onOpenChange }: QuickPasteModalProps) {
	const discoveryWizard = useDiscoveryWizard();
	const [text, setText] = useState("");
	const trimmedText = text.trim();
	const hasValidText = trimmedText.length >= MIN_QUICK_PASTE_LENGTH;
	const charsNeeded = MIN_QUICK_PASTE_LENGTH - trimmedText.length;

	useEffect(() => {
		if (!open) {
			setText("");
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,760px)] max-w-none gap-0 rounded-xl p-0">
				<DialogTitle className="sr-only">Quick Paste Modal</DialogTitle>
				<DialogDescription className="sr-only">
					Paste unstructured data then continue in Discovery Wizard.
				</DialogDescription>

				<div className="flex flex-col bg-surface-container-lowest">
					<div className="flex items-center justify-between gap-2 bg-surface-container-low px-5 py-4">
						<div className="flex items-center gap-2">
							<ClipboardPaste className="text-primary" />
							<p className="font-display text-lg font-semibold">Quick Paste</p>
						</div>
						<Badge variant="secondary" className="rounded-full">
							Bridge to Discovery Wizard
						</Badge>
					</div>

					<div className="flex flex-col gap-3 p-5">
						<Textarea
							value={text}
							onChange={(event) => setText(event.target.value)}
							placeholder="Paste laboratory certificates, shipping manifests, or supplier emails..."
							className="min-h-60 bg-surface"
							aria-describedby={
								!hasValidText && trimmedText.length > 0
									? "quick-paste-text-hint"
									: undefined
							}
						/>
						{!hasValidText && trimmedText.length > 0 ? (
							<output
								id="quick-paste-text-hint"
								className="text-xs text-warning"
							>
								{charsNeeded} more character{charsNeeded === 1 ? "" : "s"}{" "}
								needed
							</output>
						) : null}
					</div>

					<div className="flex items-center justify-end gap-2 bg-surface-container-low px-5 py-4">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								onOpenChange(false);
								window.setTimeout(() => {
									discoveryWizard.openWithText(trimmedText);
								}, 0);
							}}
							disabled={!hasValidText}
						>
							<ExternalLink data-icon="inline-start" aria-hidden />
							Open in Discovery Wizard
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
