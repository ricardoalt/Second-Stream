"use client";

import { motion } from "framer-motion";
import { ChevronRight, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { StreamRow } from "./types";

type StreamsDraftsTableProps = {
	rows: StreamRow[];
	onReview?: (id: string, draft: DraftEditorState) => void;
	onConfirm?: (id: string, draft: DraftEditorState) => void;
	onDelete?: (id: string) => void;
	highlightedId?: string | null;
	confirmingIds?: Set<string>;
	deletingIds?: Set<string>;
	disableActions?: boolean;
};

export type DraftEditorState = {
	wasteType: string;
	volume: string;
	frequency: string;
	units: string;
	clientId: string;
	locationId: string;
};

type DraftValidationErrors = Partial<Record<keyof DraftEditorState, string>>;

export function validateDraft(
	draftRow: DraftEditorState,
): DraftValidationErrors {
	const errors: DraftValidationErrors = {};

	if (draftRow.wasteType.trim().length === 0) {
		errors.wasteType = "Material name is required.";
	}
	// Note: volume, frequency, and units are now optional — user can fill them later in workspace

	return errors;
}

export function applyDraftFieldUpdate<
	K extends keyof DraftEditorState,
>(params: {
	draft: DraftEditorState;
	field: K;
	value: DraftEditorState[K];
}): DraftEditorState {
	const { draft, field, value } = params;
	const nextDraft: DraftEditorState = {
		...draft,
		[field]: value,
	};

	if (field === "clientId") {
		nextDraft.locationId = "";
	}

	return nextDraft;
}

export function resolveDraftPrimaryActionMode(params: {
	onReview?: ((id: string, draft: DraftEditorState) => void) | undefined;
	onConfirm?: ((id: string, draft: DraftEditorState) => void) | undefined;
}): "review" | "confirm" {
	if (typeof params.onReview === "function") {
		return "review";
	}
	if (typeof params.onConfirm === "function") {
		return "confirm";
	}

	return "confirm";
}

// Componente para campos de draft con estilo "pill" azul
function DraftField({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 transition-all",
				"hover:border-primary/20 hover:bg-primary/[0.07]",
				"focus-within:border-primary/40 focus-within:bg-primary/[0.07] focus-within:ring-2 focus-within:ring-primary/10",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function StreamsDraftsTable({
	rows,
	onReview,
	onConfirm,
	onDelete,
	highlightedId,
	confirmingIds = new Set(),
	deletingIds = new Set(),
	disableActions = false,
}: StreamsDraftsTableProps) {
	const primaryActionMode = resolveDraftPrimaryActionMode({
		onReview,
		onConfirm,
	});
	const [draft, setDraft] = useState<Record<string, DraftEditorState>>({});
	const [errorsByRow, setErrorsByRow] = useState<
		Record<string, DraftValidationErrors>
	>({});

	function getDraftState(row: StreamRow): DraftEditorState {
		return (
			draft[row.id] ?? {
				wasteType: row.wasteType || row.name,
				volume: row.volume,
				frequency: row.frequency ?? "",
				units: row.units ?? "",
				clientId: row.clientId ?? "",
				locationId: row.locationId ?? "",
			}
		);
	}

	function updateDraft<K extends keyof DraftEditorState>(
		id: string,
		base: DraftEditorState,
		field: K,
		value: DraftEditorState[K],
	) {
		setDraft((current) => {
			const next = applyDraftFieldUpdate({
				draft: current[id] ?? base,
				field,
				value,
			});

			return {
				...current,
				[id]: next,
			};
		});
		setErrorsByRow((current) => {
			const nextRowErrors = { ...(current[id] ?? {}) };
			delete nextRowErrors[field];
			if (field === "clientId") {
				delete nextRowErrors.locationId;
			}
			return {
				...current,
				[id]: nextRowErrors,
			};
		});
	}

	function handleConfirm(row: StreamRow) {
		const rowDraft = getDraftState(row);
		const validationErrors = validateDraft(rowDraft);
		const hasErrors = Object.keys(validationErrors).length > 0;

		if (hasErrors) {
			setErrorsByRow((current) => ({
				...current,
				[row.id]: validationErrors,
			}));
			return;
		}

		setErrorsByRow((current) => ({
			...current,
			[row.id]: {},
		}));

		if (primaryActionMode === "review") {
			onReview?.(row.id, rowDraft);
			return;
		}

		onConfirm?.(row.id, rowDraft);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-b border-border/40 hover:bg-transparent">
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Company
					</TableHead>
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Material Name
					</TableHead>
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Volume
					</TableHead>
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Frequency
					</TableHead>
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Units
					</TableHead>
					<TableHead className="w-32 px-6 py-4 text-right" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, index) => {
					const rowDraft = getDraftState(row);
					const rowErrors = errorsByRow[row.id] ?? {};
					const isHighlighted = highlightedId === row.id;
					const isConfirming = confirmingIds.has(row.id);
					const isDeleting = deletingIds.has(row.id);
					const rowBusy = disableActions || isConfirming || isDeleting;

					return (
						<motion.tr
							key={row.id}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.2,
								delay: index * 0.03,
								ease: [0.25, 0.1, 0.25, 1],
							}}
							className={cn(
								"group border-b border-border/20 transition-all duration-200",
								"hover:bg-surface-container-high/30",
								"last:border-b-0",
								isHighlighted && "bg-primary/5 ring-2 ring-primary/20",
							)}
						>
							{/* Company */}
							<TableCell className="px-6 py-5">
								<div className="flex flex-col gap-0.5">
									<span className="text-sm font-semibold text-foreground">
										{row.client || "—"}
									</span>
									{row.location ? (
										<span className="text-xs text-muted-foreground">
											{row.location}
										</span>
									) : null}
								</div>
							</TableCell>

							{/* Material Name */}
							<TableCell className="px-6 py-5">
								<DraftField
									className={cn(
										rowErrors.wasteType &&
											"border-destructive/20 bg-destructive/5",
									)}
								>
									<Input
										value={rowDraft.wasteType}
										onChange={(event) =>
											updateDraft(
												row.id,
												rowDraft,
												"wasteType",
												event.target.value,
											)
										}
										className="h-7 border-0 bg-transparent px-0 text-sm font-medium text-foreground shadow-none focus-visible:ring-0"
										placeholder="Material name"
									/>
								</DraftField>
								{rowErrors.wasteType ? (
									<p className="mt-1.5 text-xs text-destructive">
										{rowErrors.wasteType}
									</p>
								) : null}
							</TableCell>

							{/* Volume */}
							<TableCell className="px-6 py-5">
								<DraftField
									className={cn(
										"w-28",
										rowErrors.volume &&
											"border-destructive/20 bg-destructive/5",
									)}
								>
									<div className="flex items-center gap-1">
										<Input
											value={rowDraft.volume}
											onChange={(event) =>
												updateDraft(
													row.id,
													rowDraft,
													"volume",
													event.target.value,
												)
											}
											className="h-7 w-full border-0 bg-transparent px-0 text-sm font-medium tabular-nums text-foreground shadow-none focus-visible:ring-0"
											placeholder="0.0"
										/>
									</div>
								</DraftField>
								{rowErrors.volume ? (
									<p className="mt-1.5 text-xs text-destructive">
										{rowErrors.volume}
									</p>
								) : null}
							</TableCell>

							{/* Frequency */}
							<TableCell className="px-6 py-5">
								<DraftField
									className={cn(
										"w-32",
										rowErrors.frequency &&
											"border-destructive/20 bg-destructive/5",
									)}
								>
									<Input
										value={rowDraft.frequency}
										onChange={(event) =>
											updateDraft(
												row.id,
												rowDraft,
												"frequency",
												event.target.value,
											)
										}
										className="h-7 border-0 bg-transparent px-0 text-sm font-medium text-foreground shadow-none focus-visible:ring-0"
										placeholder="e.g. monthly or 5-6 per month"
									/>
								</DraftField>
								{rowErrors.frequency ? (
									<p className="mt-1.5 text-xs text-destructive">
										{rowErrors.frequency}
									</p>
								) : null}
							</TableCell>

							{/* Units */}
							<TableCell className="px-6 py-5">
								<DraftField
									className={cn(
										"w-28",
										rowErrors.units && "border-destructive/20 bg-destructive/5",
									)}
								>
									<Input
										value={rowDraft.units}
										onChange={(event) =>
											updateDraft(row.id, rowDraft, "units", event.target.value)
										}
										className="h-7 border-0 bg-transparent px-0 text-sm font-medium text-foreground shadow-none focus-visible:ring-0"
										placeholder="e.g. gallons, lbs, bulk load"
									/>
								</DraftField>
								{rowErrors.units ? (
									<p className="mt-1.5 text-xs text-destructive">
										{rowErrors.units}
									</p>
								) : null}
							</TableCell>

							{/* Actions */}
							<TableCell className="px-6 py-5">
								<div className="flex items-center justify-end gap-2">
									<Button
										onClick={() => handleConfirm(row)}
										disabled={rowBusy}
										className="h-8 gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
									>
										{isConfirming ? (
											<>
												<Loader2 className="size-3.5 animate-spin" />
												{primaryActionMode === "review"
													? "Opening..."
													: "Confirming..."}
											</>
										) : (
											<>
												{primaryActionMode === "review" ? "Review" : "Confirm"}
												<ChevronRight className="size-3.5" />
											</>
										)}
									</Button>
									{onDelete ? (
										<Button
											variant="ghost"
											size="icon"
											className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
											aria-label="Discard draft"
											onClick={() => onDelete(row.id)}
											disabled={rowBusy}
										>
											{isDeleting ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<Trash2 className="size-4" />
											)}
										</Button>
									) : (
										<Button
											variant="ghost"
											size="icon"
											className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
										>
											<MoreHorizontal className="size-4" />
										</Button>
									)}
								</div>
							</TableCell>
						</motion.tr>
					);
				})}
			</TableBody>
		</Table>
	);
}
