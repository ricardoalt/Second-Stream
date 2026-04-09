import {
	AlertTriangle,
	CheckCircle2,
	Clock3,
	FileEdit,
	PauseCircle,
} from "lucide-react";
import type { ComponentType } from "react";
import {
	StatusChip,
	type StatusChipProps,
} from "@/components/patterns/feedback/status-chip";
import type { StreamStatus } from "./types";

type ChipStatus = NonNullable<StatusChipProps["status"]>;

const statusConfig: Record<
	StreamStatus,
	{
		label: string;
		status: ChipStatus;
		icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	}
> = {
	draft: {
		label: "Draft",
		status: "pending",
		icon: FileEdit,
	},
	active: {
		label: "Active",
		status: "active",
		icon: CheckCircle2,
	},
	missing_info: {
		label: "Missing info",
		status: "warning",
		icon: AlertTriangle,
	},
	in_review: {
		label: "In review",
		status: "info",
		icon: Clock3,
	},
	ready_for_offer: {
		label: "Ready for offer",
		status: "success",
		icon: CheckCircle2,
	},
	blocked: {
		label: "Blocked",
		status: "error",
		icon: PauseCircle,
	},
	completed: {
		label: "Completed",
		status: "completed",
		icon: CheckCircle2,
	},
};

export function StreamStatusBadge({ status }: { status: StreamStatus }) {
	const config = statusConfig[status];
	const Icon = config.icon;

	return (
		<StatusChip status={config.status} variant="subtle" size="sm" shape="pill">
			<Icon aria-hidden className="size-3" />
			{config.label}
		</StatusChip>
	);
}
