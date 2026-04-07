import { ChevronDown } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Design System: Industrial Precision & Fluidity
// Data Table - Fluid grid without divider lines

type ColumnDef<T> = {
	key: string;
	header: string;
	width?: string;
	cell: (item: T) => React.ReactNode;
};

interface DataTableProps<T> {
	data: T[];
	columns: ColumnDef<T>[];
	keyExtractor: (item: T) => string;
	expandedContent?: (item: T) => React.ReactNode;
	expandChevronPosition?: "start" | "end";
	emptyMessage?: string;
	className?: string;
	pagination?: {
		total: number;
		pageSize: number;
		onPrevious?: () => void;
		onNext?: () => void;
		disabled?: { previous?: boolean; next?: boolean };
	};
}

/**
 * Data Table - Industrial Precision Design System
 *
 * "Fluid Grid" without divider lines:
 * - Alternating row colors (surface / surface_container_low)
 * - Headers with uppercase + tracking for "industrial manifest" look
 * - Expandable rows with chevron animation
 * - Ghost borders at 20% opacity per accessibility rule
 *
 * @example
 * <DataTable
 *   data={teamGroups}
 *   columns={[
 *     { key: "agent", header: "Agent Name", width: "2fr", cell: (g) => ... },
 *     { key: "streams", header: "Total Streams", width: "1fr", cell: (g) => ... },
 *   ]}
 *   keyExtractor={(g) => g.ownerUserId}
 *   expandedContent={(g) => <StreamList streams={g.streams} />}
 * />
 */
export function DataTable<T>({
	data,
	columns,
	keyExtractor,
	expandedContent,
	expandChevronPosition = "end",
	emptyMessage = "No data available.",
	className,
	pagination,
}: DataTableProps<T>) {
	return (
		<Card
			className={cn(
				"overflow-hidden border border-border/60 bg-surface-container-lowest shadow-sm",
				className,
			)}
		>
			{/* Header Row */}
			<div
				className="grid gap-4 bg-muted px-6 py-3"
				style={{
					gridTemplateColumns: columns
						.map((col) => col.width || "1fr")
						.join(" "),
				}}
			>
				{columns.map((col) => (
					<span
						key={col.key}
						className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
					>
						{col.header}
					</span>
				))}
				{/* Spacer for expand column */}
				{expandedContent && expandChevronPosition === "end" && <span />}
			</div>

			{/* Body */}
			{data.length === 0 ? (
				<div className="px-6 py-8 text-sm text-muted-foreground">
					{emptyMessage}
				</div>
			) : (
				<div className="divide-y divide-border">
					{data.map((item, index) => {
						const key = keyExtractor(item);
						const hasExpanded = !!expandedContent;

						if (hasExpanded) {
							return (
								<details key={key} className="group">
									<summary
									className="grid cursor-pointer items-center gap-4 px-6 py-4 marker:content-none hover:bg-muted/50"
									style={{
										gridTemplateColumns: columns
											.map((col) => col.width || "1fr")
											.concat(
												expandChevronPosition === "end" ? "40px" : [],
											)
											.join(" "),
									}}
								>
										{columns.map((col, colIndex) => (
											<div key={col.key}>
												{expandChevronPosition === "start" && colIndex === 0 ? (
													<div className="flex items-center gap-3">
														<div className="text-muted-foreground transition-transform group-open:rotate-180">
															<ChevronDown className="h-4 w-4" />
														</div>
														<div className="min-w-0 flex-1">{col.cell(item)}</div>
													</div>
												) : (
													col.cell(item)
												)}
											</div>
										))}
										{expandChevronPosition === "end" ? (
											<div className="flex justify-end text-muted-foreground transition-transform group-open:rotate-180">
												<ChevronDown className="h-4 w-4" />
											</div>
										) : null}
									</summary>
									<div className="bg-muted px-6 py-4">
										{expandedContent(item)}
									</div>
								</details>
							);
						}

						return (
							<div
								key={key}
								className={cn(
									"grid items-center gap-4 px-6 py-4",
									index % 2 === 0
										? "bg-surface-container-lowest"
										: "bg-surface-container-low/50",
								)}
								style={{
									gridTemplateColumns: columns
										.map((col) => col.width || "1fr")
										.join(" "),
								}}
							>
								{columns.map((col) => (
									<div key={col.key}>{col.cell(item)}</div>
								))}
							</div>
						);
					})}
				</div>
			)}

			{/* Pagination */}
			{pagination && (
				<div className="flex items-center justify-between border-t border-border px-6 py-4">
					<p className="text-sm text-muted-foreground">
						Showing 1-{Math.min(pagination.pageSize, data.length)} of{" "}
						{pagination.total} active agents
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="h-8 gap-1 border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
							onClick={pagination.onPrevious}
							disabled={pagination.disabled?.previous}
						>
							<ChevronDown className="h-3.5 w-3.5 rotate-90" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-8 gap-1 border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
							onClick={pagination.onNext}
							disabled={pagination.disabled?.next}
						>
							Next
							<ChevronDown className="h-3.5 w-3.5 -rotate-90" />
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}

// Simple row component for custom tables
interface TableRowProps {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}

export const TableRow = memo(function TableRow({
	children,
	className,
	onClick,
}: TableRowProps) {
	return (
		<button
			type="button"
			className={cn(
				"grid w-full items-center gap-4 px-6 py-4 text-left hover:bg-muted/50",
				className,
			)}
			onClick={onClick}
		>
			{children}
		</button>
	);
});

// Divider for expanded content
interface SectionDividerProps {
	label: string;
	className?: string;
}

export const SectionDivider = memo(function SectionDivider({
	label,
	className,
}: SectionDividerProps) {
	return (
		<div className={cn("mb-3 flex items-center gap-3", className)}>
			<span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
				{label}
			</span>
			<div className="h-px flex-1 bg-muted" />
		</div>
	);
});
