import { describe, expect, it, mock } from "bun:test";
import { runDraftAttachmentSendFlow } from "@/lib/chat-send-flow";
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
		const streamTurn = mock(async () => {});
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
		const streamTurn = mock(async () => {});
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
});
