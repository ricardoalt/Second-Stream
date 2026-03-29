"use client";

import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { StreamRow } from "./types";

const FREQUENCY_OPTIONS = [
	"One-time",
	"Weekly",
	"Bi-weekly",
	"Monthly",
	"Quarterly",
	"As needed",
] as const;

type StreamsDraftsTableProps = {
	rows: StreamRow[];
	onConfirm?: (id: string, draft: DraftEditorState) => void;
	onDelete?: (id: string) => void;
	highlightedId?: string | null;
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
	if (draftRow.volume.trim().length === 0) {
		errors.volume = "Volume is required.";
	}
	if (draftRow.frequency.trim().length === 0) {
		errors.frequency = "Frequency is required.";
	}
	if (draftRow.units.trim().length === 0) {
		errors.units = "Units are required.";
	}

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

export function StreamsDraftsTable({
	rows,
	onConfirm,
	onDelete,
	highlightedId,
}: StreamsDraftsTableProps) {
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
		onConfirm?.(row.id, rowDraft);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-b-0 bg-surface-container">
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Company
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Material Name
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Volume
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Units
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Frequency
					</TableHead>
					<TableHead className="px-4 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, index) => {
					const rowDraft = getDraftState(row);
					const rowErrors = errorsByRow[row.id] ?? {};

					return (
						<TableRow
							key={row.id}
							className={[
								index % 2 === 0
									? "border-b-0 bg-surface-container-lowest transition-all hover:bg-surface-container-high/50"
									: "border-b-0 bg-surface transition-all hover:bg-surface-container-high/50",
								highlightedId === row.id ? "ring-2 ring-primary" : "",
							].join(" ")}
						>
							<TableCell className="px-4 py-3">
								<p className="text-sm font-medium text-foreground">
									{row.client || "—"}
								</p>
								{row.location ? (
									<p className="mt-0.5 text-xs text-muted-foreground">
										{row.location}
									</p>
								) : null}
							</TableCell>
							<TableCell className="px-4 py-3">
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
									className="bg-surface-container-high/60"
									aria-invalid={Boolean(rowErrors.wasteType)}
								/>
								{rowErrors.wasteType ? (
									<p className="mt-1 text-xs text-destructive">
										{rowErrors.wasteType}
									</p>
								) : null}
							</TableCell>
							<TableCell className="px-4 py-3">
								<Input
									value={rowDraft.volume}
									onChange={(event) =>
										updateDraft(row.id, rowDraft, "volume", event.target.value)
									}
									className="w-20 bg-surface-container-high/60 text-center tabular-nums"
									aria-invalid={Boolean(rowErrors.volume)}
								/>
								{rowErrors.volume ? (
									<p className="mt-1 text-xs text-destructive">
										{rowErrors.volume}
									</p>
								) : null}
							</TableCell>
							<TableCell className="px-4 py-3">
								<Select
									value={rowDraft.units}
									onValueChange={(value) =>
										updateDraft(row.id, rowDraft, "units", value)
									}
								>
									<SelectTrigger className="bg-surface-container-high/60">
										<SelectValue placeholder="Select units" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="gal/mo">gal/mo</SelectItem>
											<SelectItem value="tons/mo">tons/mo</SelectItem>
											<SelectItem value="tons/once">tons/once</SelectItem>
											<SelectItem value="pallets/mo">pallets/mo</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
								{rowErrors.units ? (
									<p className="mt-1 text-xs text-destructive">
										{rowErrors.units}
									</p>
								) : null}
							</TableCell>
							<TableCell className="px-4 py-3">
								<Select
									value={rowDraft.frequency}
									onValueChange={(value) =>
										updateDraft(row.id, rowDraft, "frequency", value)
									}
								>
									<SelectTrigger
										className="bg-surface-container-high/60"
										aria-invalid={Boolean(rowErrors.frequency)}
									>
										<SelectValue placeholder="Select frequency" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{FREQUENCY_OPTIONS.map((option) => (
												<SelectItem key={option} value={option}>
													{option}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								{rowErrors.frequency ? (
									<p className="mt-1 text-xs text-destructive">
										{rowErrors.frequency}
									</p>
								) : null}
							</TableCell>
							<TableCell className="px-4 py-3">
								<div className="flex items-center justify-end gap-1.5">
									<button
										type="button"
										onClick={() => handleConfirm(row)}
										className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-container"
									>
										<Check
											data-icon="inline-start"
											aria-hidden
											className="size-3"
										/>
										Confirm
									</button>
									{onDelete ? (
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Discard draft"
											onClick={() => onDelete(row.id)}
										>
											<Trash2 aria-hidden className="size-4" />
										</Button>
									) : null}
								</div>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
