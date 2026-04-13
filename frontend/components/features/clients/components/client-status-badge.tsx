import { Badge } from "@/components/ui/badge";

export type ClientStatus = "active" | "lead" | "inactive";

const statusLabel: Record<ClientStatus, string> = {
	active: "Active",
	lead: "Lead",
	inactive: "Inactive",
};

const statusVariant: Record<ClientStatus, "success" | "warning" | "muted"> = {
	active: "success",
	lead: "warning",
	inactive: "muted",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
	return (
		<Badge
			variant={statusVariant[status]}
			className="rounded-full border-0 text-[0.68rem]"
		>
			{statusLabel[status]}
		</Badge>
	);
}
