"use client";

import { StreamContactsPageContent } from "@/components/features/streams/stream-contacts-page-content";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface StreamContactsDialogProps {
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function StreamContactsDialog({
	projectId,
	open,
	onOpenChange,
}: StreamContactsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
				<DialogHeader className="sr-only">
					<DialogTitle>Contacts</DialogTitle>
					<DialogDescription>
						Prioritizing contacts at the current location first.
					</DialogDescription>
				</DialogHeader>
				{open ? (
					<StreamContactsPageContent
						projectId={projectId}
						backHref={`/streams/${projectId}`}
						showBackToWorkspace={false}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
