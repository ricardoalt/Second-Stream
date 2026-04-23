import { describe, expect, it } from "bun:test";

import type { ChatThreadSummaryDTO } from "@/lib/api/chat";
import {
	mergeHydratedHistoryWithLocalMessages,
	shouldHydrateHistory,
	upsertThreadSummary,
} from "@/lib/chat-runtime/thread-screen-state";

describe("thread-screen-state", () => {
	it("upserts new thread to the top without duplicates", () => {
		const previous: ChatThreadSummaryDTO[] = [
			{
				id: "a",
				title: "A",
				lastMessagePreview: null,
				lastMessageAt: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
			{
				id: "b",
				title: "B",
				lastMessagePreview: null,
				lastMessageAt: null,
				createdAt: "2026-01-02T00:00:00.000Z",
				updatedAt: "2026-01-02T00:00:00.000Z",
			},
		];

		const next = upsertThreadSummary(previous, {
			id: "b",
			title: "Renamed",
			lastMessagePreview: null,
			lastMessageAt: null,
			createdAt: "2026-01-02T00:00:00.000Z",
			updatedAt: "2026-01-03T00:00:00.000Z",
		});

		expect(next).toHaveLength(2);
		expect(next[0]?.id).toBe("b");
		expect(next[0]?.title).toBe("Renamed");
		expect(next[1]?.id).toBe("a");
	});

	it("hydrates only when history load is enabled and screen is idle", () => {
		expect(
			shouldHydrateHistory({
				loadHistory: true,
				status: "ready",
				currentMessageCount: 0,
				hasHydratedThread: false,
				isHydratingHistory: false,
			}),
		).toBe(true);

		expect(
			shouldHydrateHistory({
				loadHistory: false,
				status: "ready",
				currentMessageCount: 0,
				hasHydratedThread: false,
				isHydratingHistory: false,
			}),
		).toBe(false);

		expect(
			shouldHydrateHistory({
				loadHistory: true,
				status: "streaming",
				currentMessageCount: 0,
				hasHydratedThread: false,
				isHydratingHistory: false,
			}),
		).toBe(false);

		expect(
			shouldHydrateHistory({
				loadHistory: true,
				status: "ready",
				currentMessageCount: 1,
				hasHydratedThread: false,
				isHydratingHistory: false,
			}),
		).toBe(false);

		expect(
			shouldHydrateHistory({
				loadHistory: true,
				status: "ready",
				currentMessageCount: 0,
				hasHydratedThread: false,
				isHydratingHistory: true,
			}),
		).toBe(false);
	});

	it("merges hydrated history with local messages without dropping either side", () => {
		const hydrated = [
			{ id: "m1", role: "user", content: "old 1", parts: [] },
			{ id: "m2", role: "assistant", content: "old 2", parts: [] },
		] as const;

		const local = [
			{ id: "m2", role: "assistant", content: "old 2 (local)", parts: [] },
			{ id: "m3", role: "user", content: "new local", parts: [] },
		] as const;

		const merged = mergeHydratedHistoryWithLocalMessages({
			hydratedMessages: [...hydrated],
			localMessages: [...local],
		});

		expect(merged.map((message) => message.id)).toEqual(["m1", "m2", "m3"]);
		expect(merged[1]?.content).toBe("old 2 (local)");
		expect(merged[2]?.content).toBe("new local");
	});
});
