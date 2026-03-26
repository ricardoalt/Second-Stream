"use client";

import { AlertTriangle, ChevronRight, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
};

function getAlertForRow(row: StreamRow) {
	if (row.status === "missing_info") {
		return { label: "CRITICAL: SDS required", variant: "destructive" as const };
	}
	if (row.status === "blocked") {
		return { label: "Blocked: Pending review", variant: "warning" as const };
	}
	if (row.status === "draft") {
		return { label: "Go Confirm", variant: "confirm" as const };
	}
	return null;
}

export function StreamsAllTable({ rows }: StreamsAllTableProps) {
	const router = useRouter();

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-b-0 bg-surface-container">
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
					return (
						<TableRow
							key={row.id}
							onClick={() => router.push(`/streams/${row.id}`)}
							className={
								index % 2 === 0
									? "cursor-pointer border-b-0 bg-surface-container-lowest transition-colors hover:bg-surface-container-high/50"
									: "cursor-pointer border-b-0 bg-surface transition-colors hover:bg-surface-container-high/50"
							}
						>
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
									alert.variant === "confirm" ? (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												router.push(`/streams/${row.id}`);
											}}
											className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-container"
										>
											Go Confirm
											<ChevronRight aria-hidden className="size-3" />
										</button>
									) : (
										<Badge
											variant="secondary"
											className="rounded-full border-0 bg-error-container text-on-error-container"
										>
											<AlertTriangle aria-hidden className="mr-1 size-3" />
											{alert.label}
										</Badge>
									)
								) : (
									<span className="text-xs text-muted-foreground">—</span>
								)}
							</TableCell>
							<TableCell className="px-4 py-3.5 text-right">
								<button
									type="button"
									aria-label={`More actions for ${row.name}`}
									className="inline-flex rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-container hover:text-foreground"
									onClick={(e) => e.stopPropagation()}
								>
									<MoreVertical aria-hidden className="size-4" />
								</button>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
