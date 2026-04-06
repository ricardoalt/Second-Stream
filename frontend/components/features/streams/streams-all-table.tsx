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
import { StatusChip } from "@/components/patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { AutoTeamAvatar } from "@/components/ui/team-avatar";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";
import { isDraftStream, type StreamRow, type StreamStatus } from "./types";

type StreamsAllTableProps = {
	rows: StreamRow[];
	onOpenDraft: (id: string) => void;
};

/**
 * Mapeo de estados de Stream a variantes de StatusChip
 *
 * Design System Editorial - Tokens semánticos:
 * - success: Estados positivos (active, completed, go confirm)
 * - warning: Estados de atención (blocked, pending review)
 * - destructive: Estados críticos (missing_info)
 * - primary: Estados en progreso (in_review, ready_for_offer)
 * - secondary: Estados neutrales (draft)
 * - muted: Estados finales/archivados (completed)
 */
const statusToChipVariant: Record<
	StreamStatus,
	{
		status: React.ComponentProps<typeof StatusChip>["status"];
		variant: React.ComponentProps<typeof StatusChip>["variant"];
		label: string;
		icon?: React.ReactNode;
	}
> = {
	active: {
		status: "success",
		variant: "subtle",
		label: "Active",
	},
	draft: {
		status: "info",
		variant: "subtle",
		label: "Draft",
	},
	in_review: {
		status: "info",
		variant: "subtle",
		label: "In review",
	},
	missing_info: {
		status: "error",
		variant: "subtle",
		label: "Missing info",
	},
	blocked: {
		status: "warning",
		variant: "subtle",
		label: "Blocked",
	},
	ready_for_offer: {
		status: "active",
		variant: "subtle",
		label: "Ready",
	},
	completed: {
		status: "completed",
		variant: "subtle",
		label: "Completed",
	},
};

/**
 * Mapeo de estados a alertas (AlertBadge refactorizado)
 *
 * Estados con alertas especiales necesitan iconos y mensajes
 */
const alertConfig: Record<
	StreamStatus,
	{
		status: React.ComponentProps<typeof StatusChip>["status"];
		label: string;
		icon: React.ReactNode;
		show: boolean;
	}
> = {
	active: {
		status: "success",
		label: "No issues",
		icon: <CheckCircle2 className="size-3.5" />,
		show: true,
	},
	draft: {
		status: "success",
		label: "Go Confirm",
		icon: <CheckCircle2 className="size-3.5" />,
		show: true,
	},
	in_review: {
		status: "info",
		label: "In review",
		icon: <Clock className="size-3.5" />,
		show: true,
	},
	missing_info: {
		status: "error",
		label: "Info required",
		icon: <AlertTriangle className="size-3.5" />,
		show: true,
	},
	blocked: {
		status: "warning",
		label: "Pending review",
		icon: <Clock className="size-3.5" />,
		show: true,
	},
	ready_for_offer: {
		status: "active",
		label: "Ready to offer",
		icon: <FileWarning className="size-3.5" />,
		show: true,
	},
	completed: {
		status: "completed",
		label: "Done",
		icon: <CheckCircle2 className="size-3.5" />,
		show: false, // No mostrar alerta para completed
	},
};

/**
 * StatusPill refactorizado usando StatusChip del Design System
 *
 * Antes: Colores hardcodeados (bg-emerald-50, text-emerald-700, etc.)
 * Después: Tokens semánticos (status="success", variant="subtle")
 */
function StatusPill({ status }: { status: StreamStatus }) {
	const config = statusToChipVariant[status];

	return (
		<StatusChip
			status={config.status}
			variant={config.variant}
			size="sm"
			shape="pill"
		>
			{config.label}
		</StatusChip>
	);
}

/**
 * AlertBadge refactorizado usando StatusChip
 *
 * Antes: Badges custom con colores hardcodeados
 * Después: StatusChip con iconos y variantes semánticas
 */
function AlertBadge({
	status,
	alertText,
}: {
	status: StreamStatus;
	alertText: string | undefined;
}) {
	const config = alertConfig[status];

	// No mostrar alerta para estados que no requieren atención
	if (!config.show) {
		return (
			<StatusChip status="success" variant="ghost" size="sm" shape="rounded">
				<CheckCircle2 className="size-3.5" />
				No issues
			</StatusChip>
		);
	}

	// Para missing_info, usar el texto custom si existe
	const label =
		status === "missing_info" && alertText ? alertText : config.label;

	return (
		<StatusChip
			status={config.status}
			variant="subtle"
			size="sm"
			shape="rounded"
			icon={config.icon}
		>
			{label}
		</StatusChip>
	);
}

export function StreamsAllTable({ rows, onOpenDraft }: StreamsAllTableProps) {
	const router = useRouter();
	const { isOrgAdmin } = useAuth();

	return (
		<Table>
			<TableHeader>
				{/* 
					No-Line Rule: Usamos border-b sutil solo en header
					En filas usamos hover:bg para separación visual
				*/}
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
								// No-Line Rule: Sin bordes entre filas
								// Usamos hover:bg para separación visual
								"group cursor-pointer transition-all duration-200 ease-out",
								"hover:bg-muted/30",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
								{/* gap en lugar de space-y */}
								<div className="flex flex-col gap-1.5">
									<span className="text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
										{row.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{row.client}
									</span>
									{/* Owner badge - only visible for org admins */}
									{isOrgAdmin && row.ownerName && (
										<div className="flex items-center gap-2 mt-1">
											<AutoTeamAvatar name={row.ownerName} size="sm" />
											<Badge
												variant="muted"
												className="text-[10px] font-normal"
											>
												{row.ownerName}
											</Badge>
										</div>
									)}
								</div>
							</TableCell>

							{/* Status */}
							<TableCell className="px-6 py-5">
								<StatusPill status={row.status} />
							</TableCell>

							{/* Volume */}
							<TableCell className="px-6 py-5">
								<div className="flex flex-col gap-0.5">
									<span className="text-sm tabular-nums font-medium text-foreground">
										{row.volume || "—"}
									</span>
									{row.frequency ? (
										<span className="text-xs text-muted-foreground">
											/{row.frequency}
										</span>
									) : null}
								</div>
							</TableCell>

							{/* Alerts */}
							<TableCell className="px-6 py-5">
								<AlertBadge status={row.status} alertText={alertText} />
							</TableCell>

							{/* Actions */}
							<TableCell className="px-6 py-5 text-right">
								<div className="flex items-center justify-end gap-2">
									{isDraft ? (
										<Button
											variant="ghost"
											size="sm"
											// Usamos tokens semánticos en lugar de colores hardcodeados
											className="h-8 gap-1 px-3 text-xs font-medium text-success hover:bg-success/10 hover:text-success"
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
												// size-* en lugar de w-* h-*
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
