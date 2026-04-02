import { FileText, Mic, Sparkles, Upload } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

type QuickCaptureActionKey = "upload" | "voice" | "paste";

const QUICK_CAPTURE_ACTIONS = [
	{
		key: "upload" as const,
		label: "Upload Documents",
		description: "SDS, COA, or Lab Reports",
		icon: FileText,
		iconBg: "bg-primary",
		accentRing: "hover:ring-primary/15",
	},
	{
		key: "voice" as const,
		label: "Record Voice Note",
		description: "Capture site visit observations",
		icon: Mic,
		iconBg: "bg-warning",
		accentRing: "hover:ring-warning/15",
	},
	{
		key: "paste" as const,
		label: "Quick Paste",
		description: "Auto-parse email/text raw data",
		icon: Sparkles,
		iconBg: "bg-avatar-7",
		accentRing: "hover:ring-avatar-7/15",
	},
];

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
		<div className="rounded-xl bg-surface-container-lowest shadow-xs overflow-hidden flex flex-col">
			{/* Accent strip + heading */}
			<div className="h-1 bg-gradient-to-r from-primary via-avatar-7 to-warning" />
			<div className="px-4 pt-4 pb-3">
				<div className="flex items-center gap-1.5">
					<Sparkles className="size-3.5 text-primary" aria-hidden />
					<h3 className="text-xs font-bold uppercase tracking-[0.1em] text-foreground">
						Quick Capture
					</h3>
				</div>
				<p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
					Add evidence from documents, voice, or text to auto-fill fields.
				</p>
			</div>

			{/* Drop zone — hero */}
			<div className="px-4">
				<div
					{...getRootProps()}
					className={cn(
						"flex cursor-default flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 transition-all duration-200",
						isDragActive
							? "border-primary bg-primary/8 scale-[1.02]"
							: "border-border/40 bg-muted/30 hover:border-primary/40 hover:bg-primary/5",
					)}
				>
					<input {...getInputProps()} />
					<div
						className={cn(
							"flex size-10 items-center justify-center rounded-xl transition-colors duration-200",
							isDragActive
								? "bg-primary text-primary-foreground"
								: "bg-muted/60 text-muted-foreground/60",
						)}
					>
						<Upload className="size-5" aria-hidden />
					</div>
					<div className="text-center">
						<p
							className={cn(
								"text-xs font-medium transition-colors",
								isDragActive ? "text-primary" : "text-muted-foreground/70",
							)}
						>
							{isDragActive ? "Release to open capture" : "Drop files here"}
						</p>
						<p className="mt-0.5 text-[10px] text-muted-foreground/50">
							PDF, DOCX, images up to 10MB
						</p>
					</div>
				</div>
			</div>

			{/* Action buttons */}
			<div className="flex flex-col gap-2 p-4">
				{QUICK_CAPTURE_ACTIONS.map(
					({ key, label, description, icon: Icon, iconBg, accentRing }) => (
						<button
							key={key}
							type="button"
							onClick={() => onOpenQuickCapture(key)}
							className={cn(
								"group flex items-center gap-3 rounded-xl p-3 text-left",
								"border border-border/30 bg-background/60 transition-all duration-200",
								"hover:-translate-y-0.5 hover:shadow-sm hover:ring-1",
								accentRing,
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
							)}
						>
							<div
								className={cn(
									"flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-transform duration-200 group-hover:scale-105",
									iconBg,
								)}
							>
								<Icon className="size-4" aria-hidden />
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
