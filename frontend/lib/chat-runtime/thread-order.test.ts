import { describe, expect, it } from "bun:test";
import { sortThreadsByRecency } from "@/lib/chat-runtime/thread-order";

describe("thread-order", () => {
	it("ordena por lastMessageAt/updatedAt/createdAt desc", () => {
		const sorted = sortThreadsByRecency([
			{
				id: "a",
				title: "A",
				lastMessagePreview: null,
				lastMessageAt: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-02T00:00:00.000Z",
			},
			{
				id: "b",
				title: "B",
				lastMessagePreview: null,
				lastMessageAt: "2026-01-03T00:00:00.000Z",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
			{
				id: "c",
				title: "C",
				lastMessagePreview: null,
				lastMessageAt: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T12:00:00.000Z",
			},
		]);

		expect(sorted.map((thread) => thread.id)).toEqual(["b", "a", "c"]);
	});

	it("desempata por id desc", () => {
		const sorted = sortThreadsByRecency([
			{
				id: "a",
				title: "A",
				lastMessagePreview: null,
				lastMessageAt: "2026-01-03T00:00:00.000Z",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-03T00:00:00.000Z",
			},
			{
				id: "b",
				title: "B",
				lastMessagePreview: null,
				lastMessageAt: "2026-01-03T00:00:00.000Z",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-03T00:00:00.000Z",
			},
		]);

		expect(sorted.map((thread) => thread.id)).toEqual(["b", "a"]);
	});
});
