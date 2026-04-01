import { FileText, Mic, Sparkles, Upload } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

type QuickCaptureActionKey = "upload" | "voice" | "paste";

const QUICK_CAPTURE_ACTIONS = [
	{
		key: "upload",
		label: "Upload Documents",
		description: "SDS, COA, or Lab Reports",
		icon: FileText,
	},
	{
		key: "voice",
		label: "Record Voice Note",
		description: "Capture site visit observations",
		icon: Mic,
	},
	{
		key: "paste",
		label: "Quick Paste",
		description: "Auto-parse email/text raw data",
		icon: Sparkles,
	},
] as const;

interface StreamQuickCaptureCardProps {
	onOpenQuickCapture: (action: QuickCaptureActionKey) => void;
}

export function StreamQuickCaptureCard({
	onOpenQuickCapture,
}: StreamQuickCaptureCardProps) {
	const onDrop = useCallback(() => {
		onOpenQuickCapture("upload");
	}, [onOpenQuickCapture]);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		noClick: true,
		maxFiles: 10,
	});

	return (
		<div className="flex flex-col gap-3">
			<h3 className="text-xs font-bold uppercase tracking-[0.1em] text-secondary">
				Quick Capture
			</h3>

			{/* Drop zone */}
			<div
				{...getRootProps()}
				className={cn(
					"flex cursor-default flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 transition-colors",
					isDragActive
						? "border-primary bg-primary/5"
						: "border-border/30 hover:border-primary/30",
				)}
			>
				<input {...getInputProps()} />
				<Upload
					className={cn(
						"size-4 transition-colors",
						isDragActive ? "text-primary" : "text-muted-foreground/50",
					)}
					aria-hidden
				/>
				<p
					className={cn(
						"text-center text-[10px] leading-tight transition-colors",
						isDragActive ? "text-primary" : "text-muted-foreground/50",
					)}
				>
					{isDragActive ? "Release to open capture" : "Drop files here"}
				</p>
			</div>

			{/* Action buttons */}
			<div className="flex flex-col gap-2">
				{QUICK_CAPTURE_ACTIONS.map(
					({ key, label, description, icon: Icon }) => (
						<button
							key={key}
							type="button"
							onClick={() => onOpenQuickCapture(key)}
							className={cn(
								"group flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-3.5 text-left shadow-xs",
								"transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
							)}
						>
							<div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
								<Icon className="size-5" aria-hidden />
							</div>
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="text-sm font-semibold text-foreground">
									{label}
								</span>
								<span className="text-[11px] leading-tight text-muted-foreground">
									{description}
								</span>
							</div>
						</button>
					),
				)}
			</div>
		</div>
	);
}
