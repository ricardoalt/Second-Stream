import { describe, expect, it } from "bun:test";
import {
	resolveChatRouteState,
	shouldSyncRouteAfterThreadCreated,
} from "@/lib/chat-runtime/page-client-state";

describe("chat-page-client route boundary", () => {
	it("usa thread local cuando la ruta es /chat", () => {
		expect(resolveChatRouteState(null, "local-1")).toEqual({
			threadId: "local-1",
			shouldLoadPersistedHistory: false,
		});
	});

	it("usa thread persistido cuando la ruta es /chat/[threadId]", () => {
		expect(resolveChatRouteState("thread-10", "local-1")).toEqual({
			threadId: "thread-10",
			shouldLoadPersistedHistory: true,
		});
	});

	it("no recarga historial cuando la ruta se canonicaliza al mismo thread local", () => {
		expect(resolveChatRouteState("local-1", "local-1")).toEqual({
			threadId: "local-1",
			shouldLoadPersistedHistory: false,
		});
	});
});

describe("chat-page-client URL sync", () => {
	it("no sincroniza URL antes de confirmación backend en ruta persistida", () => {
		expect(
			shouldSyncRouteAfterThreadCreated({
				routeThreadId: "thread-1",
				runtimeThreadId: "thread-1",
				createdThreadId: "thread-1",
			}),
		).toBe(false);
	});

	it("sincroniza URL cuando backend confirma nuevo thread del runtime actual", () => {
		expect(
			shouldSyncRouteAfterThreadCreated({
				routeThreadId: null,
				runtimeThreadId: "runtime-1",
				createdThreadId: "runtime-1",
			}),
		).toBe(true);
	});

	it("ignora eventos de thread distinto", () => {
		expect(
			shouldSyncRouteAfterThreadCreated({
				routeThreadId: null,
				runtimeThreadId: "runtime-1",
				createdThreadId: "runtime-2",
			}),
		).toBe(false);
	});
});
