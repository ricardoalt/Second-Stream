"use client";

import { Check, MoreVertical, PencilLine, Trash2, X } from "lucide-react";
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

type StreamsDraftsTableProps = {
	rows: StreamRow[];
	onConfirm?: (id: string) => void;
	onDelete?: (id: string) => void;
};

type DraftEditorState = {
	wasteType: string;
	processMethod: string;
	volume: string;
	location: string;
};

export function StreamsDraftsTable({
	rows,
	onConfirm,
	onDelete,
}: StreamsDraftsTableProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState<Record<string, DraftEditorState>>({});

	function startEditing(row: StreamRow) {
		setDraft((current) => ({
			...current,
			[row.id]: {
				wasteType: row.wasteType,
				processMethod: row.processMethod ?? "",
				volume: row.volume,
				location: row.location,
			},
		}));
		setEditingId(row.id);
	}

	function updateDraft<K extends keyof DraftEditorState>(
		id: string,
		field: K,
		value: DraftEditorState[K],
	) {
		setDraft((current) => ({
			...current,
			[id]: {
				...(current[id] ?? {
					wasteType: "",
					processMethod: "",
					volume: "",
					location: "",
				}),
				[field]: value,
			},
		}));
	}

	function saveEditing() {
		setEditingId(null);
	}

	function cancelEditing() {
		setEditingId(null);
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
						Vol. (tons/mo)
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Storage location
					</TableHead>
					<TableHead className="px-4 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, index) => {
					const rowDraft = draft[row.id];
					const isEditing = editingId === row.id;

					return (
						<TableRow
							key={row.id}
							className={
								index % 2 === 0
									? "border-b-0 bg-surface-container-lowest"
									: "border-b-0 bg-surface"
							}
						>
							<TableCell className="px-4 py-3">
								<Input
									value={rowDraft?.wasteType ?? row.wasteType}
									onChange={(event) =>
										updateDraft(row.id, "wasteType", event.target.value)
									}
									className="bg-surface-container-high/60"
									readOnly={!isEditing}
								/>
							</TableCell>
							<TableCell className="px-4 py-3">
								<Select
									value={rowDraft?.processMethod ?? row.processMethod ?? ""}
									onValueChange={(value) =>
										updateDraft(row.id, "processMethod", value)
									}
									disabled={!isEditing}
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
							</TableCell>
							<TableCell className="px-4 py-3">
								<Input
									value={rowDraft?.volume ?? row.volume}
									onChange={(event) =>
										updateDraft(row.id, "volume", event.target.value)
									}
									className="w-20 bg-surface-container-high/60 text-center tabular-nums"
									readOnly={!isEditing}
								/>
							</TableCell>
							<TableCell className="px-4 py-3">
								<Input
									value={rowDraft?.location ?? row.location}
									onChange={(event) =>
										updateDraft(row.id, "location", event.target.value)
									}
									className="bg-surface-container-high/60"
									readOnly={!isEditing}
								/>
							</TableCell>
							<TableCell className="px-4 py-3">
								<div className="flex items-center justify-end gap-1.5">
									{isEditing ? (
										<>
											<Button variant="ghost" size="sm" onClick={saveEditing}>
												<Check data-icon="inline-start" aria-hidden />
												Save
											</Button>
											<Button variant="ghost" size="sm" onClick={cancelEditing}>
												<X data-icon="inline-start" aria-hidden />
											</Button>
										</>
									) : (
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => startEditing(row)}
											aria-label="Edit draft"
										>
											<PencilLine aria-hidden />
										</Button>
									)}
									<button
										type="button"
										onClick={() => onConfirm?.(row.id)}
										className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-container"
									>
										CONFIRM
									</button>
									<button
										type="button"
										aria-label={`More actions for ${row.name}`}
										className="inline-flex rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
										onClick={() => onDelete?.(row.id)}
									>
										<MoreVertical aria-hidden className="size-4" />
									</button>
								</div>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
