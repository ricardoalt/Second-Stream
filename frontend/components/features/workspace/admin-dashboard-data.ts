import type { OfferPipelineResponseDTO } from "@/lib/api/offers";
import type { User } from "@/lib/types/user";
import type {
	DashboardListResponse,
	DashboardRow,
	PersistedStreamRow,
	QueuePriority,
} from "@/lib/types/dashboard";

export type AdminKpiCard = {
	id:
		| "total_streams"
		| "needs_confirmation"
		| "missing_information"
		| "active_negotiation";
	label: string;
	value: number;
	note: string;
};

export type TeamOwnerGroup = {
	ownerUserId: string;
	ownerLabel: string;
	streams: PersistedStreamRow[];
};

function formatUserDisplayName(user: User): string {
	const fullName = `${user.firstName} ${user.lastName}`.trim();
	return fullName || user.email;
}

function sortOwnerGroups(groups: TeamOwnerGroup[]): TeamOwnerGroup[] {
	return [...groups].sort((left, right) => {
		if (right.streams.length !== left.streams.length) {
			return right.streams.length - left.streams.length;
		}
		return left.ownerLabel.localeCompare(right.ownerLabel);
	});
}

const QUEUE_PRIORITY_WEIGHT: Record<QueuePriority, number> = {
	critical: 0,
	high: 1,
	normal: 2,
};

function isPersistedStreamRow(row: DashboardRow): row is PersistedStreamRow {
	return row.kind === "persisted_stream";
}

export function buildKpiCards(
	dashboard: DashboardListResponse,
	offersPipeline: OfferPipelineResponseDTO,
): AdminKpiCard[] {
	return [
		{
			id: "total_streams",
			label: "Total streams",
			value: dashboard.counts.total,
			note: "All active streams",
		},
		{
			id: "needs_confirmation",
			label: "Needs confirmation",
			value: dashboard.counts.needsConfirmation,
			note: "Discovery drafts",
		},
		{
			id: "missing_information",
			label: "Missing information",
			value: dashboard.counts.missingInformation,
			note: "Data completion required",
		},
		{
			id: "active_negotiation",
			label: "Active negotiation",
			value: offersPipeline.counts.underNegotiation,
			note: "Offers under negotiation",
		},
	];
}

export function groupStreamsByOwner(rows: DashboardRow[]): TeamOwnerGroup[] {
	const groups = new Map<string, TeamOwnerGroup>();

	for (const row of rows) {
		if (!isPersistedStreamRow(row)) {
			continue;
		}
		if (!row.ownerUserId) {
			continue;
		}
		const existing = groups.get(row.ownerUserId);
		if (existing) {
			existing.streams.push(row);
			continue;
		}
		groups.set(row.ownerUserId, {
			ownerUserId: row.ownerUserId,
			ownerLabel: row.ownerDisplayName || "Team member",
			streams: [row],
		});
	}

	return sortOwnerGroups([...groups.values()]);
}

export function buildTeamOwnerGroups(
	rows: DashboardRow[],
	users: User[],
): TeamOwnerGroup[] {
	const groups = new Map(
		groupStreamsByOwner(rows).map((group) => [group.ownerUserId, group] as const),
	);

	for (const user of users) {
		if (user.role !== "field_agent" || !user.isActive) {
			continue;
		}

		const existing = groups.get(user.id);
		if (existing) {
			existing.ownerLabel = formatUserDisplayName(user);
			continue;
		}

		groups.set(user.id, {
			ownerUserId: user.id,
			ownerLabel: formatUserDisplayName(user),
			streams: [],
		});
	}

	return sortOwnerGroups([...groups.values()]);
}

export function buildSupervisionQueue(
	rows: PersistedStreamRow[],
	limit = 6,
): PersistedStreamRow[] {
	return [...rows]
		.sort((left, right) => {
			const priorityDiff =
				QUEUE_PRIORITY_WEIGHT[left.queuePriority] -
				QUEUE_PRIORITY_WEIGHT[right.queuePriority];
			if (priorityDiff !== 0) {
				return priorityDiff;
			}
			return Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt);
		})
		.slice(0, limit);
}
