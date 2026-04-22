import { describe, expect, it, mock } from "bun:test";
import { ATTACHMENT_UPLOAD_FAILURE_MESSAGE } from "@/lib/chat-send-flow";
import { canSubmitPromptMessage } from "@/lib/chat-utils";
import type { MyUIMessage } from "@/types/ui-message";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

async function loadAttachmentFlow() {
	const module = await import("./chat-interface");
	return {
		deriveChatShellState: module.deriveChatShellState,
		runDraftAttachmentSendFlow: module.runDraftAttachmentSendFlow,
		resolveAttachmentUploadResult: module.resolveAttachmentUploadResult,
	};
}

describe("canSubmitPromptMessage", () => {
	it("bloquea envío cuando no hay texto ni adjuntos", () => {
		expect(
			canSubmitPromptMessage({
				text: "   ",
				files: [],
			}),
		).toBe(false);
	});

	it("permite envío cuando hay texto", () => {
		expect(
			canSubmitPromptMessage({
				text: "Hola",
				files: [],
			}),
		).toBe(true);
	});

	it("permite envío cuando solo hay adjuntos", () => {
		expect(
			canSubmitPromptMessage({
				text: "",
				files: [
					{
						type: "file",
						mediaType: "text/plain",
						url: "data:text/plain;base64,QQ==",
						filename: "notes.txt",
					},
				],
			}),
		).toBe(true);
	});
});

describe("chat-interface attachment send flow", () => {
	it("throws on failed attachment upload so submit cannot resolve as success", async () => {
		const { resolveAttachmentUploadResult } = await loadAttachmentFlow();

		expect(() =>
			resolveAttachmentUploadResult({
				status: "error",
				error: new Error(ATTACHMENT_UPLOAD_FAILURE_MESSAGE),
			}),
		).toThrow(ATTACHMENT_UPLOAD_FAILURE_MESSAGE);
	});

	it("returns uploaded attachment ids on successful upload result", async () => {
		const { resolveAttachmentUploadResult } = await loadAttachmentFlow();

		expect(
			resolveAttachmentUploadResult({
				status: "ok",
				attachmentIds: ["draft-1", "draft-2"],
			}),
		).toEqual(["draft-1", "draft-2"]);
	});

	it("cubre el flujo runtime de adjuntos: fallo visible, resolución y rehidratación persistida", async () => {
		const { deriveChatShellState, runDraftAttachmentSendFlow } =
			await loadAttachmentFlow();
		const shellAtEmptyState = deriveChatShellState([]);
		const uploadStatesFirstAttempt: Array<{
			index: number;
			status: string;
		}> = [];
		const uploadAttachment = mock(async (file: File): Promise<string> => {
			if (file.name === "bad.txt") {
				throw new Error("Upload failed for bad.txt");
			}
			return "draft-ok";
		});
		const streamTurn = mock(
			async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
				onEvent({ event: "finish" });
			},
		);
		const persistedMessages: MyUIMessage[] = [
			{
				id: "persisted-user-1",
				role: "user",
				content: "mensaje con adjunto",
				parts: [
					{ type: "text", text: "mensaje con adjunto" },
					{
						type: "file",
						mediaType: "text/plain",
						url: "https://cdn.example.com/ok.txt",
						filename: "ok.txt",
					},
				],
				createdAt: "2026-04-22T00:00:00.000Z",
			},
		];
		const reloadHistory = mock(async () => persistedMessages);

		const blockedResult = await runDraftAttachmentSendFlow({
			threadId: "thread-1",
			contentText: "mensaje con adjunto",
			files: [
				{ url: "data:text/plain;base64,b2s=", filename: "ok.txt" },
				{ url: "data:text/plain;base64,YmFk", filename: "bad.txt" },
			],
			uploadAttachment,
			streamTurn,
			reloadHistory,
			onUploadStateChange: (index, state) => {
				uploadStatesFirstAttempt.push({ index, status: state.status });
			},
		});

		expect(blockedResult.status).toBe("blocked");
		if (blockedResult.status === "blocked") {
			expect(blockedResult.error.message).toBe(
				ATTACHMENT_UPLOAD_FAILURE_MESSAGE,
			);
		}
		expect(uploadStatesFirstAttempt).toEqual([
			{ index: 0, status: "uploading" },
			{ index: 1, status: "uploading" },
			{ index: 0, status: "uploaded" },
			{ index: 1, status: "error" },
		]);
		expect(streamTurn).not.toHaveBeenCalled();
		expect(reloadHistory).not.toHaveBeenCalled();

		const resolvedResult = await runDraftAttachmentSendFlow({
			threadId: "thread-1",
			contentText: "mensaje con adjunto",
			files: [{ url: "data:text/plain;base64,b2s=", filename: "ok.txt" }],
			uploadAttachment,
			streamTurn,
			reloadHistory,
		});

		expect(resolvedResult).toEqual({
			status: "sent",
			attachmentIds: ["draft-ok"],
			persistedMessages,
		});
		if (resolvedResult.status === "sent") {
			const shellAfterSend = deriveChatShellState(resolvedResult.persistedMessages);
			expect(shellAfterSend.mode).toBe("conversation");
			expect(shellAfterSend.composerBoundaryId).toBe(
				shellAtEmptyState.composerBoundaryId,
			);
		}
		expect(streamTurn).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: "thread-1",
				contentText: "mensaje con adjunto",
				existingAttachmentIds: ["draft-ok"],
			}),
		);
		expect(reloadHistory).toHaveBeenCalledWith("thread-1");
	});

	it("keeps composer boundary stable when send is blocked from empty state", async () => {
		const { deriveChatShellState, runDraftAttachmentSendFlow } =
			await loadAttachmentFlow();
		const shellAtEmptyState = deriveChatShellState([]);

		const uploadAttachment = mock(async () => {
			throw new Error("upload failed");
		});
		const streamTurn = mock(async () => undefined);
		const reloadHistory = mock(async (): Promise<MyUIMessage[]> => []);

		const blockedResult = await runDraftAttachmentSendFlow({
			threadId: "thread-1",
			contentText: "hola",
			files: [{ url: "data:text/plain;base64,b2s=", filename: "ok.txt" }],
			uploadAttachment,
			streamTurn,
			reloadHistory,
		});

		expect(blockedResult.status).toBe("blocked");
		const shellAfterBlockedSend = deriveChatShellState([]);
		expect(shellAfterBlockedSend.mode).toBe("empty");
		expect(shellAfterBlockedSend.composerBoundaryId).toBe(
			shellAtEmptyState.composerBoundaryId,
		);
		expect(streamTurn).not.toHaveBeenCalled();
		expect(reloadHistory).not.toHaveBeenCalled();
	});

	it("bloquea el envío cuando falla un upload y no inicia stream", async () => {
		const { runDraftAttachmentSendFlow } = await loadAttachmentFlow();
		const uploadAttachment = mock(async (file: File): Promise<string> => {
			if (file.name === "bad.txt") {
				throw new Error("Upload failed for bad.txt");
			}
			return "draft-ok";
		});
		const streamTurn = mock(
			async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
				onEvent({ event: "finish" });
			},
		);
		const reloadHistory = mock(async (): Promise<MyUIMessage[]> => []);

		const result = await runDraftAttachmentSendFlow({
			threadId: "thread-1",
			contentText: "hola",
			files: [
				{ url: "data:text/plain;base64,b2s=", filename: "ok.txt" },
				{ url: "data:text/plain;base64,YmFk", filename: "bad.txt" },
			],
			uploadAttachment,
			streamTurn,
			reloadHistory,
		});

		expect(result.status).toBe("blocked");
		expect(streamTurn).not.toHaveBeenCalled();
		expect(reloadHistory).not.toHaveBeenCalled();
	});

	it("rehidrata historial persistido cuando el flujo completa", async () => {
		const { runDraftAttachmentSendFlow } = await loadAttachmentFlow();
		const uploadAttachment = mock(async (): Promise<string> => "draft-1");
		const streamTurn = mock(
			async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
				onEvent({ event: "finish" });
			},
		);
		const persistedMessages: MyUIMessage[] = [
			{
				id: "msg-user-1",
				role: "user",
				content: "Hola",
				parts: [{ type: "text", text: "Hola" }],
				createdAt: "2026-04-22T00:00:00.000Z",
			},
		];
		const reloadHistory = mock(async () => persistedMessages);

		const result = await runDraftAttachmentSendFlow({
			threadId: "thread-1",
			contentText: "Hola",
			files: [{ url: "data:text/plain;base64,aG9sYQ==", filename: "ok.txt" }],
			uploadAttachment,
			streamTurn,
			reloadHistory,
		});

		expect(result).toEqual({
			status: "sent",
			attachmentIds: ["draft-1"],
			persistedMessages,
		});
		expect(streamTurn).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: "thread-1",
				contentText: "Hola",
				existingAttachmentIds: ["draft-1"],
			}),
		);
		expect(reloadHistory).toHaveBeenCalledWith("thread-1");
	});
});
