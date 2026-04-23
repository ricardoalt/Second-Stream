import { describe, expect, it } from "bun:test";
import type { ChatThreadSummaryDTO } from "@/lib/api/chat";
import {
	applyProvisionalThreadFromPrompt,
	applyConversationTitleFromEvent,
	deriveProvisionalThreadTitleFromPrompt,
	upsertThreadFromEvent,
} from "@/lib/chat-runtime/sidebar-events";

describe("chat-interface sidebar events", () => {
	it("data-new-thread-created inserta/upserta en tope", () => {
		const existing: ChatThreadSummaryDTO[] = [
			{
				id: "old",
				title: "Old",
				lastMessagePreview: null,
				lastMessageAt: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		];

		const next = upsertThreadFromEvent(existing, {
			type: "data-new-thread-created",
			data: {
				threadId: "new",
				title: "Nuevo chat",
				createdAt: "2026-01-02T00:00:00.000Z",
				updatedAt: "2026-01-02T00:00:00.000Z",
			},
		});

		expect(next[0]?.id).toBe("new");
		expect(next).toHaveLength(2);
	});

	it("data-new-thread-created preserva preview y timestamp provisionales", () => {
		const existing: ChatThreadSummaryDTO[] = [
			{
				id: "thread-1",
				title: "Título provisional",
				lastMessagePreview: "Mensaje provisional",
				lastMessageAt: "2026-01-03T00:00:00.000Z",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-03T00:00:00.000Z",
			},
		];

		const next = upsertThreadFromEvent(existing, {
			type: "data-new-thread-created",
			data: {
				threadId: "thread-1",
				title: "   ",
				createdAt: "",
				updatedAt: "",
			},
		});

		expect(next[0]).toMatchObject({
			id: "thread-1",
			title: "Título provisional",
			lastMessagePreview: "Mensaje provisional",
			lastMessageAt: "2026-01-03T00:00:00.000Z",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-03T00:00:00.000Z",
		});
	});

	it("data-conversation-title actualiza el título del thread", () => {
		const next = applyConversationTitleFromEvent(
			[
				{
					id: "thread-1",
					title: "New chat",
					lastMessagePreview: null,
					lastMessageAt: null,
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
				},
			],
			{
				type: "data-conversation-title",
				data: { threadId: "thread-1", title: "Título final" },
			},
		);

		expect(next[0]?.title).toBe("Título final");
	});

	it("deriva título provisional desde el primer prompt", () => {
		expect(deriveProvisionalThreadTitleFromPrompt("   Hola mundo   ")).toBe(
			"Hola mundo",
		);
	});

	it("mantiene estado provisional estable para preview y timestamps", () => {
		const nowIso = "2026-01-03T00:00:00.000Z";
		const next = applyProvisionalThreadFromPrompt(
			[
				{
					id: "thread-1",
					title: "New chat",
					lastMessagePreview: null,
					lastMessageAt: null,
					createdAt: "2026-01-01T00:00:00.000Z",
					updatedAt: "2026-01-01T00:00:00.000Z",
				},
			],
			"thread-1",
			"Necesito ayuda con propuesta",
			nowIso,
		);

		expect(next[0]).toMatchObject({
			title: "Necesito ayuda con propuesta",
			lastMessagePreview: "Necesito ayuda con propuesta",
			lastMessageAt: nowIso,
			updatedAt: nowIso,
		});
	});
});
