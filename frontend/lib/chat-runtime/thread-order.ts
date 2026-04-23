import type { ChatThreadSummaryDTO } from "@/lib/api/chat";

function resolveThreadSortTimestamp(thread: ChatThreadSummaryDTO): number {
	const sortDate = thread.lastMessageAt ?? thread.updatedAt ?? thread.createdAt;
	const timestamp = Date.parse(sortDate);
	return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function sortThreadsByRecency(
	threads: ChatThreadSummaryDTO[],
): ChatThreadSummaryDTO[] {
	return [...threads].sort((a, b) => {
		const timestampDiff =
			resolveThreadSortTimestamp(b) - resolveThreadSortTimestamp(a);
		if (timestampDiff !== 0) {
			return timestampDiff;
		}

		return b.id.localeCompare(a.id);
	});
}
