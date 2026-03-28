import { Mic, Paperclip, PenSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QuickCaptureActionKey = "upload" | "voice" | "paste";

const QUICK_CAPTURE_ACTIONS = [
	{
		key: "upload",
		label: "Upload",
		description: "Drop files to prep workspace context",
		icon: Paperclip,
	},
	{
		key: "voice",
		label: "Voice",
		description: "Capture field notes from voice",
		icon: Mic,
	},
	{
		key: "paste",
		label: "Paste",
		description: "Paste copied notes or snippets",
		icon: PenSquare,
	},
] as const;

interface StreamQuickCaptureCardProps {
	onOpenQuickCapture: (action: QuickCaptureActionKey) => void;
}

export function StreamQuickCaptureCard({
	onOpenQuickCapture,
}: StreamQuickCaptureCardProps) {
	return (
		<Card className="bg-surface-container-lowest shadow-sm">
			<CardHeader className="gap-2">
				<div className="flex items-center justify-between gap-2">
					<CardTitle className="font-display text-lg">Quick Capture</CardTitle>
					<Badge variant="secondary" className="rounded-full">
						Live
					</Badge>
				</div>
				<p className="text-xs text-muted-foreground">
					Capture files, audio, and notes from one unified modal.
				</p>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 pt-0">
				{QUICK_CAPTURE_ACTIONS.map(
					({ key, label, description, icon: Icon }) => (
						<Button
							key={key}
							type="button"
							variant="outline"
							className="h-auto justify-start gap-3 px-3 py-3 text-start"
							onClick={() => onOpenQuickCapture(key)}
						>
							<Icon
								className="size-4 shrink-0 text-muted-foreground"
								aria-hidden
							/>
							<span className="flex flex-col items-start">
								<span className="text-sm font-medium text-foreground">
									{label}
								</span>
								<span className="text-xs text-muted-foreground">
									{description}
								</span>
							</span>
						</Button>
					),
				)}
			</CardContent>
		</Card>
	);
}
