import { describe, expect, it, mock } from "bun:test";
import {
	resolveChatRouteState,
	shouldSyncRouteAfterThreadCreated,
	syncChatThreadUrlSilently,
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

	it("sincroniza URL con history.replaceState sin usar navegación del router", () => {
		const replaceState = mock(() => {});
		const currentState = { from: "chat-shell" };

		const didSync = syncChatThreadUrlSilently("thread-22", {
			history: { replaceState, state: currentState },
			location: {
				pathname: "/chat",
				search: "?panel=1",
				hash: "#messages",
			},
		});

		expect(didSync).toBe(true);
		expect(replaceState).toHaveBeenCalledWith(
			currentState,
			"",
			"/chat/thread-22?panel=1#messages",
		);
	});

	it("no agrega entradas de historial cuando la URL ya está canonicalizada", () => {
		const replaceState = mock(() => {});

		const didSync = syncChatThreadUrlSilently("thread-22", {
			history: { replaceState, state: { keep: true } },
			location: {
				pathname: "/chat/thread-22",
				search: "",
				hash: "",
			},
		});

		expect(didSync).toBe(false);
		expect(replaceState).not.toHaveBeenCalled();
	});
});
