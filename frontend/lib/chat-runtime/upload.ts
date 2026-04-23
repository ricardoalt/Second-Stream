import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { uploadChatAttachment } from "@/lib/api/chat";

/**
 * Uploads file attachments from a prompt message and returns their IDs.
 *
 * Reads each file from its blob URL, creates a File object,
 * and uploads it via the chat attachment API.
 */
export async function uploadAttachmentsFromPromptMessage(
	message: PromptInputMessage,
): Promise<string[]> {
	if (message.files.length === 0) {
		return [];
	}

	const attachmentIds: string[] = [];
	for (const part of message.files) {
		const response = await fetch(part.url);
		if (!response.ok) {
			throw new Error(`Unable to read attachment ${part.filename ?? "file"}.`);
		}
		const blob = await response.blob();
		const filename = part.filename ?? "attachment";
		const mediaType = part.mediaType || blob.type || "application/octet-stream";
		const file = new File([blob], filename, { type: mediaType });
		const id = await uploadChatAttachment(file);
		attachmentIds.push(id);
	}

	return attachmentIds;
}
