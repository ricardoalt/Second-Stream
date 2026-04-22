import type { ChatStreamEvent } from "@/lib/api/chat";
import {
	type AttachmentUploadState,
	dataUrlToFile,
} from "@/lib/chat-attachment-utils";
import type { MyUIMessage } from "@/types/ui-message";

export type DraftComposerFile = {
	url: string;
	filename?: string;
};

export type DraftUploadResult =
	| { status: "ok"; attachmentIds: string[] }
	| { status: "error"; error: Error };

export type DraftSendFlowResult =
	| { status: "blocked"; error: Error }
	| {
			status: "sent";
			attachmentIds: string[];
			persistedMessages: MyUIMessage[];
	  };

export const ATTACHMENT_UPLOAD_FAILURE_MESSAGE =
	"Some attachments failed to upload. Remove failed files and try again.";

export async function runDraftAttachmentSendFlow(options: {
	threadId: string;
	contentText: string;
	files: DraftComposerFile[];
	uploadAttachment: (file: File) => Promise<string>;
	streamTurn: (options: {
		threadId: string;
		contentText: string;
		existingAttachmentIds?: string[];
		onEvent: (event: ChatStreamEvent) => void;
	}) => Promise<void>;
	reloadHistory: (threadId: string) => Promise<MyUIMessage[]>;
	onUploadStateChange?: (index: number, state: AttachmentUploadState) => void;
	onStreamEvent?: (event: ChatStreamEvent) => void;
}): Promise<DraftSendFlowResult> {
	const uploadArgs = {
		files: options.files,
		uploadAttachment: options.uploadAttachment,
		...(options.onUploadStateChange
			? { onUploadStateChange: options.onUploadStateChange }
			: {}),
	};
	const uploadResult = await uploadDraftAttachmentsForSend(uploadArgs);

	if (uploadResult.status === "error") {
		return { status: "blocked", error: uploadResult.error };
	}

	const persistedMessages = await streamAndReloadPersistedTurn({
		threadId: options.threadId,
		contentText: options.contentText,
		attachmentIds: uploadResult.attachmentIds,
		streamTurn: options.streamTurn,
		reloadHistory: options.reloadHistory,
		...(options.onStreamEvent ? { onStreamEvent: options.onStreamEvent } : {}),
	});
	return {
		status: "sent",
		attachmentIds: uploadResult.attachmentIds,
		persistedMessages,
	};
}

export async function uploadDraftAttachmentsForSend(options: {
	files: DraftComposerFile[];
	uploadAttachment: (file: File) => Promise<string>;
	onUploadStateChange?: (index: number, state: AttachmentUploadState) => void;
}): Promise<DraftUploadResult> {
	if (options.files.length === 0) {
		return { status: "ok", attachmentIds: [] };
	}

	const uploadPromises = options.files.map(async (filePart, index) => {
		options.onUploadStateChange?.(index, { status: "uploading" });

		try {
			const file = dataUrlToFile(
				filePart.url,
				filePart.filename || "attachment",
			);
			if (!file) {
				throw new Error("Invalid file data");
			}

			const attachmentId = await options.uploadAttachment(file);
			options.onUploadStateChange?.(index, {
				status: "uploaded",
				attachmentId,
			});
			return attachmentId;
		} catch (error) {
			options.onUploadStateChange?.(index, {
				status: "error",
				message: error instanceof Error ? error.message : "Upload failed",
			});
			throw error;
		}
	});

	const results = await Promise.allSettled(uploadPromises);
	const hasFailures = results.some((result) => result.status === "rejected");
	if (hasFailures) {
		return {
			status: "error",
			error: new Error(ATTACHMENT_UPLOAD_FAILURE_MESSAGE),
		};
	}

	return {
		status: "ok",
		attachmentIds: results
			.filter(
				(result): result is PromiseFulfilledResult<string> =>
					result.status === "fulfilled",
			)
			.map((result) => result.value),
	};
}

export async function streamAndReloadPersistedTurn(options: {
	threadId: string;
	contentText: string;
	attachmentIds: string[];
	streamTurn: (options: {
		threadId: string;
		contentText: string;
		existingAttachmentIds?: string[];
		onEvent: (event: ChatStreamEvent) => void;
	}) => Promise<void>;
	reloadHistory: (threadId: string) => Promise<MyUIMessage[]>;
	onStreamEvent?: (event: ChatStreamEvent) => void;
}): Promise<MyUIMessage[]> {
	const existingAttachmentIds =
		options.attachmentIds.length > 0 ? options.attachmentIds : undefined;

	let streamErrorCode: string | null = null;
	const streamArgs = {
		threadId: options.threadId,
		contentText: options.contentText,
		...(existingAttachmentIds ? { existingAttachmentIds } : {}),
		onEvent: (event: ChatStreamEvent) => {
			if (event.event === "error") {
				streamErrorCode = event.code ?? "CHAT_STREAM_FAILED";
			}
			options.onStreamEvent?.(event);
		},
	};
	await options.streamTurn(streamArgs);

	if (streamErrorCode) {
		throw new Error(`Stream failed (${streamErrorCode})`);
	}

	return options.reloadHistory(options.threadId);
}
