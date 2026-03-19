"use client";

import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	useWorkspaceActions,
	useWorkspaceProposalBatch,
	useWorkspaceProposalModalOpen,
	useWorkspaceStore,
} from "@/lib/stores/workspace-store";

interface ProposalReviewModalProps {
	projectId: string;
}

export function ProposalReviewModal({ projectId }: ProposalReviewModalProps) {
	const batch = useWorkspaceProposalBatch();
	const proposalModalOpen = useWorkspaceProposalModalOpen();
	const confirming = useWorkspaceStore((s) => s.confirming);
	const {
		updateProposal,
		confirmProposals,
		closeProposalBatchModal,
		dismissProposalBatch,
	} = useWorkspaceActions();

	const isOpen = batch !== null && proposalModalOpen;
	const selectedCount = batch?.proposals.filter((p) => p.selected).length ?? 0;

	const handleConfirm = async () => {
		try {
			await confirmProposals(projectId);
			toast.success(
				`Applied ${selectedCount} AI update${selectedCount === 1 ? "" : "s"}`,
			);
		} catch {
			toast.error("Failed to confirm proposals");
		}
	};

	const handleClose = () => {
		closeProposalBatchModal();
	};

	const handleDiscard = () => {
		dismissProposalBatch();
	};

	const suggestions = batch?.proposals ?? [];
	const suggestedUpdates = suggestions.filter(
		(proposal) =>
			proposal.targetKind === "base_field" ||
			proposal.existingCustomFieldId !== null,
	);
	const newFields = suggestions.filter(
		(proposal) =>
			proposal.targetKind === "custom_field" &&
			proposal.existingCustomFieldId === null,
	);

	const renderProposal = (proposal: (typeof suggestions)[number]) => (
		<div key={proposal.tempId} className="border rounded-lg p-4 space-y-3">
			<div className="flex items-start gap-3">
				<Checkbox
					checked={proposal.selected}
					onCheckedChange={(checked) =>
						updateProposal(proposal.tempId, {
							selected: checked === true,
						})
					}
					aria-label={`Select "${proposal.proposedLabel}"`}
				/>
				<div className="flex-1 space-y-2">
					<Input
						value={proposal.proposedLabel}
						onChange={(e) => {
							if (proposal.targetKind === "custom_field") {
								updateProposal(proposal.tempId, {
									proposedLabel: e.target.value,
								});
							}
						}}
						readOnly={proposal.targetKind === "base_field"}
						disabled={proposal.targetKind === "base_field"}
						className="font-medium"
						aria-label="Field label"
					/>
					<Textarea
						value={proposal.proposedAnswer}
						onChange={(e) =>
							updateProposal(proposal.tempId, {
								proposedAnswer: e.target.value,
							})
						}
						className="min-h-[60px] resize-y"
						aria-label="Field answer"
					/>
				</div>
				{proposal.confidence !== null && (
					<Badge variant="outline" className="text-xs flex-shrink-0">
						{proposal.confidence}%
					</Badge>
				)}
			</div>

			{proposal.evidenceRefs.length > 0 && (
				<div className="ml-8 flex flex-wrap gap-1">
					{proposal.evidenceRefs.map((ref) => (
						<Badge key={ref.fileId} variant="outline" className="text-xs gap-1">
							<FileText className="h-3 w-3" />
							{ref.filename}
							{ref.page && ` p.${ref.page}`}
						</Badge>
					))}
				</div>
			)}
		</div>
	);

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Review AI Proposals</DialogTitle>
					<DialogDescription>
						Review suggested updates and new fields before confirming. Uncheck
						any item you want to skip.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4 py-4">
					{suggestedUpdates.length > 0 && (
						<div className="space-y-3">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Suggested updates
							</p>
							{suggestedUpdates.map(renderProposal)}
						</div>
					)}
					{newFields.length > 0 && (
						<div className="space-y-3">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								New fields
							</p>
							{newFields.map(renderProposal)}
						</div>
					)}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={handleClose} disabled={confirming}>
						Cancel
					</Button>
					<Button variant="ghost" onClick={handleDiscard} disabled={confirming}>
						Discard batch
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={confirming || selectedCount === 0}
					>
						{confirming ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Confirming...
							</>
						) : (
							`Apply ${selectedCount} AI update${selectedCount === 1 ? "" : "s"}`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
