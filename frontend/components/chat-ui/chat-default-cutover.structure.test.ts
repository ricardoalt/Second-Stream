import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Tests run from the frontend/ directory, so paths are relative to it
// (not to the monorepo root).
const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

// Make paths relative to the frontend/ working directory
const CHAT_SCREEN = "components/chat-ui/chat-screen.tsx";
const COMPOSER = "components/chat-ui/chat-prompt-composer.tsx";
const BARREL = "components/chat-ui/index.ts";

describe("chat default cutover structure", () => {
	it("uses official ai-elements imports for core primitives in main chat path", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);
		const composerSource = read(
			COMPOSER,
		);

		// Core AI Elements primitives MUST come from canonical path
		expect(chatScreenSource).toContain("@/components/ai-elements/conversation");
		expect(chatScreenSource).toContain("@/components/ai-elements/attachments");
		expect(chatScreenSource).toContain("@/components/ai-elements/message");
		expect(composerSource).toContain("@/components/ai-elements/prompt-input");

		// Visual structure checks
		expect(chatScreenSource).toContain("ConversationEmptyState");
		expect(chatScreenSource).toContain("<Attachments");
		expect(chatScreenSource).toContain('variant="list"');
	});

	it("uses local ai-elements for extras not in canonical package", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// These extras only exist locally, so local imports are correct
		expect(chatScreenSource).toContain("./ai-elements/reasoning");
		expect(chatScreenSource).toContain("./ai-elements/shimmer");
		expect(chatScreenSource).toContain("./ai-elements/sources");
		expect(chatScreenSource).toContain("./ai-elements/working-memory-update");
	});

	it("does NOT import core primitives from local copies", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// Core conversation/message/attachments/prompt-input MUST use canonical
		expect(chatScreenSource).not.toContain("./ai-elements/conversation");
		expect(chatScreenSource).not.toContain("./ai-elements/message");
		expect(chatScreenSource).not.toContain("./ai-elements/attachments");
		expect(chatScreenSource).not.toContain("./ai-elements/prompt-input");

		// No legacy send flow or lifecycle references
		expect(chatScreenSource).not.toContain(
			"Start a new chat by sending your first message",
		);
		expect(chatScreenSource).not.toContain("chat-send-flow");
		expect(chatScreenSource).not.toContain("ChatInterface");
	});

	it("adopts official ai-elements canonical part rendering pattern", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// Must use classifyMessagePart for part rendering
		expect(chatScreenSource).toContain("classifyMessagePart");

		// Must render reasoning, sources, tool invocations (not just text and file)
		expect(chatScreenSource).toContain('case "reasoning"');
		expect(chatScreenSource).toContain('case "source"');
		expect(chatScreenSource).toContain('case "tool-invocation"');

		// Must use Shimmer for thinking state (not raw text)
		expect(chatScreenSource).toContain("<Shimmer");
	});

	it("removes temporary bridge route from primary path", () => {
		expect(existsSync(join(ROOT, "app/chat/bridge/page.tsx"))).toBe(
			false,
		);
		expect(
			existsSync(
				join(ROOT, "components/chat-ui/chat-bridge-screen.tsx"),
			),
		).toBe(false);
	});

	it("removes legacy ChatInterface and send-flow from primary path", () => {
		// ChatInterface component is removed — no file, no barrel export
		expect(
			existsSync(join(ROOT, "components/chat-ui/chat-interface.tsx")),
		).toBe(false);
		expect(
			existsSync(
				join(ROOT, "components/chat-ui/chat-interface.test.ts"),
			),
		).toBe(false);

		// Legacy send-flow module is removed
		expect(existsSync(join(ROOT, "lib/chat-send-flow.ts"))).toBe(
			false,
		);
		expect(existsSync(join(ROOT, "lib/chat-send-flow.test.ts"))).toBe(
			false,
		);

		// Legacy chat-utils module with ChatInterface-only helpers is removed
		expect(existsSync(join(ROOT, "lib/chat-utils.ts"))).toBe(false);
		expect(existsSync(join(ROOT, "lib/chat-utils.test.ts"))).toBe(
			false,
		);

		// Legacy chat-attachment-utils module is removed
		expect(
			existsSync(join(ROOT, "lib/chat-attachment-utils.ts")),
		).toBe(false);
		expect(
			existsSync(join(ROOT, "lib/chat-attachment-utils.test.ts")),
		).toBe(false);

		// Barrel export must NOT reference ChatInterface
		const barrelSource = read(BARREL);
		expect(barrelSource).not.toContain("ChatInterface");
		expect(barrelSource).not.toContain("chat-interface");
		expect(barrelSource).not.toContain("chat-send-flow");
		expect(barrelSource).not.toContain("chat-utils");
		expect(barrelSource).not.toContain("chat-attachment-utils");
	});

	it("composer has no extraneous renderless sub-components after simplification", () => {
		const composerSource = read(
			COMPOSER,
		);

		// DraftSync and PromptComposerStateWatcher were inlined as useEffects
		expect(composerSource).not.toContain("DraftSync");
		expect(composerSource).not.toContain("PromptComposerStateWatcher");

		// submitChatPromptMessage was inlined into handleSubmit
		expect(composerSource).not.toContain("submitChatPromptMessage");
	});

it("composer calls provider-dependent hooks only inside PromptInputProvider context", () => {
		const composerSource = read(
			COMPOSER,
		);

		// The outer ChatPromptComposer must NOT call usePromptInputController
		// or usePromptInputAttachments directly — these require PromptInputProvider
		// context which is only available in the subtree, not at the top level.
		// This was the root cause of the runtime crash:
		//   "Wrap your component inside <PromptInputProvider> to use usePromptInputController()"

		// Extract ChatPromptComposer function body (from declaration to next function/EOF)
		const composerFnStart = composerSource.indexOf("export function ChatPromptComposer");
		expect(composerFnStart).toBeGreaterThan(-1);

		// Extract the outer component's full text — from its start to the first
		// occurrence of "function ChatPromptComposerInner" (whichever comes first)
		// or to the end of file if inner doesn't exist (pre-fix state).
		const innerFnStart = composerSource.indexOf("function ChatPromptComposerInner");

		let composerFnBody: string;
		if (innerFnStart > -1 && innerFnStart < composerFnStart) {
			// Inner is defined BEFORE outer — outer extends to end of file
			composerFnBody = composerSource.slice(composerFnStart);
		} else if (innerFnStart > -1) {
			// Inner is defined AFTER outer — outer extends to inner start
			composerFnBody = composerSource.slice(composerFnStart, innerFnStart);
		} else {
			// No inner component (pre-fix state)
			composerFnBody = composerSource.slice(composerFnStart);
		}

		// ChatPromptComposer must NOT use provider-dependent hooks at its own level.
		// They belong in ChatPromptComposerInner (rendered inside PromptInputProvider).
		expect(composerFnBody).not.toContain("usePromptInputController()");
		expect(composerFnBody).not.toContain("usePromptInputAttachments()");

		// ChatPromptComposer must render PromptInputProvider wrapping an inner component
		expect(composerFnBody).toContain("<PromptInputProvider");
		expect(composerFnBody).toContain("ChatPromptComposerInner");
	});

	it("composer inner component uses provider hooks correctly inside PromptInputProvider", () => {
		const composerSource = read(
			COMPOSER,
		);

		// The inner component (ChatPromptComposerInner) is the one that
		// should call usePromptInputController and usePromptInputAttachments
		const innerFnStart = composerSource.indexOf("function ChatPromptComposerInner");
		expect(innerFnStart).toBeGreaterThan(-1);

		const innerFnBody = composerSource.slice(innerFnStart);

		// ChatPromptComposerInner MUST use the provider hooks
		expect(innerFnBody).toContain("usePromptInputController()");
		expect(innerFnBody).toContain("usePromptInputAttachments()");
	});

	it("composer outer component passes draft and interaction state to inner component", () => {
		const composerSource = read(
			COMPOSER,
		);

		const composerFnStart = composerSource.indexOf("export function ChatPromptComposer");
		expect(composerFnStart).toBeGreaterThan(-1);

		const composerFnBody = composerSource.slice(composerFnStart);

		// Outer component must pass draft state wiring to inner
		expect(composerFnBody).toContain("draftSetText");
		expect(composerFnBody).toContain("didUserInteractRef");

		// Outer component must render the provider with initial input
		expect(composerFnBody).toContain("initialInput={draft.initialText}");
	});

	it("composer inner component clears input immediately on submit before async work", () => {
		const composerSource = read(
			COMPOSER,
		);

		const innerFnStart = composerSource.indexOf("function ChatPromptComposerInner");
		expect(innerFnStart).toBeGreaterThan(-1);

		const innerFnBody = composerSource.slice(innerFnStart);

		// Inner must call clear() on both text and attachments
		// BEFORE awaiting onSubmitMessage
		expect(innerFnBody).toContain("textInput.clear()");
		expect(innerFnBody).toContain("attachments.clear()");
	});

	it("chat screen uses optimistic message for immediate first-send display", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// Must export the new pure functions
		expect(chatScreenSource).toContain("buildOptimisticUserMessage");
		expect(chatScreenSource).toContain("resolveVisibleMessages");

		// Must use optimisticUserMessage state
		expect(chatScreenSource).toContain("optimisticUserMessage");

		// Must use Conversation layout for conversation state
		expect(chatScreenSource).toContain("<Conversation");
	});

	it("chat screen has AnimatePresence transition between empty and conversation states", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// Must use AnimatePresence for empty→conversation transition
		expect(chatScreenSource).toContain("AnimatePresence");
		expect(chatScreenSource).toContain("motion.div");

		// Must have key-based switching between empty and conversation
		expect(chatScreenSource).toContain('key="empty"');
		expect(chatScreenSource).toContain('key="conversation"');
	});

	it("chat screen uses shouldShowLoadingShimmer for thinking indicator", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// Must use shouldShowLoadingShimmer (smarter than bare status check)
		expect(chatScreenSource).toContain("shouldShowLoadingShimmer");
		expect(chatScreenSource).toContain("export function shouldShowLoadingShimmer");

		// Must NOT use the old shouldShowMainChatThinking
		expect(chatScreenSource).not.toContain("shouldShowMainChatThinking");
	});

	it("chat screen uses isEmptyState for landing/conversation switch", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// isEmptyState is computed inline in the component
		expect(chatScreenSource).toContain("isEmptyState");
	});

	it("first-turn stream continuity: useChat uses stable session key, not activeThreadId", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// useChat.id must use chatSessionKey, NOT activeThreadId
		// (activeThreadId changes on thread creation, which re-keys useChat)
		expect(chatScreenSource).toContain("id: chatSessionKey");
		expect(chatScreenSource).not.toContain("id: `main-chat-${activeThreadId}`");
		expect(chatScreenSource).not.toContain("id: `main-chat-${activeThreadIdRef.current}`");

		// Must export resolveChatSessionKey for testing
		expect(chatScreenSource).toContain("export function resolveChatSessionKey");

		// Must have chatSessionKey state initialized from routeState
		expect(chatScreenSource).toContain("resolveChatSessionKey(routeState)");
	});

	it("first-turn stream continuity: history reload skips during active streams and when messages exist", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// Must use shouldSkipHistoryReload to guard the history effect
		expect(chatScreenSource).toContain("shouldSkipHistoryReload");
		expect(chatScreenSource).toContain("hasMessages: messages.length > 0");
		expect(chatScreenSource).toContain("hasHistoryError: historyError !== null");
		expect(chatScreenSource).toContain("chatStatus: status");

		// Must export shouldSkipHistoryReload for testing
		expect(chatScreenSource).toContain("export function shouldSkipHistoryReload");

		// Must have firstTurnThreadIdRef for first-turn tracking
		expect(chatScreenSource).toContain("firstTurnThreadIdRef");
	});

	it("first-turn stream continuity: URL update uses replaceState only, no router.replace", () => {
		const chatScreenSource = read(
			CHAT_SCREEN,
		);

		// onThreadCreated must use window.history.replaceState (not router.replace)
		// for immediate URL update without server re-render
		expect(chatScreenSource).toContain("window.history.replaceState");
		expect(chatScreenSource).toContain("buildChatThreadUrl(threadId)");

		// Must NOT call router.replace inside onThreadCreated
		const onThreadCreatedBlock = extractFunctionBlock(chatScreenSource, "onThreadCreated:");
		expect(onThreadCreatedBlock).not.toContain("router.replace");

		// Must NOT have router.replace in the file (removed to prevent
		// server re-render that re-keys useChat and destroys the stream)
		expect(chatScreenSource).not.toContain("router.replace(buildChatThreadUrl");
		expect(chatScreenSource).not.toContain("import { useRouter }");
	});
});

function extractFunctionBlock(source: string, startMarker: string): string {
	const startIndex = source.indexOf(startMarker);
	if (startIndex === -1) return "";

	const braceStart = source.indexOf("{", startIndex);
	if (braceStart === -1) return "";

	let depth = 0;
	let i = braceStart;
	while (i < source.length) {
		if (source[i] === "{") depth++;
		if (source[i] === "}") depth--;
		if (depth === 0) return source.slice(braceStart, i + 1);
		i++;
	}

	return source.slice(braceStart);
}
