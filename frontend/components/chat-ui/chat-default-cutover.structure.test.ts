import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

const CHAT_SCREEN = "components/chat-ui/chat-screen.tsx";
const MESSAGE_PARTS = "components/chat-ui/message-parts.tsx";
const COMPOSER = "components/chat-ui/chat-prompt-composer.tsx";
const BARREL = "components/chat-ui/index.ts";

describe("chat default cutover structure", () => {
	it("uses official ai-elements imports for core primitives in main chat path", () => {
		const chatScreenSource = read(CHAT_SCREEN);
		const messagePartsSource = read(MESSAGE_PARTS);
		const composerSource = read(COMPOSER);

		// Chat screen delegates to Conversation from ai-elements
		expect(chatScreenSource).toContain("@/components/ai-elements/conversation");
		// Message parts uses attachments and message from ai-elements
		expect(messagePartsSource).toContain(
			"@/components/ai-elements/attachments",
		);
		expect(messagePartsSource).toContain("@/components/ai-elements/message");
		expect(composerSource).toContain("@/components/ai-elements/prompt-input");

		// Chat screen uses Conversation and ConversationContent (ConversationEmptyState removed — not needed)
		expect(chatScreenSource).toContain("ConversationContent");
		expect(messagePartsSource).toContain("<Attachments");
		expect(messagePartsSource).toContain('variant="list"');
	});

	it("uses local ai-elements for extras not in canonical package", () => {
		const messagePartsSource = read(MESSAGE_PARTS);

		expect(messagePartsSource).toContain("./ai-elements/reasoning");
		expect(messagePartsSource).toContain("./ai-elements/shimmer");
		expect(messagePartsSource).toContain("./ai-elements/sources");
		expect(messagePartsSource).toContain("./ai-elements/working-memory-update");
	});

	it("does NOT import core primitives from local copies", () => {
		const chatScreenSource = read(CHAT_SCREEN);
		const messagePartsSource = read(MESSAGE_PARTS);

		expect(chatScreenSource).not.toContain("./ai-elements/conversation");
		expect(messagePartsSource).not.toContain("./ai-elements/message");
		expect(messagePartsSource).not.toContain("./ai-elements/attachments");
		expect(chatScreenSource).not.toContain("./ai-elements/prompt-input");

		expect(chatScreenSource).not.toContain("chat-send-flow");
		expect(chatScreenSource).not.toContain("ChatInterface");
	});

	it("adopts official ai-elements canonical part rendering pattern", () => {
		const messagePartsSource = read(MESSAGE_PARTS);
		const chatUtilsSource = read("lib/chat-runtime/chat-utils.ts");

		// classifyMessagePart is extracted to chat-utils (pure function)
		expect(chatUtilsSource).toContain("classifyMessagePart");

		// MessageParts component uses the canonical part classification
		expect(messagePartsSource).toContain("classifyMessagePart");
		expect(messagePartsSource).toContain('case "reasoning"');
		expect(messagePartsSource).toContain('case "source"');
		expect(messagePartsSource).toContain('case "tool-invocation"');
		expect(messagePartsSource).toContain("<Shimmer");
	});

	it("removes temporary bridge route from primary path", () => {
		expect(existsSync(join(ROOT, "app/chat/bridge/page.tsx"))).toBe(false);
		expect(
			existsSync(join(ROOT, "components/chat-ui/chat-bridge-screen.tsx")),
		).toBe(false);
	});

	it("removes legacy ChatInterface and send-flow from primary path", () => {
		expect(
			existsSync(join(ROOT, "components/chat-ui/chat-interface.tsx")),
		).toBe(false);
		expect(
			existsSync(join(ROOT, "components/chat-ui/chat-interface.test.ts")),
		).toBe(false);
		expect(existsSync(join(ROOT, "lib/chat-send-flow.ts"))).toBe(false);
		expect(existsSync(join(ROOT, "lib/chat-send-flow.test.ts"))).toBe(false);
		expect(existsSync(join(ROOT, "lib/chat-utils.ts"))).toBe(false);
		expect(existsSync(join(ROOT, "lib/chat-utils.test.ts"))).toBe(false);
		expect(existsSync(join(ROOT, "lib/chat-attachment-utils.ts"))).toBe(false);
		expect(existsSync(join(ROOT, "lib/chat-attachment-utils.test.ts"))).toBe(
			false,
		);

		const barrelSource = read(BARREL);
		expect(barrelSource).not.toContain("ChatInterface");
		expect(barrelSource).not.toContain("chat-interface");
		expect(barrelSource).not.toContain("chat-send-flow");
		expect(barrelSource).not.toContain("chat-utils");
		expect(barrelSource).not.toContain("chat-attachment-utils");
	});

	it("does not use mutable routeState, chatSessionKey, or legacy lifecycle refs", () => {
		const chatScreenSource = read(CHAT_SCREEN);

		// ChatScreen now receives simple props: threadId, initialMessages, loadHistory
		expect(chatScreenSource).toContain("ChatScreenProps");
		expect(chatScreenSource).toContain("threadId:");
		expect(chatScreenSource).toContain("initialMessages:");
		expect(chatScreenSource).toContain("loadHistory:");

		// No mutable routeState, chatSessionKey, firstTurnThreadIdRef, or shouldSkipHistoryReload
		expect(chatScreenSource).not.toContain("chatSessionKey");
		expect(chatScreenSource).not.toContain("firstTurnThreadIdRef");
		expect(chatScreenSource).not.toContain("optimisticUserMessage");
		expect(chatScreenSource).not.toContain("shouldSkipHistoryReload");
		expect(chatScreenSource).not.toContain("activeThreadIdRef");
		expect(chatScreenSource).not.toContain("pendingAttachmentIdsRef");
		expect(chatScreenSource).not.toContain("isPreparingSubmit");
		expect(chatScreenSource).not.toContain("ResolveChatRouteState");
		expect(chatScreenSource).not.toContain("routeState");
	});

	it("uses stable threadId and useChat with onData for thread creation events", () => {
		const chatScreenSource = read(CHAT_SCREEN);

		// useChat receives id: threadId (stable, not a mutable key)
		expect(chatScreenSource).toContain("id: threadId");
		expect(chatScreenSource).not.toContain("id: chatSessionKey");

		// onData handler for data-new-thread-created
		expect(chatScreenSource).toContain("onData");
		expect(chatScreenSource).toContain("data-new-thread-created");

		// Sidebar update via React Query setQueryData
		expect(chatScreenSource).toContain("CHAT_THREADS_QUERY_KEY");
		expect(chatScreenSource).toContain("setQueryData");

		// onFinish invalidates thread list
		expect(chatScreenSource).toContain("onFinish");
		expect(chatScreenSource).toContain("invalidateQueries");
	});

	it("keeps ChatScreen free of router lifecycle and syncs URL in page client", () => {
		const chatScreenSource = read(CHAT_SCREEN);
		const pageClientSource = read("app/chat/chat-page-client.tsx");

		// ChatScreen should not own router URL synchronization because
		// it can cause lifecycle coupling with useChat.
		expect(chatScreenSource).not.toContain("router.replace");
		expect(chatScreenSource).not.toContain("useRouter");

		// Transport must be memoized so the inevitable re-render after
		// URL sync doesn't reset useChat mid-stream.
		expect(chatScreenSource).toContain("useMemo");
		expect(chatScreenSource).toContain("[threadId]");

		// URL sync is owned by ChatPageClient.
		expect(pageClientSource).toContain("router.replace");
		expect(pageClientSource).toContain("buildChatThreadUrl");
	});

	it("uses canonical CHAT_THREADS_QUERY_KEY from lib/api/chat", () => {
		const sidebarSource = read("components/chat-ui/app-sidebar.tsx");
		const chatApiSource = read("lib/api/chat.ts");

		expect(chatApiSource).toContain("CHAT_THREADS_QUERY_KEY");
		expect(sidebarSource).toContain("CHAT_THREADS_QUERY_KEY");
		expect(sidebarSource).toContain("useQuery");
	});

	it("page.tsx uses crypto.randomUUID for new thread IDs", () => {
		const pageClientSource = read("app/chat/chat-page-client.tsx");
		const pageSource = read("app/chat/page.tsx");

		expect(pageClientSource).toContain("crypto.randomUUID");
		expect(pageClientSource).toContain("ChatPageClient");
		expect(pageClientSource).toContain("loadHistory");
		expect(pageClientSource).toContain("initialThreadId");
		expect(pageSource).not.toContain('key={initialThreadId ?? "new"}');
	});

	it("routing.ts only exports buildChatThreadUrl (no ChatRouteState)", () => {
		const routingSource = read("lib/chat-runtime/routing.ts");

		expect(routingSource).toContain("buildChatThreadUrl");
		expect(routingSource).not.toContain("ChatRouteState");
		expect(routingSource).not.toContain("resolveChatRouteState");
	});

	it("lib/api/chat.ts does NOT contain legacy SSE functions or createChatThread", () => {
		const chatApiSource = read("lib/api/chat.ts");

		expect(chatApiSource).not.toContain("streamPersistedChatTurn");
		expect(chatApiSource).not.toContain("parseChatSSEBuffer");
		expect(chatApiSource).not.toContain("createChatThread");
		expect(chatApiSource).not.toContain("ChatStreamEvent");
		expect(chatApiSource).not.toContain("parseOfficialDataEvent");
	});

	it("transport.ts does NOT use getThreadId or getAttachmentIds refs", () => {
		const transportSource = read("lib/chat-bridge/transport.ts");

		expect(transportSource).not.toContain("getThreadId");
		expect(transportSource).not.toContain("getAttachmentIds");
	});

	it("chat-utils provides pure classification and utility functions", () => {
		const chatUtilsSource = read("lib/chat-runtime/chat-utils.ts");

		expect(chatUtilsSource).toContain("canSubmitPromptMessage");
		expect(chatUtilsSource).toContain("shouldShowLoadingShimmer");
		expect(chatUtilsSource).toContain("classifyMessagePart");
		expect(chatUtilsSource).toContain("extractToolName");
		expect(chatUtilsSource).toContain("ClassifiedPart");
	});
});
