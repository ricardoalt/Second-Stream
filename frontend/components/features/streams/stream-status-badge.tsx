import type { VariantProps } from "class-variance-authority";
import {
	AlertTriangle,
	CheckCircle2,
	Clock3,
	FileEdit,
	PauseCircle,
} from "lucide-react";
import type { ComponentType } from "react";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { StreamStatus } from "./types";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const statusConfig: Record<
	StreamStatus,
	{
		label: string;
		variant: BadgeVariant;
		icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	}
> = {
	draft: {
		label: "Draft",
		variant: "neutral-subtle",
		icon: FileEdit,
	},
	active: {
		label: "Active",
		variant: "primary-subtle",
		icon: CheckCircle2,
	},
	missing_info: {
		label: "Missing info",
		variant: "warning-subtle",
		icon: AlertTriangle,
	},
	in_review: {
		label: "In review",
		variant: "info-subtle",
		icon: Clock3,
	},
	ready_for_offer: {
		label: "Ready for offer",
		variant: "success-subtle",
		icon: CheckCircle2,
	},
	blocked: {
		label: "Blocked",
		variant: "destructive-subtle",
		icon: PauseCircle,
	},
	completed: {
		label: "Completed",
		variant: "success-subtle",
		icon: CheckCircle2,
	},
};

export function StreamStatusBadge({ status }: { status: StreamStatus }) {
	const config = statusConfig[status];
	const Icon = config.icon;

	return (
		<Badge variant={config.variant} className="rounded-full gap-1">
			<Icon aria-hidden className="size-3" />
			{config.label}
		</Badge>
	);
}
