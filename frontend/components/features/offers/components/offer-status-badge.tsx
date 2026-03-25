import {
	CheckCircle2,
	Clock3,
	FileEdit,
	Hourglass,
	XCircle,
} from "lucide-react";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OFFER_STAGE_LABELS } from "../mock-data";
import type { OfferStage } from "../types";

const statusConfig: Record<
	OfferStage,
	{
		icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
		className: string;
	}
> = {
	draft: {
		icon: FileEdit,
		className: "bg-muted text-muted-foreground border-transparent",
	},
	submitted: {
		icon: Hourglass,
		className: "bg-info/20 text-info-foreground border-transparent",
	},
	under_review: {
		icon: Clock3,
		className: "bg-warning/20 text-warning-foreground border-transparent",
	},
	accepted: {
		icon: CheckCircle2,
		className: "bg-success/20 text-success-foreground border-transparent",
	},
	rejected: {
		icon: XCircle,
		className: "bg-destructive/15 text-destructive border-transparent",
	},
	expired: {
		icon: Clock3,
		className: "bg-muted text-muted-foreground border-transparent",
	},
};

export function OfferStatusBadge({ stage }: { stage: OfferStage }) {
	const config = statusConfig[stage];
	const Icon = config.icon;

	return (
		<Badge
			className={cn("rounded-full border-0", config.className)}
			variant="secondary"
		>
			<Icon aria-hidden className="size-3" />
			{OFFER_STAGE_LABELS[stage]}
		</Badge>
	);
}
