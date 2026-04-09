import {
	CheckCircle2,
	Clock3,
	FileEdit,
	Hourglass,
	Send,
	XCircle,
} from "lucide-react";
import type { ComponentType } from "react";
import {
	StatusChip,
	type StatusChipProps,
} from "@/components/patterns/feedback/status-chip";
import { OFFER_STAGE_LABELS } from "../mock-data";
import type { OfferStage } from "../types";

type ChipStatus = NonNullable<StatusChipProps["status"]>;

const statusConfig: Record<
	OfferStage,
	{
		icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
		status: ChipStatus;
	}
> = {
	requires_data: {
		icon: FileEdit,
		status: "pending",
	},
	proposal_ready: {
		icon: Hourglass,
		status: "info",
	},
	offer_sent: {
		icon: Send,
		status: "active",
	},
	in_negotiation: {
		icon: Clock3,
		status: "warning",
	},
	accepted: {
		icon: CheckCircle2,
		status: "success",
	},
	declined: {
		icon: XCircle,
		status: "error",
	},
	expired: {
		icon: Clock3,
		status: "archived",
	},
};

export function OfferStatusBadge({ stage }: { stage: OfferStage }) {
	const config = statusConfig[stage];
	const Icon = config.icon;

	return (
		<StatusChip status={config.status} variant="subtle" size="sm" shape="pill">
			<Icon aria-hidden className="size-3" />
			{OFFER_STAGE_LABELS[stage]}
		</StatusChip>
	);
}
