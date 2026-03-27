"use client";

import { CircleCheck, FileText, Loader2, MapPin, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
	CandidateEditableField,
	CandidateValidationErrors,
} from "@/lib/discovery-confirmation-utils";
import type { DraftCandidate } from "@/lib/types/discovery";
import { cn } from "@/lib/utils";

export function useDraftConfirmationModal(initialOpen = false) {
	const [open, setOpen] = useState(initialOpen);

	const openModal = useCallback(() => setOpen(true), []);
	const closeModal = useCallback(() => setOpen(false), []);

	return {
		open,
		setOpen,
		openModal,
		closeModal,
	};
}

type DraftConfirmationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	candidates: DraftCandidate[];
	editingCandidateId: string | null;
	onEditCandidate: (itemId: string | null) => void;
	onCandidateFieldChange: (
		itemId: string,
		field: CandidateEditableField,
		value: string,
	) => void;
	onConfirmCandidate: (itemId: string) => void;
	onProcessFinalizeAll: () => void;
	candidateErrors?: Record<string, CandidateValidationErrors>;
	confirmingId?: string | null;
	disableActions?: boolean;
	isBulkConfirming?: boolean;
};

export function isCandidateBusy(params: {
	candidate: DraftCandidate;
	confirmingId: string | null;
	isBulkConfirming: boolean;
}): boolean {
	const { candidate, confirmingId, isBulkConfirming } = params;
	return (
		confirmingId === candidate.itemId ||
		(isBulkConfirming && candidate.status === "pending")
	);
}

export function processFinalizeAllLabel(isBulkConfirming: boolean): string {
	return isBulkConfirming ? "Processing…" : "Process & Finalize All";
}

export function DraftConfirmationModal({
	open,
	onOpenChange,
	candidates,
	editingCandidateId,
	onEditCandidate,
	onCandidateFieldChange,
	onConfirmCandidate,
	onProcessFinalizeAll,
	candidateErrors = {},
	confirmingId = null,
	disableActions = false,
	isBulkConfirming = false,
}: DraftConfirmationModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(94vw,980px)] max-w-none gap-0 overflow-hidden rounded-2xl p-0">
				<DialogTitle className="sr-only">
					Confirm identified candidates
				</DialogTitle>
				<DialogDescription className="sr-only">
					Review, edit, and confirm AI-detected waste stream candidates.
				</DialogDescription>

				<div className="flex items-center justify-between border-b border-border/30 bg-surface-container-low px-6 py-4">
					<div className="min-w-0">
						<p className="font-display text-lg font-semibold tracking-tight">
							Confirm Identified Candidates
						</p>
						<p className="text-sm text-muted-foreground">
							Review each candidate before creating real waste streams.
						</p>
					</div>
					<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
						<Sparkles className="size-3.5" />
						{candidates.length} detected
					</span>
				</div>

				<div className="max-h-[min(68vh,620px)] overflow-auto px-6 py-5">
					<div className="space-y-3">
						{candidates.map((candidate) => {
							const isConfirmed = candidate.status === "confirmed";
							const isPending = candidate.status === "pending";
							const isEditing = editingCandidateId === candidate.itemId;
							const errors = candidateErrors[candidate.itemId];
							const showSpinner = isCandidateBusy({
								candidate,
								confirmingId,
								isBulkConfirming,
							});

							return (
								<div
									key={candidate.itemId}
									className={cn(
										"rounded-xl border border-border/40 bg-card px-4 py-3 transition-colors",
										isEditing && "border-primary/40 ring-1 ring-primary/20",
										isConfirmed &&
											"border-emerald-500/30 bg-emerald-500/[0.04]",
									)}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="truncate font-medium">
												{candidate.material}
											</p>
											<div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
												<span>{candidate.volume ?? "—"}</span>
												<span>{candidate.frequency ?? "—"}</span>
												<span>{candidate.units ?? "—"}</span>
												{candidate.locationLabel ? (
													<span className="inline-flex items-center gap-1">
														<MapPin className="size-3" />
														{candidate.locationLabel}
													</span>
												) : null}
												<span className="inline-flex items-center gap-1">
													<FileText className="size-3" />
													{candidate.source}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													onEditCandidate(isEditing ? null : candidate.itemId)
												}
												disabled={disableActions}
											>
												{isEditing ? "Done" : "Edit"}
											</Button>
											<Button
												size="sm"
												onClick={() => onConfirmCandidate(candidate.itemId)}
												disabled={!isPending || disableActions}
											>
												{showSpinner ? (
													<Loader2 className="size-3.5 animate-spin" />
												) : (
													<>
														<CircleCheck className="mr-1 size-3.5" />
														Confirm Candidate
													</>
												)}
											</Button>
										</div>
									</div>

									{isEditing ? (
										<div className="mt-3 grid gap-2 sm:grid-cols-3">
											<div className="space-y-1 sm:col-span-3">
												<p className="text-[11px] font-medium text-muted-foreground">
													Material
												</p>
												<Input
													value={candidate.material}
													onChange={(event) =>
														onCandidateFieldChange(
															candidate.itemId,
															"material",
															event.target.value,
														)
													}
													disabled={disableActions}
												/>
												{errors?.material ? (
													<p className="text-[11px] text-destructive">
														{errors.material}
													</p>
												) : null}
											</div>

											<div className="space-y-1">
												<p className="text-[11px] font-medium text-muted-foreground">
													Volume
												</p>
												<Input
													value={candidate.volume ?? ""}
													onChange={(event) =>
														onCandidateFieldChange(
															candidate.itemId,
															"volume",
															event.target.value,
														)
													}
													disabled={disableActions}
												/>
												{errors?.volume ? (
													<p className="text-[11px] text-destructive">
														{errors.volume}
													</p>
												) : null}
											</div>

											<div className="space-y-1">
												<p className="text-[11px] font-medium text-muted-foreground">
													Frequency
												</p>
												<Input
													value={candidate.frequency ?? ""}
													onChange={(event) =>
														onCandidateFieldChange(
															candidate.itemId,
															"frequency",
															event.target.value,
														)
													}
													disabled={disableActions}
												/>
												{errors?.frequency ? (
													<p className="text-[11px] text-destructive">
														{errors.frequency}
													</p>
												) : null}
											</div>
										</div>
									) : null}
								</div>
							);
						})}
					</div>
				</div>

				<div className="flex items-center justify-end border-t border-border/30 bg-surface-container-low px-6 py-4">
					<Button onClick={onProcessFinalizeAll} disabled={disableActions}>
						{isBulkConfirming ? (
							<>
								<Loader2 className="mr-1.5 size-3.5 animate-spin" />
								{processFinalizeAllLabel(true)}
							</>
						) : (
							processFinalizeAllLabel(false)
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
