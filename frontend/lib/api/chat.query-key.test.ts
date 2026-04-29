import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
	buildChatThreadHistoryQueryKey,
	buildChatThreadsQueryKey,
} from "@/lib/chat-runtime/query-keys";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const { apiClient } = await import("@/lib/api/client");
const {
	buildChatAttachmentDownloadUrl,
	downloadChatAttachment,
	fetchChatThreadDetail,
	getChatAttachmentIdFromDownloadUrl,
	archiveChatThread,
	listChatThreads,
	renameChatThread,
	reloadPersistedThreadHistory,
} = await import("@/lib/api/chat");

const originalGet = apiClient.get;
const originalPost = apiClient.post;
const originalPatch = apiClient.patch;
const originalDownloadBlob = apiClient.downloadBlob;

describe("chat threads query key", () => {
	beforeEach(() => {
		apiClient.get = originalGet;
		apiClient.post = originalPost;
		apiClient.patch = originalPatch;
		apiClient.downloadBlob = originalDownloadBlob;
	});

	afterEach(() => {
		apiClient.get = originalGet;
		apiClient.post = originalPost;
		apiClient.patch = originalPatch;
		apiClient.downloadBlob = originalDownloadBlob;
	});

	it("calls archive endpoint with POST and scoped org header", async () => {
		const postSpy = mock(async () => undefined);
		apiClient.post = postSpy as typeof apiClient.post;

		await archiveChatThread("thread-12", { organizationId: "org-9" });

		expect(postSpy).toHaveBeenCalledWith(
			"/chat/threads/thread-12/archive",
			undefined,
			{ "X-Organization-Id": "org-9" },
		);
	});

	it("extracts attachment id from persisted download url", () => {
		expect(
			getChatAttachmentIdFromDownloadUrl(
				buildChatAttachmentDownloadUrl("attachment-42"),
			),
		).toBe("attachment-42");
	});

	it("extracts attachment id when API base path prefixes URL", () => {
		expect(
			getChatAttachmentIdFromDownloadUrl(
				"https://api.example.com/api/v1/chat/attachments/attachment-77/download",
			),
		).toBe("attachment-77");
	});

	it("returns null when file URL is not a persisted attachment URL", () => {
		expect(
			getChatAttachmentIdFromDownloadUrl(
				"https://example.com/uploads/sample.pdf",
			),
		).toBeNull();
	});

	it("scopes by organization and user", () => {
		expect(
			buildChatThreadsQueryKey({ organizationId: "org-1", userId: "user-1" }),
		).toEqual(["chat-threads", "org-1", "user-1"]);
	});

	it("uses explicit fallback buckets when scope is missing", () => {
		expect(
			buildChatThreadsQueryKey({ organizationId: null, userId: null }),
		).toEqual(["chat-threads", "no-org", "no-user"]);
	});

	it("uses same scope contract for persisted history query key", () => {
		expect(
			buildChatThreadHistoryQueryKey("thread-77", {
				organizationId: "org-1",
				userId: "user-1",
			}),
		).toEqual(["chat-thread-history", "thread-77", "org-1", "user-1"]);
	});

	it("sends explicit X-Organization-Id header when scoped org exists", async () => {
		const getSpy = mock(async () => ({ items: [] }));
		apiClient.get = getSpy as typeof apiClient.get;

		await listChatThreads({ organizationId: "org-7" });

		expect(getSpy).toHaveBeenCalledWith("/chat/threads", {
			"X-Organization-Id": "org-7",
		});
	});

	it("does not send explicit org header when scope has no organization", async () => {
		const getSpy = mock(async () => ({ items: [] }));
		apiClient.get = getSpy as typeof apiClient.get;

		await listChatThreads({ organizationId: null });

		expect(getSpy).toHaveBeenCalledWith("/chat/threads", undefined);
	});

	it("uses same explicit org scope for persisted thread detail/history", async () => {
		const getSpy = mock(async () => ({
			id: "thread-7",
			title: "Título",
			lastMessagePreview: null,
			lastMessageAt: null,
			messages: [],
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		await fetchChatThreadDetail("thread-7", { organizationId: "org-9" });
		await reloadPersistedThreadHistory("thread-7", { organizationId: "org-9" });

		expect(getSpy).toHaveBeenNthCalledWith(1, "/chat/threads/thread-7", {
			"X-Organization-Id": "org-9",
		});
		expect(getSpy).toHaveBeenNthCalledWith(2, "/chat/threads/thread-7", {
			"X-Organization-Id": "org-9",
		});
	});

	it("calls rename endpoint with scoped org header", async () => {
		const patchSpy = mock(async () => ({
			id: "thread-9",
			title: "Renamed",
			lastMessagePreview: null,
			lastMessageAt: null,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		}));
		apiClient.patch = patchSpy as typeof apiClient.patch;

		await renameChatThread("thread-9", "Renamed", { organizationId: "org-9" });

		expect(patchSpy).toHaveBeenCalledWith(
			"/chat/threads/thread-9",
			{ title: "Renamed" },
			{ "X-Organization-Id": "org-9" },
		);
	});

	it("hydrates persisted attachment parts with HTTP download URL", async () => {
		const getSpy = mock(async () => ({
			id: "thread-7",
			title: "Título",
			lastMessagePreview: null,
			lastMessageAt: null,
			messages: [
				{
					id: "message-1",
					role: "user",
					contentText: "hola",
					status: "completed",
					createdAt: "2026-01-01T00:00:00.000Z",
					attachments: [
						{
							id: "attachment-1",
							messageId: "message-1",
							originalFilename: "sample.pdf",
							contentType: "application/pdf",
							sizeBytes: 123,
							createdAt: "2026-01-01T00:00:00.000Z",
						},
					],
				},
			],
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		const messages = await reloadPersistedThreadHistory("thread-7", {
			organizationId: "org-9",
		});

		expect(messages[0]?.parts[1]).toMatchObject({
			type: "file",
			url: buildChatAttachmentDownloadUrl("attachment-1"),
		});
	});

	it("downloads attachment blob through authenticated API client", async () => {
		const blob = new Blob(["payload"], { type: "application/pdf" });
		const downloadBlobSpy = mock(async () => blob);
		apiClient.downloadBlob = downloadBlobSpy as typeof apiClient.downloadBlob;

		const result = await downloadChatAttachment("attachment-7", {
			organizationId: "org-9",
		});

		expect(result).toBe(blob);
		expect(downloadBlobSpy).toHaveBeenCalledWith(
			"/chat/attachments/attachment-7/download",
			{
				headers: {
					"X-Organization-Id": "org-9",
				},
			},
		);
	});

	it("rehydrates AI PDF artifacts as custom data-pdf-artifact parts from artifactType", async () => {
		const getSpy = mock(async () => ({
			id: "thread-7",
			title: "Título",
			lastMessagePreview: null,
			lastMessageAt: null,
			messages: [
				{
					id: "message-1",
					role: "assistant",
					contentText: "Here is your brief",
					status: "completed",
					createdAt: "2026-01-01T00:00:00.000Z",
					attachments: [
						{
							id: "attachment-1",
							messageId: "message-1",
							originalFilename: "brief.pdf",
							contentType: "application/pdf",
							sizeBytes: 1234,
							createdAt: "2026-01-01T00:00:00.000Z",
							artifactType: "generateIdeationBrief",
						},
					],
				},
			],
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		const messages = await reloadPersistedThreadHistory("thread-7", {
			organizationId: "org-9",
		});

		const parts = messages[0]?.parts;
		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatchObject({
			type: "text",
			text: "Here is your brief",
		});
		expect(parts[1]).toMatchObject({
			type: "data-pdf-artifact",
			data: {
				artifactType: "generateIdeationBrief",
				output: {
					attachment_id: "attachment-1",
					filename: "brief.pdf",
					download_url: null,
					view_url: null,
					size_bytes: 1234,
				},
			},
		});
	});

	it("rehydrates generateAnalyticalRead artifacts as custom data-pdf-artifact parts", async () => {
		const getSpy = mock(async () => ({
			id: "thread-7",
			title: "Título",
			lastMessagePreview: null,
			lastMessageAt: null,
			messages: [
				{
					id: "message-1",
					role: "assistant",
					contentText: "Here is your read",
					status: "completed",
					createdAt: "2026-01-01T00:00:00.000Z",
					attachments: [
						{
							id: "attachment-2",
							messageId: "message-1",
							originalFilename: "read.pdf",
							contentType: "application/pdf",
							sizeBytes: 5678,
							createdAt: "2026-01-01T00:00:00.000Z",
							artifactType: "generateAnalyticalRead",
						},
					],
				},
			],
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		const messages = await reloadPersistedThreadHistory("thread-7", {
			organizationId: "org-9",
		});

		const parts = messages[0]?.parts;
		expect(parts).toHaveLength(2);
		expect(parts[1]).toMatchObject({
			type: "data-pdf-artifact",
			data: {
				artifactType: "generateAnalyticalRead",
				output: {
					attachment_id: "attachment-2",
					filename: "read.pdf",
					download_url: null,
					view_url: null,
					size_bytes: 5678,
				},
			},
		});
	});

	it("rehydrates generatePlaybook artifacts as custom data-pdf-artifact parts", async () => {
		const getSpy = mock(async () => ({
			id: "thread-7",
			title: "Título",
			lastMessagePreview: null,
			lastMessageAt: null,
			messages: [
				{
					id: "message-1",
					role: "assistant",
					contentText: "Here is your playbook",
					status: "completed",
					createdAt: "2026-01-01T00:00:00.000Z",
					attachments: [
						{
							id: "attachment-3",
							messageId: "message-1",
							originalFilename: "playbook.pdf",
							contentType: "application/pdf",
							sizeBytes: 9999,
							createdAt: "2026-01-01T00:00:00.000Z",
							artifactType: "generatePlaybook",
						},
					],
				},
			],
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		const messages = await reloadPersistedThreadHistory("thread-7", {
			organizationId: "org-9",
		});

		const parts = messages[0]?.parts;
		expect(parts).toHaveLength(2);
		expect(parts[1]).toMatchObject({
			type: "data-pdf-artifact",
			data: {
				artifactType: "generatePlaybook",
				output: {
					attachment_id: "attachment-3",
					filename: "playbook.pdf",
					download_url: null,
					view_url: null,
					size_bytes: 9999,
				},
			},
		});
	});

	it("rehydrates invalid artifactType as generic file parts", async () => {
		const getSpy = mock(async () => ({
			id: "thread-7",
			title: "Título",
			lastMessagePreview: null,
			lastMessageAt: null,
			messages: [
				{
					id: "message-1",
					role: "user",
					contentText: "hola",
					status: "completed",
					createdAt: "2026-01-01T00:00:00.000Z",
					attachments: [
						{
							id: "attachment-4",
							messageId: "message-1",
							originalFilename: "unknown.pdf",
							contentType: "application/pdf",
							sizeBytes: 111,
							createdAt: "2026-01-01T00:00:00.000Z",
							artifactType: "badArtifact",
						},
					],
				},
			],
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		const messages = await reloadPersistedThreadHistory("thread-7", {
			organizationId: "org-9",
		});

		expect(messages[0]?.parts[1]).toMatchObject({
			type: "file",
			filename: "unknown.pdf",
			mediaType: "application/pdf",
			url: buildChatAttachmentDownloadUrl("attachment-4"),
		});
	});

	it("rehydrates generic attachments without artifactType as file parts", async () => {
		const getSpy = mock(async () => ({
			id: "thread-7",
			title: "Título",
			lastMessagePreview: null,
			lastMessageAt: null,
			messages: [
				{
					id: "message-1",
					role: "user",
					contentText: "hola",
					status: "completed",
					createdAt: "2026-01-01T00:00:00.000Z",
					attachments: [
						{
							id: "attachment-1",
							messageId: "message-1",
							originalFilename: "sample.pdf",
							contentType: "application/pdf",
							sizeBytes: 123,
							createdAt: "2026-01-01T00:00:00.000Z",
							artifactType: null,
						},
					],
				},
			],
		}));
		apiClient.get = getSpy as typeof apiClient.get;

		const messages = await reloadPersistedThreadHistory("thread-7", {
			organizationId: "org-9",
		});

		expect(messages[0]?.parts[1]).toMatchObject({
			type: "file",
			filename: "sample.pdf",
			mediaType: "application/pdf",
			url: buildChatAttachmentDownloadUrl("attachment-1"),
		});
	});
});
