"use client";

import { AlertTriangle, ArrowUpRight, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getAllStreamsPrimaryActionLabel } from "./runtime-helpers";
import { StreamStatusBadge } from "./stream-status-badge";
import { isDraftStream, type StreamRow } from "./types";

type StreamsAllTableProps = {
	rows: StreamRow[];
	selectedIds: Set<string>;
	onToggleSelection: (id: string, isSelected: boolean) => void;
	onToggleAllVisible: (isSelected: boolean) => void;
	onOpenDraft: (id: string) => void;
};

function getAlertForRow(row: StreamRow) {
	if (row.status === "missing_info") {
		return { label: "CRITICAL: SDS required", variant: "destructive" as const };
	}
	if (row.status === "blocked") {
		return { label: "Blocked: Pending review", variant: "warning" as const };
	}
	return null;
}

export function StreamsAllTable({
	rows,
	selectedIds,
	onToggleSelection,
	onToggleAllVisible,
	onOpenDraft,
}: StreamsAllTableProps) {
	const router = useRouter();
	const areAllVisibleSelected =
		rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-b-0 bg-surface-container">
					<TableHead className="w-12 px-4 py-3">
						<Checkbox
							checked={areAllVisibleSelected}
							onCheckedChange={(checked) =>
								onToggleAllVisible(checked === true)
							}
							aria-label="Select all visible streams"
						/>
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Material &amp; Client
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Status
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Volume
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Alerts
					</TableHead>
					<TableHead className="px-4 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, index) => {
					const alert = getAlertForRow(row);
					const isDraft = isDraftStream(row);
					const isSelected = selectedIds.has(row.id);

					function openRowWorkspace() {
						if (isDraft) {
							return;
						}
						router.push(`/streams/${row.id}`);
					}

					return (
						<TableRow
							key={row.id}
							onClick={openRowWorkspace}
							className={
								index % 2 === 0
									? "border-b-0 bg-surface-container-lowest transition-colors hover:bg-surface-container-high/50"
									: "border-b-0 bg-surface transition-colors hover:bg-surface-container-high/50"
							}
						>
							<TableCell className="w-12 px-4 py-3.5">
								<Checkbox
									checked={isSelected}
									onCheckedChange={(checked) => {
										onToggleSelection(row.id, checked === true);
									}}
									onClick={(event) => event.stopPropagation()}
									aria-label={`Select ${row.name}`}
								/>
							</TableCell>
							<TableCell className="px-4 py-3.5">
								<div className="flex flex-col gap-0.5">
									<span className="font-medium text-foreground">
										{row.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{row.client}
									</span>
								</div>
							</TableCell>
							<TableCell className="px-4 py-3.5">
								<StreamStatusBadge status={row.status} />
							</TableCell>
							<TableCell className="px-4 py-3.5 tabular-nums text-muted-foreground">
								{row.volume}
							</TableCell>
							<TableCell className="px-4 py-3.5">
								{alert ? (
									<Badge
										variant="secondary"
										className="rounded-full border-0 bg-error-container text-on-error-container"
									>
										<AlertTriangle aria-hidden className="mr-1 size-3" />
										{alert.label}
									</Badge>
								) : (
									<span className="text-xs text-muted-foreground">—</span>
								)}
							</TableCell>
							<TableCell className="px-4 py-3.5 text-right">
								{isDraft ? (
									<Button
										variant="default"
										size="sm"
										onClick={(event) => {
											event.stopPropagation();
											onOpenDraft(row.id);
										}}
									>
										{getAllStreamsPrimaryActionLabel(row)}
										<ChevronRight
											data-icon="inline-end"
											aria-hidden
											className="size-3"
										/>
									</Button>
								) : (
									<Button
										variant="secondary"
										size="sm"
										onClick={(event) => {
											event.stopPropagation();
											openRowWorkspace();
										}}
									>
										{getAllStreamsPrimaryActionLabel(row)}
										<ArrowUpRight
											data-icon="inline-end"
											aria-hidden
											className="size-3"
										/>
									</Button>
								)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
