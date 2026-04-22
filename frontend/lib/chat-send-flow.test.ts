import { describe, expect, it, mock } from "bun:test";
import {
	applyAssistantStreamEvent,
	runDraftAttachmentSendFlow,
	streamAndReloadPersistedTurn,
} from "@/lib/chat-send-flow";
import type { MyUIMessage } from "@/types/ui-message";

const attachmentFailureMessage =
	"Some attachments failed to upload. Remove failed files and try again.";

describe("runDraftAttachmentSendFlow", () => {
	it("blocks final send cleanly when one upload fails", async () => {
		const uploadAttachment = mock(async (file: File): Promise<string> => {
			if (file.name === "bad.txt") {
				throw new Error("Upload failed for bad.txt");
			}
			return "draft-ok-1";
		});
		const streamTurn = mock(
			async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
				onEvent({ event: "finish" });
			},
		);
		const reloadHistory = mock(async (): Promise<MyUIMessage[]> => []);

		const updates: Array<{ index: number; status: string }> = [];

		const result = await runDraftAttachmentSendFlow({
			threadId: "thread-1",
			contentText: "Send with files",
			files: [
				{
					url: "data:text/plain;base64,b2s=",
					filename: "ok.txt",
				},
				{
					url: "data:text/plain;base64,YmFk",
					filename: "bad.txt",
				},
			],
			onUploadStateChange: (index, state) => {
				updates.push({ index, status: state.status });
			},
			uploadAttachment,
			streamTurn,
			reloadHistory,
		});

		expect(result.status).toBe("blocked");
		if (result.status === "blocked") {
			expect(result.error.message).toBe(attachmentFailureMessage);
		}
		expect(streamTurn).not.toHaveBeenCalled();
		expect(reloadHistory).not.toHaveBeenCalled();
		expect(updates).toEqual(
			expect.arrayContaining([
				{ index: 0, status: "uploading" },
				{ index: 0, status: "uploaded" },
				{ index: 1, status: "uploading" },
				{ index: 1, status: "error" },
			]),
		);
	});

	it("rehydrates persisted history after successful send", async () => {
		const uploadAttachment = mock(async () => "draft-1");
		const streamTurn = mock(
			async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
				onEvent({ event: "finish" });
			},
		);
		const persistedMessages: MyUIMessage[] = [
			{
				id: "msg-user-1",
				role: "user",
				content: "Hello",
				parts: [
					{ type: "text", text: "Hello" },
					{
						type: "file",
						filename: "ok.txt",
						mediaType: "text/plain",
						url: "attachment://draft-1",
					},
				],
				createdAt: "2026-04-22T00:00:00.000Z",
			},
		];
		const reloadHistory = mock(async () => persistedMessages);

		const result = await runDraftAttachmentSendFlow({
			threadId: "thread-1",
			contentText: "Hello",
			files: [
				{
					url: "data:text/plain;base64,aGVsbG8=",
					filename: "ok.txt",
				},
			],
			uploadAttachment,
			streamTurn,
			reloadHistory,
		});

		expect(result).toEqual({
			status: "sent",
			attachmentIds: ["draft-1"],
			persistedMessages,
		});
		expect(streamTurn).toHaveBeenCalledTimes(1);
		expect(streamTurn).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: "thread-1",
				contentText: "Hello",
				existingAttachmentIds: ["draft-1"],
			}),
		);
		expect(reloadHistory).toHaveBeenCalledWith("thread-1");
	});

	it("fails send flow when official protocol emits error event", async () => {
		const streamTurn = mock(async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
			onEvent({ event: "start", runId: "run-1" });
			onEvent({ event: "error", code: "CHAT_STREAM_FAILED" });
			onEvent({ event: "done" });
		});
		const reloadHistory = mock(async (): Promise<MyUIMessage[]> => [
			{
				id: "msg-1",
				role: "assistant",
				parts: [{ type: "text", text: "should not reload" }],
			},
		]);

		await expect(
			streamAndReloadPersistedTurn({
				threadId: "thread-1",
				contentText: "Hello",
				attachmentIds: [],
				streamTurn: streamTurn as unknown as (options: {
					threadId: string;
					contentText: string;
					existingAttachmentIds?: string[];
					onEvent: (event: unknown) => void;
				}) => Promise<void>,
				reloadHistory,
			}),
		).rejects.toThrow("Stream failed (CHAT_STREAM_FAILED)");

		expect(reloadHistory).not.toHaveBeenCalled();
	});

	it("does not treat transport [DONE] as semantic completion without finish", async () => {
		const streamTurn = mock(async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
			onEvent({ event: "text-delta", delta: "partial" });
			onEvent({ event: "done" });
		});
		const reloadHistory = mock(async (): Promise<MyUIMessage[]> => []);

		await expect(
			streamAndReloadPersistedTurn({
				threadId: "thread-1",
				contentText: "Hello",
				attachmentIds: [],
				streamTurn: streamTurn as unknown as (options: {
					threadId: string;
					contentText: string;
					existingAttachmentIds?: string[];
					onEvent: (event: unknown) => void;
				}) => Promise<void>,
				reloadHistory,
			}),
		).rejects.toThrow("Stream ended before finish event");

		expect(reloadHistory).not.toHaveBeenCalled();
	});

	it("keeps finish as semantic completion even when done arrives after", async () => {
		const persistedMessages: MyUIMessage[] = [
			{
				id: "assistant-1",
				role: "assistant",
				parts: [{ type: "text", text: "final" }],
			},
		];
		const streamTurn = mock(async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
			onEvent({ event: "text-delta", delta: "final" });
			onEvent({ event: "finish" });
			onEvent({ event: "done" });
		});
		const reloadHistory = mock(async () => persistedMessages);

		await expect(
			streamAndReloadPersistedTurn({
				threadId: "thread-1",
				contentText: "Hello",
				attachmentIds: [],
				streamTurn: streamTurn as unknown as (options: {
					threadId: string;
					contentText: string;
					existingAttachmentIds?: string[];
					onEvent: (event: unknown) => void;
				}) => Promise<void>,
				reloadHistory,
			}),
		).resolves.toEqual(persistedMessages);

		expect(reloadHistory).toHaveBeenCalledWith("thread-1");
	});

	it("builds assistant text incrementally from text-delta events", () => {
		const assistantId = "assistant-draft-1";

		const afterFirstDelta = applyAssistantStreamEvent([], assistantId, {
			event: "text-delta",
			delta: "Hello",
		});
		expect(afterFirstDelta).toEqual([
			{
				id: assistantId,
				role: "assistant",
				parts: [{ type: "text", text: "Hello" }],
			},
		]);

		const afterSecondDelta = applyAssistantStreamEvent(afterFirstDelta, assistantId, {
			event: "text-delta",
			delta: " world",
		});
		expect(afterSecondDelta[0]?.parts).toEqual([
			{ type: "text", text: "Hello world" },
		]);
	});
});
