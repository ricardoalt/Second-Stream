import {
	AlertTriangle,
	CheckCircle2,
	Clock3,
	FileEdit,
	PauseCircle,
} from "lucide-react";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StreamStatus } from "./types";

const statusConfig: Record<
	StreamStatus,
	{
		label: string;
		className: string;
		icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	}
> = {
	draft: {
		label: "Draft",
		className: "bg-muted text-muted-foreground border-transparent",
		icon: FileEdit,
	},
	active: {
		label: "Active",
		className: "bg-primary/15 text-primary border-transparent",
		icon: CheckCircle2,
	},
	missing_info: {
		label: "Missing info",
		className: "bg-warning/20 text-warning-foreground border-transparent",
		icon: AlertTriangle,
	},
	in_review: {
		label: "In review",
		className: "bg-info/20 text-info-foreground border-transparent",
		icon: Clock3,
	},
	ready_for_offer: {
		label: "Ready for offer",
		className: "bg-success/20 text-success-foreground border-transparent",
		icon: CheckCircle2,
	},
	blocked: {
		label: "Blocked",
		className: "bg-destructive/15 text-destructive border-transparent",
		icon: PauseCircle,
	},
	completed: {
		label: "Completed",
		className: "bg-success/20 text-success-foreground border-transparent",
		icon: CheckCircle2,
	},
};

export function StreamStatusBadge({ status }: { status: StreamStatus }) {
	const config = statusConfig[status];
	const Icon = config.icon;

	return (
		<Badge
			variant="secondary"
			className={cn("rounded-full border-0", config.className)}
		>
			<Icon aria-hidden className="size-3" />
			{config.label}
		</Badge>
	);
}
