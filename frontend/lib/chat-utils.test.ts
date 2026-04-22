import { describe, expect, it } from "bun:test";
import {
	nextMessagesAfterHistoryReloadFailure,
	rollbackMessagesAfterSendFailure,
	nextClearedUploadStates,
	shouldReloadThreadHistory,
	shouldShowLoadingShimmer,
} from "@/lib/chat-utils";
import type { MyUIMessage } from "@/types/ui-message";

describe("shouldShowLoadingShimmer", () => {
	it("keeps thinking placeholder visible while awaiting first chunk", () => {
		expect(
			shouldShowLoadingShimmer("streaming", [], { awaitingFirstChunk: true }),
		).toBe(true);
	});

	it("hides thinking placeholder after first incremental assistant text", () => {
		const messages: MyUIMessage[] = [
			{
				id: "assistant-draft-1",
				role: "assistant",
				parts: [{ type: "text", text: "Hello" }],
			},
		];

		expect(
			shouldShowLoadingShimmer("streaming", messages, {
				awaitingFirstChunk: false,
			}),
		).toBe(false);
	});
});

describe("nextClearedUploadStates", () => {
	it("keeps reference stable when state is already empty", () => {
		const current: [] = [];
		expect(nextClearedUploadStates(current)).toBe(current);
	});

	it("returns empty state when upload statuses are present", () => {
		expect(
			nextClearedUploadStates([
				{ status: "uploading" },
				{ status: "uploaded", attachmentId: "att-1" },
			]),
		).toEqual([]);
	});
});

describe("shouldReloadThreadHistory", () => {
	it("avoids repeated reload for normal rerenders on same thread", () => {
		expect(
			shouldReloadThreadHistory({
				threadId: "thread-1",
				lastLoadedThreadId: "thread-1",
				isSendInFlight: false,
			}),
		).toBe(false);
	});

	it("skips history reload while new-thread send is in-flight", () => {
		expect(
			shouldReloadThreadHistory({
				threadId: "thread-42",
				lastLoadedThreadId: null,
				isSendInFlight: true,
			}),
		).toBe(false);
	});

	it("loads history when switching to an unloaded persisted thread", () => {
		expect(
			shouldReloadThreadHistory({
				threadId: "thread-2",
				lastLoadedThreadId: "thread-1",
				isSendInFlight: false,
			}),
		).toBe(true);
	});
});

describe("nextMessagesAfterHistoryReloadFailure", () => {
	it("clears stale messages when reloading a different thread fails", () => {
		const previousMessages: MyUIMessage[] = [
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", text: "Persisted answer" }],
			},
		];

		const result = nextMessagesAfterHistoryReloadFailure(previousMessages);
		expect(result).toEqual([]);
	});

	it("keeps empty state unchanged when there is nothing to preserve", () => {
		const previousMessages: MyUIMessage[] = [];
		expect(nextMessagesAfterHistoryReloadFailure(previousMessages)).toBe(
			previousMessages,
		);
	});
});

describe("rollbackMessagesAfterSendFailure", () => {
	it("removes optimistic new-thread messages when send fails", () => {
		const baselineBeforeOptimisticAppend: MyUIMessage[] = [];
		const currentMessages: MyUIMessage[] = [
			{
				id: "optimistic-user",
				role: "user",
				parts: [{ type: "text", text: "Hello" }],
			},
		];

		const result = rollbackMessagesAfterSendFailure({
			threadId: "new",
			baselineBeforeOptimisticAppend,
			currentMessages,
		});

		expect(result).toBe(baselineBeforeOptimisticAppend);
		expect(result).toEqual([]);
	});

	it("keeps current messages for existing threads on send failure", () => {
		const baselineBeforeOptimisticAppend: MyUIMessage[] = [
			{
				id: "persisted-user",
				role: "user",
				parts: [{ type: "text", text: "Persisted" }],
			},
		];
		const currentMessages: MyUIMessage[] = [
			...baselineBeforeOptimisticAppend,
			{
				id: "optimistic-user",
				role: "user",
				parts: [{ type: "text", text: "Draft" }],
			},
		];

		const result = rollbackMessagesAfterSendFailure({
			threadId: "thread-1",
			baselineBeforeOptimisticAppend,
			currentMessages,
		});

		expect(result).toBe(currentMessages);
		expect(result).toHaveLength(2);
	});
});
