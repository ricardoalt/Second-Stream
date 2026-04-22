import { describe, expect, it } from "bun:test";
import {
	type AttachmentUploadState,
	canStartStream,
	dataUrlToFile,
	getUploadedAttachmentIds,
	initializeUploadStates,
	updateUploadState,
} from "@/lib/chat-attachment-utils";

describe("canStartStream", () => {
	it("allows stream when there are no attachments", () => {
		expect(canStartStream([])).toBe(true);
	});

	it("allows stream when all attachments are uploaded", () => {
		const states: AttachmentUploadState[] = [
			{ status: "uploaded", attachmentId: "att-1" },
			{ status: "uploaded", attachmentId: "att-2" },
		];
		expect(canStartStream(states)).toBe(true);
	});

	it("blocks stream when at least one attachment is uploading", () => {
		const states: AttachmentUploadState[] = [
			{ status: "uploaded", attachmentId: "att-1" },
			{ status: "uploading" },
		];
		expect(canStartStream(states)).toBe(false);
	});

	it("blocks stream when at least one attachment has error", () => {
		const states: AttachmentUploadState[] = [
			{ status: "uploaded", attachmentId: "att-1" },
			{ status: "error", message: "Upload failed" },
		];
		expect(canStartStream(states)).toBe(false);
	});

	it("blocks stream when at least one attachment is idle", () => {
		const states: AttachmentUploadState[] = [
			{ status: "idle" },
			{ status: "uploaded", attachmentId: "att-1" },
		];
		expect(canStartStream(states)).toBe(false);
	});
});

describe("getUploadedAttachmentIds", () => {
	it("returns empty array when no attachments", () => {
		expect(getUploadedAttachmentIds([])).toEqual([]);
	});

	it("returns only uploaded attachment ids", () => {
		const states: AttachmentUploadState[] = [
			{ status: "uploaded", attachmentId: "att-1" },
			{ status: "uploading" },
			{ status: "error", message: "fail" },
			{ status: "uploaded", attachmentId: "att-2" },
		];
		expect(getUploadedAttachmentIds(states)).toEqual(["att-1", "att-2"]);
	});
});

describe("initializeUploadStates", () => {
	it("returns empty array for count 0", () => {
		expect(initializeUploadStates(0)).toEqual([]);
	});

	it("returns idle states for positive count", () => {
		expect(initializeUploadStates(3)).toEqual([
			{ status: "idle" },
			{ status: "idle" },
			{ status: "idle" },
		]);
	});
});

describe("updateUploadState", () => {
	it("updates state at specific index immutably", () => {
		const states = initializeUploadStates(3);
		const updated = updateUploadState(states, 1, {
			status: "uploading",
		});
		expect(updated).toEqual([
			{ status: "idle" },
			{ status: "uploading" },
			{ status: "idle" },
		]);
		expect(updated).not.toBe(states);
	});
});

describe("dataUrlToFile", () => {
	it("converts a base64 data URL to a File", () => {
		const dataUrl = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
		const file = dataUrlToFile(dataUrl, "hello.txt");
		expect(file).not.toBeNull();
		expect(file?.name).toBe("hello.txt");
		expect(file?.type.startsWith("text/plain")).toBe(true);
		expect(file?.size).toBe(11);
	});

	it("converts a plain text data URL to a File", () => {
		const dataUrl = "data:text/plain,Hello%20World";
		const file = dataUrlToFile(dataUrl, "hello.txt");
		expect(file).not.toBeNull();
		expect(file?.name).toBe("hello.txt");
		expect(file?.type.startsWith("text/plain")).toBe(true);
		expect(file?.size).toBe(11);
	});

	it("returns null for an invalid data URL", () => {
		const file = dataUrlToFile("not-a-data-url", "test.txt");
		expect(file).toBeNull();
	});

	it("defaults media type when missing", () => {
		const dataUrl = "data:;base64,SGVsbG8=";
		const file = dataUrlToFile(dataUrl, "hello.bin");
		expect(file).not.toBeNull();
		expect(file?.type).toBe("application/octet-stream");
	});
});
