import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAttachmentValidationMessage } from "@/components/chat-ui/chat-prompt-composer";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

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

	it("renders attachment info with compact inline styling", () => {
		const source = read("components/chat-ui/chat-composer-attachments.tsx");

		expect(source).toContain('variant="inline"');
		expect(source).toContain(
			'<AttachmentInfo className="text-xs" title={filename} />',
		);
		expect(source).toContain('className="max-w-[min(11rem,100%)] min-w-0"');
		expect(source).toContain("<AttachmentHoverCard");
	});

	it("clears visible input and draft from the submit acceptance callback", () => {
		const source = read("components/chat-ui/chat-prompt-composer.tsx");
		const submitCallIndex = source.indexOf(
			"await onSubmitMessage(message, () => {",
		);
		const clearInputIndex = source.indexOf('setInput("");');
		const clearDraftIndex = source.indexOf("draft.clear();");
		const resetAttachmentsIndex = source.indexOf(
			"setResetKey((key) => key + 1);",
		);

		expect(submitCallIndex).toBeGreaterThan(-1);
		expect(clearDraftIndex).toBeGreaterThan(submitCallIndex);
		expect(clearInputIndex).toBeGreaterThan(submitCallIndex);
		expect(resetAttachmentsIndex).toBeGreaterThan(clearDraftIndex);
	});

	it("acquires local submit lock before async upload starts", () => {
		const source = read("components/chat-ui/chat-interface.tsx");
		const guardIndex = source.indexOf(
			"if (isSubmittingMessageRef.current || isChatBusy) {",
		);
		const setSubmittingRefIndex = source.indexOf(
			"isSubmittingMessageRef.current = true;",
		);
		const setSubmittingStateIndex = source.indexOf(
			"setIsSubmittingMessage(true);",
		);
		const uploadIndex = source.indexOf(
			"const attachmentIds = await uploadAttachmentsFromPromptMessage(message);",
		);

		expect(guardIndex).toBeGreaterThan(-1);
		expect(setSubmittingRefIndex).toBeGreaterThan(guardIndex);
		expect(setSubmittingStateIndex).toBeGreaterThan(setSubmittingRefIndex);
		expect(uploadIndex).toBeGreaterThan(setSubmittingStateIndex);
	});

	it("derives composer busy from local lock plus AI SDK stream status", () => {
		const source = read("components/chat-ui/chat-interface.tsx");

		expect(source).toContain(
			"const isComposerBusy = isSubmittingMessage || isStreamingOrSubmitted;",
		);
		expect(source).toContain("busy={isComposerBusy}");
	});

	it("disables composer controls when busy", () => {
		const source = read("components/chat-ui/chat-prompt-composer.tsx");

		expect(source).toContain("disabled={busy}");
		expect(source).toContain("disabled={");
		expect(source).toContain("(!canStop && busy)");
		expect(source).toContain(
			"const canStop = isStreamingOrSubmitted && Boolean(onStop);",
		);
	});
});
