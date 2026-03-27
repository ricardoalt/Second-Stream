"use client";

import { Check, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateLocationDialog } from "@/components/features/locations/create-location-dialog";
import { Button } from "@/components/ui/button";
import { CompanyCombobox } from "@/components/ui/company-combobox";
import { Input } from "@/components/ui/input";
import { LocationCombobox } from "@/components/ui/location-combobox";
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
import { useLocationStore } from "@/lib/stores/location-store";
import type { StreamRow } from "./types";

type StreamsDraftsTableProps = {
	rows: StreamRow[];
	onConfirm?: (id: string, draft: DraftEditorState) => void;
	onDelete?: (id: string) => void;
	highlightedId?: string | null;
};

export type DraftEditorState = {
	wasteType: string;
	processMethod: string;
	volume: string;
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
		errors.wasteType = "Material type is required.";
	}
	if (draftRow.processMethod.trim().length === 0) {
		errors.processMethod = "Process method is required.";
	}
	if (draftRow.volume.trim().length === 0) {
		errors.volume = "Volume is required.";
	}
	if (draftRow.units.trim().length === 0) {
		errors.units = "Units are required.";
	}
	if (draftRow.locationId.trim().length === 0) {
		errors.locationId = "Location is required";
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

export function shouldShowZeroLocationRecovery(params: {
	clientId: string;
	availableLocationsCount: number;
}): boolean {
	const { clientId, availableLocationsCount } = params;
	return clientId.length > 0 && availableLocationsCount === 0;
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
	const { locations, loadLocationsByCompany } = useLocationStore();

	useEffect(() => {
		const companyIds = new Set<string>();
		for (const row of rows) {
			const rowDraft = draft[row.id];
			const companyId = rowDraft?.clientId ?? row.clientId ?? "";
			if (companyId) {
				companyIds.add(companyId);
			}
		}

		for (const companyId of companyIds) {
			void loadLocationsByCompany(companyId);
		}
	}, [draft, rows, loadLocationsByCompany]);

	function getDraftState(row: StreamRow): DraftEditorState {
		return (
			draft[row.id] ?? {
				wasteType: row.wasteType,
				processMethod: row.processMethod ?? "",
				volume: row.volume,
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
						Material type
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Process method
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Volume
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Units
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Client / Location
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
					const filteredLocations = locations.filter(
						(location) => location.companyId === rowDraft.clientId,
					);

					return (
						<TableRow
							key={row.id}
							className={[
								index % 2 === 0
									? "border-b-0 bg-surface-container-lowest"
									: "border-b-0 bg-surface",
								highlightedId === row.id ? "ring-2 ring-primary" : "",
							].join(" ")}
						>
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
								<Select
									value={rowDraft.processMethod}
									onValueChange={(value) =>
										updateDraft(row.id, rowDraft, "processMethod", value)
									}
								>
									<SelectTrigger className="bg-surface-container-high/60">
										<SelectValue placeholder="Select method" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="Neutralization">
												Neutralization
											</SelectItem>
											<SelectItem value="Mechanical Rect.">
												Mechanical Rect.
											</SelectItem>
											<SelectItem value="Distillation">Distillation</SelectItem>
											<SelectItem value="Incineration">Incineration</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
								{rowErrors.processMethod ? (
									<p className="mt-1 text-xs text-destructive">
										{rowErrors.processMethod}
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
							<TableCell className="px-4 py-3 align-top">
								<div className="space-y-2">
									<CompanyCombobox
										value={rowDraft.clientId}
										onValueChange={(value) =>
											updateDraft(row.id, rowDraft, "clientId", value)
										}
										placeholder="Select Client"
									/>
									<LocationCombobox
										companyId={rowDraft.clientId}
										value={rowDraft.locationId}
										onValueChange={(value) =>
											updateDraft(row.id, rowDraft, "locationId", value)
										}
										placeholder={
											rowDraft.clientId
												? "Select Location"
												: "Select Client first"
										}
									/>
									{shouldShowZeroLocationRecovery({
										clientId: rowDraft.clientId,
										availableLocationsCount: filteredLocations.length,
									}) ? (
										<div className="text-xs text-muted-foreground">
											No locations —{" "}
											<CreateLocationDialog
												companyId={rowDraft.clientId}
												onSuccess={(location) => {
													if (!location) {
														return;
													}
													void loadLocationsByCompany(rowDraft.clientId);
													updateDraft(
														row.id,
														rowDraft,
														"locationId",
														location.id,
													);
												}}
												trigger={
													<button
														type="button"
														className="font-medium text-primary hover:underline"
													>
														[+ Add location]
													</button>
												}
											/>
										</div>
									) : null}
									{rowErrors.locationId ? (
										<p className="text-xs text-destructive">
											{rowErrors.locationId}
										</p>
									) : null}
								</div>
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
