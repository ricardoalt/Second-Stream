import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api/v1";

const { apiClient } = await import("@/lib/api/client");
const { parseChatSSEBuffer, reloadPersistedThreadHistory } = await import(
	"@/lib/api/chat"
);

const originalGet = apiClient.get;

describe("chat api", () => {
	beforeEach(() => {
		apiClient.get = originalGet;
	});

	afterEach(() => {
		apiClient.get = originalGet;
	});

	it("parses ordered SSE events across chunk boundaries", () => {
		const firstChunk =
			'event: start\ndata: {"runId":"run-1","threadId":"thread-1"}\n\nevent: delta\ndata: {"delta":"Hello"}\n\n';
		const secondChunk =
			'event: delta\ndata: {"delta":" world"}\n\nevent: completed\ndata: {"messageId":"assistant-1"}\n\n';

		const firstPass = parseChatSSEBuffer(firstChunk);
		expect(firstPass.rest).toBe("");
		expect(firstPass.events).toEqual([
			{ event: "start", runId: "run-1", threadId: "thread-1" },
			{ event: "delta", delta: "Hello" },
		]);

		const secondPass = parseChatSSEBuffer(firstPass.rest + secondChunk);
		expect(secondPass.rest).toBe("");
		expect(secondPass.events).toEqual([
			{ event: "delta", delta: " world" },
			{ event: "completed", messageId: "assistant-1" },
		]);
	});

	it("reloads persisted history from backend detail response", async () => {
		const getSpy = mock(async () => ({
			id: "thread-1",
			title: "Persisted thread",
			lastMessagePreview: "Assistant reply",
			lastMessageAt: "2026-04-20T00:00:00.000Z",
			messages: [
				{
					id: "message-user-1",
					role: "user",
					contentText: "What changed?",
					status: "completed",
					createdAt: "2026-04-20T00:00:00.000Z",
					attachments: [
						{
							id: "attachment-1",
							messageId: "message-user-1",
							originalFilename: "context.txt",
							contentType: "text/plain",
							sizeBytes: 12,
							createdAt: "2026-04-20T00:00:00.000Z",
						},
					],
				},
				{
					id: "message-assistant-1",
					role: "assistant",
					contentText: "We switched to persisted history.",
					status: "completed",
					createdAt: "2026-04-20T00:00:03.000Z",
					attachments: [],
				},
			],
		}));

		apiClient.get = getSpy as typeof apiClient.get;

		const messages = await reloadPersistedThreadHistory("thread-1");

		expect(getSpy).toHaveBeenCalledWith("/chat/threads/thread-1");
		expect(messages).toHaveLength(2);
		expect(messages[0]).toMatchObject({
			id: "message-user-1",
			role: "user",
			content: "What changed?",
		});
		expect(messages[0]?.parts).toEqual([
			{ type: "text", text: "What changed?" },
			{
				type: "file",
				filename: "context.txt",
				mediaType: "text/plain",
				url: "attachment://attachment-1",
			},
		]);
		expect(messages[1]).toMatchObject({
			id: "message-assistant-1",
			role: "assistant",
			content: "We switched to persisted history.",
			parts: [{ type: "text", text: "We switched to persisted history." }],
		});
	});
});
