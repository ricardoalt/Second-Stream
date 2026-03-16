"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ProposalSentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirmSent: () => void;
}

export function ProposalSentDialog({
	open,
	onOpenChange,
	onConfirmSent,
}: ProposalSentDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Confirm proposal sent</DialogTitle>
					<DialogDescription>
						This will update the stream status and record the submission date.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex-col gap-2 sm:flex-row">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="w-full sm:w-auto"
					>
						Cancel
					</Button>
					<Button onClick={onConfirmSent} className="w-full sm:w-auto">
						Confirm
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
