"use client";

import { MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { StreamStatusBadge } from "./stream-status-badge";
import type { StreamRow } from "./types";

type StreamsAllTableProps = {
	rows: StreamRow[];
	selectedIds: string[];
	onToggleRow: (id: string, checked: boolean) => void;
	onToggleAll: (checked: boolean) => void;
};

export function StreamsAllTable({
	rows,
	selectedIds,
	onToggleRow,
	onToggleAll,
}: StreamsAllTableProps) {
	const allSelected = rows.length > 0 && selectedIds.length === rows.length;

	return (
		<Table>
			<TableHeader>
				<TableRow className="bg-surface-container-low">
					<TableHead className="w-10 px-4">
						<Checkbox
							aria-label="Select all streams"
							checked={allSelected}
							onCheckedChange={(checked) => onToggleAll(Boolean(checked))}
						/>
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Stream name
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Client</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Phase / status
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Waste type</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Volume</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Last updated
					</TableHead>
					<TableHead className="px-4 py-3 text-right text-[0.68rem]">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, index) => {
					const checked = selectedIds.includes(row.id);
					return (
						<TableRow
							key={row.id}
							className={
								index % 2 === 0 ? "bg-surface" : "bg-surface-container-low"
							}
						>
							<TableCell className="px-4">
								<Checkbox
									aria-label={`Select ${row.name}`}
									checked={checked}
									onCheckedChange={(value) =>
										onToggleRow(row.id, Boolean(value))
									}
								/>
							</TableCell>
							<TableCell className="px-4 py-3 font-medium text-foreground">
								<div className="flex flex-col gap-0.5">
									<span>{row.name}</span>
									<span className="text-xs text-muted-foreground">
										{row.location}
									</span>
								</div>
							</TableCell>
							<TableCell className="px-4 py-3 text-muted-foreground">
								{row.client}
							</TableCell>
							<TableCell className="px-4 py-3">
								<div className="flex flex-col gap-1">
									<span className="text-xs text-muted-foreground">
										Phase {row.phase}
									</span>
									<StreamStatusBadge status={row.status} />
								</div>
							</TableCell>
							<TableCell className="px-4 py-3 text-muted-foreground">
								{row.wasteType}
							</TableCell>
							<TableCell className="px-4 py-3 text-muted-foreground">
								{row.volume}
							</TableCell>
							<TableCell className="px-4 py-3 text-muted-foreground">
								{row.lastUpdated}
							</TableCell>
							<TableCell className="px-4 py-3 text-right">
								<button
									type="button"
									aria-label={`More actions for ${row.name}`}
									className="inline-flex rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
								>
									<MoreHorizontal aria-hidden className="size-4" />
								</button>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
