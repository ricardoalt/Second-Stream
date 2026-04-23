import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
	buildChatThreadHistoryQueryKey,
	buildChatThreadsQueryKey,
} from "@/lib/chat-runtime/query-keys";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const { apiClient } = await import("@/lib/api/client");
const { fetchChatThreadDetail, listChatThreads, reloadPersistedThreadHistory } =
	await import("@/lib/api/chat");

const originalGet = apiClient.get;

describe("chat threads query key", () => {
	beforeEach(() => {
		apiClient.get = originalGet;
	});

	afterEach(() => {
		apiClient.get = originalGet;
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
});
