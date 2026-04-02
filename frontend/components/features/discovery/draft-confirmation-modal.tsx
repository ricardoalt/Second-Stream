"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	Check,
	FileText,
	Loader2,
	MapPin,
	Pencil,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	DRAFT_FREQUENCY_OPTIONS,
	DRAFT_UNITS_OPTIONS,
} from "@/components/features/streams/draft-field-options";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
	onRejectCandidate?: (itemId: string) => void;
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

export function canRejectCandidates(
	onRejectCandidate?: (itemId: string) => void,
): onRejectCandidate is (itemId: string) => void {
	return typeof onRejectCandidate === "function";
}

const MODAL_SHELL_WIDTH_CLASS =
	"w-[calc(100vw-2rem)] max-w-[1240px] sm:max-w-[1240px]";
const MODAL_CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-[1160px]";
const DESKTOP_TABLE_COLUMNS_CLASS =
	"grid-cols-[minmax(0,2.3fr)_minmax(120px,1fr)_minmax(72px,0.7fr)_minmax(72px,0.6fr)_minmax(96px,0.9fr)_minmax(196px,1.45fr)]";

export function DraftConfirmationModal({
	open,
	onOpenChange,
	candidates,
	editingCandidateId,
	onEditCandidate,
	onCandidateFieldChange,
	onConfirmCandidate,
	onRejectCandidate,
	onProcessFinalizeAll,
	candidateErrors = {},
	confirmingId = null,
	disableActions = false,
	isBulkConfirming = false,
}: DraftConfirmationModalProps) {
	const pendingCount = candidates.filter((c) => c.status === "pending").length;
	const showRejectAction = canRejectCandidates(onRejectCandidate);
	const confirmedCount = candidates.filter(
		(c) => c.status === "confirmed",
	).length;
	const totalCount = candidates.length;

	// Progress calculation
	const progressPercentage = useMemo(() => {
		if (totalCount === 0) return 0;
		return Math.round((confirmedCount / totalCount) * 100);
	}, [confirmedCount, totalCount]);

	return (
		<TooltipProvider delayDuration={300}>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className={cn(
						MODAL_SHELL_WIDTH_CLASS,
						"gap-0 overflow-hidden rounded-xl border border-border/50 bg-background p-0 shadow-2xl",
					)}
				>
					<DialogTitle className="sr-only">
						Confirm identified streams
					</DialogTitle>
					<DialogDescription className="sr-only">
						Review AI-extracted chemical waste manifests before system
						ingestion.
					</DialogDescription>

					{/* Header */}
					<div className="border-b border-border/50 bg-muted/30 px-6 py-5">
						<div
							className={cn(
								MODAL_CONTENT_WIDTH_CLASS,
								"flex items-start justify-between gap-6",
							)}
						>
							<div className="min-w-0 flex-1">
								<h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
									Confirm Identified Streams
								</h2>
								<p className="mt-0.5 max-w-[42rem] text-sm text-muted-foreground">
									Review AI-extracted chemical waste manifests before system
									ingestion.
								</p>

								{/* Progress Bar */}
								{totalCount > 0 && (
									<div className="mt-3 flex max-w-[24rem] items-center gap-3">
										<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
											<motion.div
												className="h-full rounded-full bg-success"
												initial={{ width: 0 }}
												animate={{ width: `${progressPercentage}%` }}
												transition={{ duration: 0.5, ease: "easeOut" }}
											/>
										</div>
										<span className="w-10 text-right text-xs font-medium tabular-nums text-muted-foreground">
											{progressPercentage}%
										</span>
									</div>
								)}
							</div>
							<div className="flex shrink-0 items-center justify-end pt-1">
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary cursor-help">
											<Sparkles className="size-3.5" />
											{candidates.length} detected
										</span>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										<p>
											AI detected {candidates.length} waste streams to review
										</p>
									</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</div>

					{/* Table Header */}
					<div className="border-b border-border/50 bg-muted/20 px-6">
						<div
							className={cn(
								MODAL_CONTENT_WIDTH_CLASS,
								"grid items-center gap-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground",
								DESKTOP_TABLE_COLUMNS_CLASS,
							)}
						>
							<div>Material Name</div>
							<div className="min-w-0">Source</div>
							<div className="text-right">Volume</div>
							<div className="text-center">Units</div>
							<div className="text-right">Frequency</div>
							<div className="text-right">Actions</div>
						</div>
					</div>

					{/* Table Body */}
					<div className="max-h-[min(70vh,600px)] overflow-auto px-6">
						<div
							className={cn(
								MODAL_CONTENT_WIDTH_CLASS,
								"divide-y divide-border/40",
							)}
						>
							<AnimatePresence mode="popLayout">
								{candidates.map((candidate, index) => {
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
										<motion.div
											key={candidate.itemId}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, scale: 0.98 }}
											transition={{
												duration: 0.2,
												delay: index * 0.03,
												ease: [0.25, 0.1, 0.25, 1],
											}}
											layout
											className={cn(
												"group relative transition-colors duration-200",
												isConfirmed ? "bg-success/5" : "hover:bg-muted/30",
												isEditing && "bg-primary/[0.02]",
											)}
										>
											{/* Status Indicator Bar */}
											<motion.div
												className={cn(
													"absolute left-0 top-0 bottom-0 w-[3px]",
													isConfirmed && "bg-success",
													isPending && "bg-muted-foreground/30",
													isEditing && "bg-primary",
												)}
												initial={{ scaleY: 0 }}
												animate={{ scaleY: 1 }}
												transition={{ duration: 0.3, delay: index * 0.03 }}
												style={{ originY: 0.5 }}
											/>

											{/* Main Row */}
											<div
												className={cn(
													"grid items-center gap-4 py-4",
													DESKTOP_TABLE_COLUMNS_CLASS,
												)}
											>
												{/* Material Name */}
												<div className="min-w-0 pl-2 pr-2">
													<p
														className={cn(
															"text-sm font-medium text-foreground",
															isConfirmed && "text-success",
														)}
													>
														{candidate.material}
													</p>
													<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
														{candidate.locationLabel ? (
															<Tooltip>
																<TooltipTrigger asChild>
																	<span className="inline-flex items-center gap-1 cursor-help hover:text-foreground transition-colors">
																		<MapPin className="size-3" />
																		{candidate.locationLabel}
																	</span>
																</TooltipTrigger>
																<TooltipContent side="bottom">
																	<p>Location: {candidate.locationLabel}</p>
																</TooltipContent>
															</Tooltip>
														) : null}
													</div>
												</div>

												{/* Source */}
												<div className="min-w-0">
													<Tooltip>
														<TooltipTrigger asChild>
															<div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground cursor-help transition-colors hover:text-foreground">
																<FileText className="size-3.5 shrink-0" />
																<span className="truncate">
																	{candidate.source}
																</span>
															</div>
														</TooltipTrigger>
														<TooltipContent side="bottom">
															<p>Source file: {candidate.source}</p>
														</TooltipContent>
													</Tooltip>
												</div>

												{/* Volume */}
												<div className="text-right">
													<span className="text-sm tabular-nums text-foreground">
														{candidate.volume ?? "—"}
													</span>
												</div>

												{/* Units */}
												<div className="text-center">
													<span className="text-sm text-muted-foreground">
														{candidate.units ?? "—"}
													</span>
												</div>

												{/* Frequency */}
												<div className="text-right">
													<span className="text-sm text-foreground">
														{candidate.frequency ?? "—"}
													</span>
												</div>

												{/* Actions */}
												<div className="flex items-center justify-end gap-2 whitespace-nowrap">
													{!isConfirmed ? (
														<>
															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			onEditCandidate(
																				isEditing ? null : candidate.itemId,
																			)
																		}
																		disabled={disableActions || showSpinner}
																		className="h-8 px-2.5 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
																	>
																		{isEditing ? (
																			<>
																				<X className="mr-1 size-3.5" />
																				Cancel
																			</>
																		) : (
																			<>
																				<Pencil className="mr-1 size-3.5" />
																				Edit
																			</>
																		)}
																	</Button>
																</TooltipTrigger>
																<TooltipContent side="top">
																	<p>
																		{isEditing
																			? "Cancel editing"
																			: "Edit stream details"}
																	</p>
																</TooltipContent>
															</Tooltip>

															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		size="sm"
																		onClick={() =>
																			onConfirmCandidate(candidate.itemId)
																		}
																		disabled={
																			!isPending ||
																			disableActions ||
																			showSpinner
																		}
																		className="h-8 bg-success text-success-foreground px-3 text-xs hover:bg-success/90 transition-all duration-200 hover:scale-105 active:scale-95"
																	>
																		{showSpinner ? (
																			<Loader2 className="size-3.5 animate-spin" />
																		) : (
																			<>
																				<Check className="mr-1 size-3.5" />
																				Confirm
																			</>
																		)}
																	</Button>
																</TooltipTrigger>
																<TooltipContent side="top">
																	<p>Confirm and create waste stream</p>
																</TooltipContent>
															</Tooltip>

															{showRejectAction ? (
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-8 w-8 text-muted-foreground hover:text-destructive transition-all duration-200 hover:scale-110"
																			onClick={() =>
																				onRejectCandidate(candidate.itemId)
																			}
																			disabled={disableActions || showSpinner}
																		>
																			{showSpinner ? (
																				<Loader2 className="size-3.5 animate-spin" />
																			) : (
																				<Trash2 className="size-3.5" />
																			)}
																		</Button>
																	</TooltipTrigger>
																	<TooltipContent side="top">
																		<p>Discard this stream</p>
																	</TooltipContent>
																</Tooltip>
															) : null}
														</>
													) : (
														<Tooltip>
															<TooltipTrigger asChild>
																<motion.span
																	className="inline-flex items-center gap-1.5 text-xs font-medium text-success cursor-help"
																	initial={{ opacity: 0, scale: 0.8 }}
																	animate={{ opacity: 1, scale: 1 }}
																	transition={{
																		type: "spring",
																		stiffness: 300,
																		damping: 20,
																	}}
																>
																	<motion.div
																		initial={{ scale: 0 }}
																		animate={{ scale: 1 }}
																		transition={{
																			type: "spring",
																			stiffness: 400,
																			damping: 15,
																			delay: 0.1,
																		}}
																	>
																		<Check className="size-3.5" />
																	</motion.div>
																	Confirmed
																</motion.span>
															</TooltipTrigger>
															<TooltipContent side="top">
																<p>Stream confirmed and created</p>
															</TooltipContent>
														</Tooltip>
													)}
												</div>
											</div>

											{/* Edit Mode Expansion */}
											<AnimatePresence>
												{isEditing && (
													<motion.div
														initial={{ height: 0, opacity: 0 }}
														animate={{ height: "auto", opacity: 1 }}
														exit={{ height: 0, opacity: 0 }}
														transition={{
															duration: 0.25,
															ease: [0.25, 0.1, 0.25, 1],
														}}
														className="overflow-hidden"
													>
														<div className="border-t border-border/40 bg-muted/20 px-6 py-4">
															<div className="grid gap-4 sm:grid-cols-3">
																<div className="space-y-1.5 sm:col-span-3">
																	<label
																		htmlFor={`material-${candidate.itemId}`}
																		className="text-xs font-medium text-muted-foreground"
																	>
																		Material
																	</label>
																	<Input
																		id={`material-${candidate.itemId}`}
																		value={candidate.material}
																		onChange={(event) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"material",
																				event.target.value,
																			)
																		}
																		disabled={disableActions}
																		className="h-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
																		placeholder="Enter material name..."
																	/>
																	{errors?.material ? (
																		<motion.p
																			className="text-xs text-destructive"
																			initial={{ opacity: 0, y: -5 }}
																			animate={{ opacity: 1, y: 0 }}
																		>
																			{errors.material}
																		</motion.p>
																	) : null}
																</div>

																<div className="space-y-1.5">
																	<label
																		htmlFor={`volume-${candidate.itemId}`}
																		className="text-xs font-medium text-muted-foreground"
																	>
																		Volume
																	</label>
																	<Input
																		id={`volume-${candidate.itemId}`}
																		value={candidate.volume ?? ""}
																		onChange={(event) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"volume",
																				event.target.value,
																			)
																		}
																		disabled={disableActions}
																		className="h-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
																		placeholder="e.g. 5,000"
																	/>
																	{errors?.volume ? (
																		<motion.p
																			className="text-xs text-destructive"
																			initial={{ opacity: 0, y: -5 }}
																			animate={{ opacity: 1, y: 0 }}
																		>
																			{errors.volume}
																		</motion.p>
																	) : null}
																</div>

																<div className="space-y-1.5">
																	<label
																		htmlFor={`units-${candidate.itemId}`}
																		className="text-xs font-medium text-muted-foreground"
																	>
																		Units
																	</label>
																	<Select
																		value={candidate.units ?? ""}
																		onValueChange={(value) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"units",
																				value,
																			)
																		}
																		disabled={disableActions}
																	>
																		<SelectTrigger
																			id={`units-${candidate.itemId}`}
																			className="h-9 text-sm"
																		>
																			<SelectValue placeholder="Select units" />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectGroup>
																				{DRAFT_UNITS_OPTIONS.map((option) => (
																					<SelectItem
																						key={option}
																						value={option}
																					>
																						{option}
																					</SelectItem>
																				))}
																			</SelectGroup>
																		</SelectContent>
																	</Select>
																</div>

																<div className="space-y-1.5">
																	<label
																		htmlFor={`frequency-${candidate.itemId}`}
																		className="text-xs font-medium text-muted-foreground"
																	>
																		Frequency
																	</label>
																	<Select
																		value={candidate.frequency ?? ""}
																		onValueChange={(value) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"frequency",
																				value,
																			)
																		}
																		disabled={disableActions}
																	>
																		<SelectTrigger
																			id={`frequency-${candidate.itemId}`}
																			className="h-9 text-sm"
																		>
																			<SelectValue placeholder="Select frequency" />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectGroup>
																				{DRAFT_FREQUENCY_OPTIONS.map(
																					(option) => (
																						<SelectItem
																							key={option}
																							value={option}
																						>
																							{option}
																						</SelectItem>
																					),
																				)}
																			</SelectGroup>
																		</SelectContent>
																	</Select>
																	{errors?.frequency ? (
																		<motion.p
																			className="text-xs text-destructive"
																			initial={{ opacity: 0, y: -5 }}
																			animate={{ opacity: 1, y: 0 }}
																		>
																			{errors.frequency}
																		</motion.p>
																	) : null}
																</div>
															</div>
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</motion.div>
									);
								})}
							</AnimatePresence>
						</div>
					</div>

					{/* Footer */}
					<div className="border-t border-border/50 bg-muted/30 px-6 py-4">
						<div
							className={cn(
								MODAL_CONTENT_WIDTH_CLASS,
								"flex items-center justify-between gap-4",
							)}
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground cursor-help">
										<Sparkles className="size-4 shrink-0 text-primary" />
										<span className="truncate">
											{confirmedCount > 0 ? (
												<>
													<strong className="text-success">
														{confirmedCount}
													</strong>{" "}
													confirmed, <strong>{pendingCount}</strong> pending
												</>
											) : (
												<>
													<strong>{pendingCount}</strong> streams identified for
													batch processing
												</>
											)}
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent side="top">
									<p>
										{confirmedCount} of {totalCount} streams confirmed
										{pendingCount > 0 && `, ${pendingCount} remaining`}
									</p>
								</TooltipContent>
							</Tooltip>

							<div className="flex shrink-0 items-center gap-3">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											onClick={() => onOpenChange(false)}
											disabled={disableActions}
											className="transition-all duration-200 hover:scale-105 active:scale-95"
										>
											Close
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>Close without confirming remaining streams</p>
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											onClick={onProcessFinalizeAll}
											disabled={disableActions || pendingCount === 0}
											className="bg-success text-success-foreground hover:bg-success/90 transition-all duration-200 hover:scale-105 active:scale-95"
										>
											{isBulkConfirming ? (
												<>
													<Loader2 className="mr-1.5 size-4 animate-spin" />
													{processFinalizeAllLabel(true)}
												</>
											) : (
												processFinalizeAllLabel(false)
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>
											{pendingCount > 0
												? `Confirm all ${pendingCount} remaining streams`
												: "All streams already confirmed"}
										</p>
									</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
