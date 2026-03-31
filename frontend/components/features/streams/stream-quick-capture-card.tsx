import { FileText, Mic, Sparkles } from "lucide-react";
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
	return (
		<div className="flex flex-col gap-3">
			<h3 className="text-xs font-bold uppercase tracking-[0.1em] text-secondary">
				Quick Capture
			</h3>
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
