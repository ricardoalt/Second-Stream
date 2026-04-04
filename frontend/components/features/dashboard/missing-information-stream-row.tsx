import { AlertCircle, CheckCircle2, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MissingInformationStream } from "./field-agent-dashboard.types";

function getStatusIcon(priority: MissingInformationStream["priority"]) {
	if (priority === "critical") return <AlertCircle className="size-5" />;
	if (priority === "high") return <Clock className="size-5" />;
	return <CheckCircle2 className="size-5" />;
}

export function MissingInformationStreamRow({
	stream,
	expanded,
	onToggle,
}: {
	stream: MissingInformationStream;
	expanded: boolean;
	onToggle: () => void;
}) {
	return (
		<div className="rounded-[1.25rem] border border-border/40 bg-surface-container-lowest/80 shadow-sm overflow-hidden mb-2">
			<button
				type="button"
				onClick={onToggle}
				className={cn(
					"grid w-full gap-3 px-6 py-4 text-left transition-colors items-center",
					"md:grid-cols-[2fr_1.5fr_1.5fr_auto]",
					"hover:bg-surface-container-low/40",
				)}
			>
				<div className="flex items-center gap-4">
					<div
						className={cn(
							"size-10 rounded-full flex items-center justify-center shrink-0",
							stream.priority === "critical"
								? "bg-destructive/10 text-destructive"
								: stream.priority === "high"
									? "bg-warning/10 text-warning-foreground"
									: "bg-primary/10 text-primary",
						)}
					>
						{getStatusIcon(stream.priority)}
					</div>
					<div>
						<p className="text-base font-medium text-foreground leading-tight">
							{stream.streamName}
						</p>
						<p className="text-sm text-muted-foreground mt-0.5">
							{stream.clientName}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<div className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
						{stream.siteName}
					</div>
					{stream.missingItems.slice(0, 2).map((item) => (
						<div
							key={item}
							className="rounded border border-border bg-surface-container-low px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]"
						>
							{item}
						</div>
					))}
					{stream.missingItems.length > 2 && (
						<div className="rounded border border-border bg-surface-container-low px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
							+{stream.missingItems.length - 2}
						</div>
					)}
				</div>

				<div className="flex flex-col items-center">
					<div className="flex w-full justify-between items-end mb-1.5 px-1">
						<span
							className={cn(
								"text-[10px] font-bold uppercase tracking-wider",
								stream.priority === "critical"
									? "text-destructive"
									: stream.priority === "high"
										? "text-warning-foreground"
										: "text-muted-foreground",
							)}
						>
							{stream.statusLabel}
						</span>
					</div>
				</div>

				<div className="flex items-center justify-end gap-6">
					<div className="text-right">
						<p
							className={cn(
								"text-sm font-semibold",
								stream.priority === "critical"
									? "text-destructive"
									: "text-foreground",
							)}
						>
							{stream.lastTouched}
						</p>
						<p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
							{stream.priority} priority
						</p>
					</div>
					<Button
						size="icon"
						variant="outline"
						className="size-8 rounded-lg bg-primary text-primary-foreground border-none hover:bg-primary/90"
					>
						<Mail className="size-4" />
					</Button>
				</div>
			</button>

			{expanded ? (
				<div className="border-t border-border/30 bg-surface-container-low/50 px-6 py-4 md:pl-20">
					<p className="text-xs font-medium uppercase tracking-[0.08em] text-secondary">
						Missing information
					</p>
					<ul className="mt-2 space-y-1">
						{stream.missingItems.map((item) => (
							<li
								key={item}
								className="text-sm text-muted-foreground flex items-center gap-2"
							>
								<div className="size-1 rounded-full bg-muted-foreground/50" />
								{item}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
