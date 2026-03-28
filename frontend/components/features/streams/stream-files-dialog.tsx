"use client";

import { StreamFilesPageContent } from "@/components/features/streams/stream-files-page-content";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface StreamFilesDialogProps {
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onFilesChanged?: (() => void) | undefined;
}

export function StreamFilesDialog({
	projectId,
	open,
	onOpenChange,
	onFilesChanged,
}: StreamFilesDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92vh] w-[96vw] max-w-6xl overflow-hidden p-0">
				<DialogHeader className="sr-only">
					<DialogTitle>Files</DialogTitle>
					<DialogDescription>
						Upload stream evidence and review processed outputs.
					</DialogDescription>
				</DialogHeader>
				{open ? (
					<StreamFilesPageContent
						projectId={projectId}
						backHref={`/streams/${projectId}`}
						onFilesChanged={onFilesChanged}
						showBackToWorkspace={false}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
