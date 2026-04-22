export type AttachmentUploadState =
	| { status: "idle" }
	| { status: "uploading" }
	| { status: "uploaded"; attachmentId: string }
	| { status: "error"; message: string };

export function canStartStream(uploadStates: AttachmentUploadState[]): boolean {
	return uploadStates.every((state) => state.status === "uploaded");
}

export function getUploadedAttachmentIds(
	uploadStates: AttachmentUploadState[],
): string[] {
	return uploadStates
		.filter(
			(state): state is { status: "uploaded"; attachmentId: string } =>
				state.status === "uploaded",
		)
		.map((state) => state.attachmentId);
}

export function initializeUploadStates(count: number): AttachmentUploadState[] {
	return Array.from({ length: count }, () => ({ status: "idle" }));
}

export function updateUploadState(
	states: AttachmentUploadState[],
	index: number,
	update: AttachmentUploadState,
): AttachmentUploadState[] {
	const next = [...states];
	next[index] = update;
	return next;
}

/**
 * Convert a data URL (e.g. "data:text/plain;base64,SGVsbG8=") to a File object.
 * Returns null if the URL is not a valid data URL.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
	const match = dataUrl.match(/^data:([^;]+)?(;base64)?,(.+)$/);
	if (!match) return null;

	const mediaType = match[1] || "application/octet-stream";
	const isBase64 = Boolean(match[2]);
	const data = match[3];

	if (!isBase64) {
		// For non-base64 data URLs, percent-decode and create blob
		const decoded = decodeURIComponent(data);
		return new File([decoded], filename, { type: mediaType });
	}

	const buffer = Buffer.from(data, "base64");
	return new File([buffer], filename, { type: mediaType });
}
