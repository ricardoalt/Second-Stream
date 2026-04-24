import { describe, expect, it } from "bun:test";
import type { MyUIMessage } from "@/types/ui-message";
import {
	buildBridgeHeaders,
	prepareBridgeSendRequest,
	resolveLatestUserText,
} from "./transport";

function createUserTextMessage(text: string): MyUIMessage {
	return {
		id: "msg-user-1",
		role: "user",
		parts: [{ type: "text", text }],
	};
}

describe("chat bridge transport", () => {
	it("resolves latest user text from UI messages for text-only streaming", () => {
		const messages: MyUIMessage[] = [
			createUserTextMessage("first"),
			{
				id: "msg-assistant-1",
				role: "assistant",
				parts: [{ type: "text", text: "ok" }],
			},
			createUserTextMessage("second turn"),
		];

		expect(resolveLatestUserText(messages)).toBe("second turn");
	});

	it("includes auth/org/thread context in backend transport request", () => {
		const prepared = prepareBridgeSendRequest({
			baseUrl: "https://api.secondstream.test",
			threadId: "thread-42",
			accessToken: "token-abc",
			organizationId: "org-7",
			messages: [createUserTextMessage("hello bridge")],
			existingAttachmentIds: ["att-1", "att-2"],
			headers: {
				"x-extra": "kept",
			},
		});

		expect(prepared.api).toBe(
			"https://api.secondstream.test/chat/threads/thread-42/messages/stream",
		);
		expect(prepared.body).toEqual({
			messages: [createUserTextMessage("hello bridge")],
			existingAttachmentIds: ["att-1", "att-2"],
		});
		expect(prepared.headers).toMatchObject({
			Accept: "text/event-stream",
			Authorization: "Bearer token-abc",
			"X-Organization-Id": "org-7",
			"x-vercel-ai-ui-message-stream": "v1",
			"x-extra": "kept",
		});
	});

	it("omits existingAttachmentIds when no attachments are provided", () => {
		const prepared = prepareBridgeSendRequest({
			baseUrl: "https://api.secondstream.test",
			threadId: "thread-42",
			accessToken: null,
			organizationId: null,
			messages: [createUserTextMessage("hello bridge")],
			existingAttachmentIds: [],
		});

		expect(prepared.body).toEqual({
			messages: [createUserTextMessage("hello bridge")],
		});
	});

	it("keeps required protocol headers even without auth/org values", () => {
		expect(
			buildBridgeHeaders({
				accessToken: null,
				organizationId: null,
			}),
		).toEqual({
			Accept: "text/event-stream",
			"x-vercel-ai-ui-message-stream": "v1",
		});
	});
});
