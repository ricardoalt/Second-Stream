import { Badge } from "@/components/ui/badge";

export type ClientStatus = "active" | "prospect" | "inactive";

const statusLabel: Record<ClientStatus, string> = {
	active: "Active",
	prospect: "Prospect",
	inactive: "Inactive",
};

const statusVariant: Record<ClientStatus, "success" | "warning" | "muted"> = {
	active: "success",
	prospect: "warning",
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
