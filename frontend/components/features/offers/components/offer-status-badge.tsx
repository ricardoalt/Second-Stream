import type { VariantProps } from "class-variance-authority";
import {
	CheckCircle2,
	Clock3,
	FileEdit,
	Hourglass,
	Send,
	XCircle,
} from "lucide-react";
import type { ComponentType } from "react";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { OFFER_STAGE_LABELS } from "../mock-data";
import type { OfferStage } from "../types";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const statusConfig: Record<
	OfferStage,
	{
		icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
		variant: BadgeVariant;
	}
> = {
	requires_data: {
		icon: FileEdit,
		variant: "neutral-subtle",
	},
	proposal_ready: {
		icon: Hourglass,
		variant: "info-subtle",
	},
	offer_sent: {
		icon: Send,
		variant: "primary-subtle",
	},
	in_negotiation: {
		icon: Clock3,
		variant: "warning-subtle",
	},
	accepted: {
		icon: CheckCircle2,
		variant: "success-subtle",
	},
	declined: {
		icon: XCircle,
		variant: "destructive-subtle",
	},
	expired: {
		icon: Clock3,
		variant: "neutral-subtle",
	},
};

export function OfferStatusBadge({ stage }: { stage: OfferStage }) {
	const config = statusConfig[stage];
	const Icon = config.icon;

	return (
		<Badge variant={config.variant} className="rounded-full gap-1">
			<Icon aria-hidden className="size-3" />
			{OFFER_STAGE_LABELS[stage]}
		</Badge>
	);
}
