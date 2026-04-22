import { describe, expect, it } from "vitest";
import {
	getAttachmentValidationMessage,
	shouldClearSubmitErrorOnComposerChange,
	submitChatPromptMessage,
} from "@/components/chat-ui/chat-prompt-composer";

describe("getAttachmentValidationMessage", () => {
	it("returns an explicit size limit message", () => {
		expect(getAttachmentValidationMessage("max_file_size")).toContain("4MB");
	});

	it("returns an explicit invalid type message", () => {
		expect(getAttachmentValidationMessage("accept")).toContain("image/*");
	});

	it("returns an explicit max files message", () => {
		expect(getAttachmentValidationMessage("max_files")).toContain("files");
	});

	it("returns an explicit file read failure message", () => {
		expect(getAttachmentValidationMessage("read_failed")).toContain(
			"Remove them and try again",
		);
	});
});

describe("submitChatPromptMessage", () => {
	it("preserves submit failure by rejecting the promise", async () => {
		const submitFailure = new Error("send failed");

		await expect(
			submitChatPromptMessage(
				{
					text: "Hola",
					files: [],
				},
				"model-id",
				async () => {
					throw submitFailure;
				},
			),
		).rejects.toThrow("send failed");
	});

	it("resolves successfully so PromptInput can clear draft", async () => {
		await expect(
			submitChatPromptMessage(
				{
					text: "Hola",
					files: [],
				},
				"model-id",
				async () => undefined,
			),
		).resolves.toBeUndefined();
	});
});

describe("shouldClearSubmitErrorOnComposerChange", () => {
	it("keeps submit error visible when no user interaction occurred", () => {
		expect(
			shouldClearSubmitErrorOnComposerChange({
				errorMessage: "Some attachments failed to upload",
				hadUserInteraction: false,
			}),
		).toBe(false);
	});

	it("clears submit error after explicit user interaction", () => {
		expect(
			shouldClearSubmitErrorOnComposerChange({
				errorMessage: "Some attachments failed to upload",
				hadUserInteraction: true,
			}),
		).toBe(true);
	});

	it("allows interaction callback when no submit error exists", () => {
		expect(
			shouldClearSubmitErrorOnComposerChange({
				errorMessage: null,
				hadUserInteraction: false,
			}),
		).toBe(true);
	});
});
