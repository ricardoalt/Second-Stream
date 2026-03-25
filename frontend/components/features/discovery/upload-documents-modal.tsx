"use client";

import { CheckCircle2, FileText, Mail, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

type UploadDocumentsModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type UploadItem = {
	id: string;
	name: string;
	size: string;
	type: "pdf" | "email";
};

const initialItems: UploadItem[] = [
	{
		id: "u1",
		name: "LabAnalysis_SiteA.pdf",
		size: "2.4MB",
		type: "pdf",
	},
	{
		id: "u2",
		name: "ClientEmail_Sept24.msg",
		size: "1.2MB",
		type: "email",
	},
];

export function UploadDocumentsModal({
	open,
	onOpenChange,
}: UploadDocumentsModalProps) {
	const [items, setItems] = useState<UploadItem[]>(initialItems);
	const [progress, setProgress] = useState(0);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		if (!open) {
			setItems(initialItems);
			setProgress(0);
			setIsProcessing(false);
		}
	}, [open]);

	useEffect(() => {
		if (!isProcessing) return undefined;

		const interval = window.setInterval(() => {
			setProgress((value) => {
				if (value >= 100) return 100;
				return value + 10;
			});
		}, 150);

		const timeout = window.setTimeout(() => {
			setIsProcessing(false);
			setProgress(100);
		}, 1600);

		return () => {
			window.clearInterval(interval);
			window.clearTimeout(timeout);
		};
	}, [isProcessing]);

	const totalSize = useMemo(() => {
		const parsed = items.reduce((acc, item) => {
			const size = Number(item.size.replace("MB", ""));
			return acc + size;
		}, 0);

		return `${parsed.toFixed(1)}MB`;
	}, [items]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,760px)] max-w-none gap-0 rounded-xl p-0">
				<DialogTitle className="sr-only">Upload Documents Modal</DialogTitle>
				<DialogDescription className="sr-only">
					Queue source documents and process them for extraction.
				</DialogDescription>

				<div className="flex flex-col bg-surface-container-lowest">
					<div className="bg-surface-container-low px-5 py-4">
						<p className="font-display text-lg font-semibold">
							Upload Source Documents
						</p>
						<p className="text-xs text-muted-foreground">
							Provide laboratory analysis or logistics manifests for stream
							verification.
						</p>
					</div>

					<div className="flex flex-col gap-4 p-5">
						<div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-4 text-center">
							<Upload className="text-primary" />
							<p className="font-medium">Drag &amp; Drop files here</p>
							<p className="text-xs text-muted-foreground">
								Supported Formats: PDF, MSG, XLSX, JPG (MAX 25MB)
							</p>
							<Button
								variant="secondary"
								type="button"
								onClick={() =>
									setItems((current) => [
										...current,
										{
											id: crypto.randomUUID(),
											name: `Source_${current.length + 1}.pdf`,
											size: "1.0MB",
											type: "pdf",
										},
									])
								}
							>
								<FileText data-icon="inline-start" aria-hidden />
								Add mock file
							</Button>
						</div>

						<div className="flex items-center justify-between">
							<p className="text-sm font-medium">
								Queue for Processing ({items.length})
							</p>
							<p className="text-xs text-muted-foreground">
								Total size: {totalSize}
							</p>
						</div>

						<div className="flex flex-col gap-2">
							{items.map((item) => (
								<div
									key={item.id}
									className="flex items-center justify-between rounded-md bg-surface px-3 py-2"
								>
									<div className="flex items-center gap-2">
										{item.type === "email" ? (
											<Mail className="text-muted-foreground" />
										) : (
											<FileText className="text-muted-foreground" />
										)}
										<div>
											<p className="text-sm font-medium">{item.name}</p>
											<p className="text-xs text-muted-foreground">
												{item.size}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-1">
										<CheckCircle2 className="text-primary" />
										<Button
											variant="ghost"
											size="icon-sm"
											type="button"
											onClick={() =>
												setItems((current) =>
													current.filter((entry) => entry.id !== item.id),
												)
											}
										>
											<X />
										</Button>
									</div>
								</div>
							))}
						</div>

						{isProcessing || progress > 0 ? (
							<div className="flex flex-col gap-2 rounded-lg bg-surface p-3">
								<Progress
									value={progress}
									aria-label="Upload processing progress"
								/>
								<p className="text-xs text-muted-foreground">
									{progress === 100
										? "Documents processed and ready for extraction review."
										: "Running OCR and document extraction..."}
								</p>
							</div>
						) : null}
					</div>

					<div className="flex items-center justify-between bg-surface-container-low px-5 py-4">
						<Badge variant="outline" className="rounded-full">
							Compliance hint: ensure hazardous codes are visible.
						</Badge>
						<div className="flex gap-2">
							<Button variant="ghost" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button
								onClick={() => {
									setProgress(6);
									setIsProcessing(true);
								}}
								disabled={items.length === 0 || isProcessing}
							>
								Process Documents
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
