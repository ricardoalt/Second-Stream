"use client";

import { motion } from "framer-motion";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronRight,
	Clock,
	FileWarning,
	MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { isDraftStream, type StreamRow, type StreamStatus } from "./types";

type StreamsAllTableProps = {
	rows: StreamRow[];
	onOpenDraft: (id: string) => void;
};

const statusConfig: Record<
	StreamStatus,
	{ bg: string; text: string; border: string; label: string }
> = {
	active: {
		bg: "bg-emerald-50/80",
		text: "text-emerald-700",
		border: "border-emerald-200",
		label: "Active",
	},
	draft: {
		bg: "bg-slate-100",
		text: "text-slate-700",
		border: "border-slate-200",
		label: "Draft",
	},
	in_review: {
		bg: "bg-blue-50/80",
		text: "text-blue-700",
		border: "border-blue-200",
		label: "In review",
	},
	missing_info: {
		bg: "bg-rose-50/80",
		text: "text-rose-700",
		border: "border-rose-200",
		label: "Missing info",
	},
	blocked: {
		bg: "bg-red-50/80",
		text: "text-red-700",
		border: "border-red-200",
		label: "Blocked",
	},
	ready_for_offer: {
		bg: "bg-indigo-50/80",
		text: "text-indigo-700",
		border: "border-indigo-200",
		label: "Ready",
	},
	completed: {
		bg: "bg-slate-50",
		text: "text-slate-600",
		border: "border-slate-200",
		label: "Completed",
	},
};

function StatusPill({ status }: { status: StreamStatus }) {
	const config = statusConfig[status];

	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
				config.bg,
				config.text,
				config.border,
			)}
		>
			{config.label}
		</span>
	);
}

function AlertBadge({ 
	status, 
	alertText 
}: { 
	status: StreamStatus; 
	alertText: string | undefined 
}) {
	if (status === "draft") {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-100 px-3 py-1.5 text-xs font-medium text-teal-700">
				<CheckCircle2 className="size-3.5" />
				Go Confirm
			</span>
		);
	}

	if (status === "missing_info") {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
				<AlertTriangle className="size-3.5" />
				{alertText || "CRITICAL: Info required"}
			</span>
		);
	}

	if (status === "blocked") {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
				<Clock className="size-3.5" />
				Pending review
			</span>
		);
	}

	if (status === "ready_for_offer") {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
				<FileWarning className="size-3.5" />
				Ready to offer
			</span>
		);
	}

	return (
		<span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
			<CheckCircle2 className="size-3.5" />
			No issues
		</span>
	);
}

export function StreamsAllTable({ rows, onOpenDraft }: StreamsAllTableProps) {
	const router = useRouter();

	return (
		<Table>
			<TableHeader>
				<TableRow className="border-b border-border/40 hover:bg-transparent">
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Material &amp; Client
					</TableHead>
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Status
					</TableHead>
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Volume
					</TableHead>
					<TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
						Alerts
					</TableHead>
					<TableHead className="w-16 px-6 py-4 text-right" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, index) => {
					const isDraft = isDraftStream(row);
					const alertText =
						row.status === "missing_info"
							? row.missingFields?.[0]
								? `CRITICAL: ${row.missingFields[0]} required`
								: "CRITICAL: SDS required"
							: undefined;

					function handleRowClick() {
						if (isDraft) {
							onOpenDraft(row.id);
						} else {
							router.push(`/streams/${row.id}`);
						}
					}

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
							whileTap={{ scale: 0.998 }}
							onClick={handleRowClick}
							className={cn(
								"group cursor-pointer border-b border-border/20",
								"transition-all duration-200 ease-out",
								"hover:bg-surface-container-high/30",
								"last:border-b-0",
							)}
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									handleRowClick();
								}
							}}
						>
							{/* Material & Client */}
							<TableCell className="px-6 py-5">
								<div className="flex flex-col gap-1">
									<span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
										{row.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{row.client}
									</span>
								</div>
							</TableCell>

							{/* Status */}
							<TableCell className="px-6 py-5">
								<StatusPill status={row.status} />
							</TableCell>

							{/* Volume */}
							<TableCell className="px-6 py-5">
								<span className="text-sm tabular-nums font-medium text-foreground">
									{row.volume}
								</span>
							</TableCell>

							{/* Alerts */}
							<TableCell className="px-6 py-5">
								<AlertBadge status={row.status} alertText={alertText} />
							</TableCell>

							{/* Actions */}
							<TableCell className="px-6 py-5 text-right">
								<div className="flex items-center justify-end gap-1">
									{isDraft ? (
										<Button
											variant="ghost"
											size="sm"
											className="h-8 gap-1 px-3 text-xs font-medium text-teal-700 hover:bg-teal-50 hover:text-teal-800"
											onClick={(e) => {
												e.stopPropagation();
												onOpenDraft(row.id);
											}}
										>
											Go Confirm
											<ChevronRight className="size-4" />
										</Button>
									) : (
										<>
											<Button
												variant="ghost"
												size="icon"
												className="size-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
												onClick={(e) => {
													e.stopPropagation();
													// TODO: Open menu
												}}
											>
												<MoreHorizontal className="size-4" />
											</Button>
											<ChevronRight className="size-4 text-muted-foreground/30 transition-all duration-200 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5" />
										</>
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
