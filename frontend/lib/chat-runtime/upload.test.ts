import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const { apiClient } = await import("@/lib/api/client");
const { uploadAttachmentsFromPromptMessage } = await import("./upload");

const originalFetch = globalThis.fetch;
const originalUploadFile = apiClient.uploadFile;

describe("uploadAttachmentsFromPromptMessage", () => {
	beforeEach(() => {
		globalThis.fetch = originalFetch;
		apiClient.uploadFile = originalUploadFile;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		apiClient.uploadFile = originalUploadFile;
	});

	it("sube cada archivo y retorna ids en orden", async () => {
		const fetchSpy = mock(async () => new Response("name,value\nmetal,42\n"));
		globalThis.fetch = fetchSpy as typeof globalThis.fetch;

		const uploadSpy = mock(async (_url: string, file: File) => ({
			id: file.name === "evidence-1.csv" ? "att-1" : "att-2",
		}));
		apiClient.uploadFile = uploadSpy as typeof apiClient.uploadFile;

		const message: PromptInputMessage = {
			text: "Analiza adjuntos",
			files: [
				{
					type: "file",
					mediaType: "text/csv",
					url: "blob:1",
					filename: "evidence-1.csv",
				},
				{
					type: "file",
					mediaType: "text/markdown",
					url: "blob:2",
					filename: "notes.md",
				},
			],
		};

		const result = await uploadAttachmentsFromPromptMessage(message);
		expect(result).toEqual(["att-1", "att-2"]);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(uploadSpy).toHaveBeenCalledTimes(2);
	});

	it("lanza error claro cuando no puede leer el blob", async () => {
		const fetchSpy = mock(async () => new Response("", { status: 500 }));
		globalThis.fetch = fetchSpy as typeof globalThis.fetch;

		await expect(
			uploadAttachmentsFromPromptMessage({
				text: "Analiza",
				files: [
					{
						type: "file",
						mediaType: "text/plain",
						url: "blob:bad",
						filename: "broken.txt",
					},
				],
			} satisfies PromptInputMessage),
		).rejects.toThrow("Unable to read attachment broken.txt.");
	});
});
