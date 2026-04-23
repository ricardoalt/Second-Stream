import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("chat default cutover structure", () => {
	it("uses official ai-elements imports for core primitives in main chat path", () => {
		const chatScreenSource = read(
			"frontend/components/chat-ui/chat-screen.tsx",
		);
		const composerSource = read(
			"frontend/components/chat-ui/chat-prompt-composer.tsx",
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
			"frontend/components/chat-ui/chat-screen.tsx",
		);

		// These extras only exist locally, so local imports are correct
		expect(chatScreenSource).toContain("./ai-elements/reasoning");
		expect(chatScreenSource).toContain("./ai-elements/shimmer");
		expect(chatScreenSource).toContain("./ai-elements/sources");
		expect(chatScreenSource).toContain("./ai-elements/working-memory-update");
	});

	it("does NOT import core primitives from local copies", () => {
		const chatScreenSource = read(
			"frontend/components/chat-ui/chat-screen.tsx",
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
			"frontend/components/chat-ui/chat-screen.tsx",
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
		expect(existsSync(join(ROOT, "frontend/app/chat/bridge/page.tsx"))).toBe(
			false,
		);
		expect(
			existsSync(
				join(ROOT, "frontend/components/chat-ui/chat-bridge-screen.tsx"),
			),
		).toBe(false);
	});

	it("removes legacy ChatInterface and send-flow from primary path", () => {
		// ChatInterface component is removed — no file, no barrel export
		expect(
			existsSync(join(ROOT, "frontend/components/chat-ui/chat-interface.tsx")),
		).toBe(false);
		expect(
			existsSync(
				join(ROOT, "frontend/components/chat-ui/chat-interface.test.ts"),
			),
		).toBe(false);

		// Legacy send-flow module is removed
		expect(existsSync(join(ROOT, "frontend/lib/chat-send-flow.ts"))).toBe(
			false,
		);
		expect(existsSync(join(ROOT, "frontend/lib/chat-send-flow.test.ts"))).toBe(
			false,
		);

		// Legacy chat-utils module with ChatInterface-only helpers is removed
		expect(existsSync(join(ROOT, "frontend/lib/chat-utils.ts"))).toBe(false);
		expect(existsSync(join(ROOT, "frontend/lib/chat-utils.test.ts"))).toBe(
			false,
		);

		// Legacy chat-attachment-utils module is removed
		expect(
			existsSync(join(ROOT, "frontend/lib/chat-attachment-utils.ts")),
		).toBe(false);
		expect(
			existsSync(join(ROOT, "frontend/lib/chat-attachment-utils.test.ts")),
		).toBe(false);

		// Barrel export must NOT reference ChatInterface
		const barrelSource = read("frontend/components/chat-ui/index.ts");
		expect(barrelSource).not.toContain("ChatInterface");
		expect(barrelSource).not.toContain("chat-interface");
		expect(barrelSource).not.toContain("chat-send-flow");
		expect(barrelSource).not.toContain("chat-utils");
		expect(barrelSource).not.toContain("chat-attachment-utils");
	});

	it("composer has no extraneous renderless sub-components after simplification", () => {
		const composerSource = read(
			"frontend/components/chat-ui/chat-prompt-composer.tsx",
		);

		// DraftSync and PromptComposerStateWatcher were inlined as useEffects
		expect(composerSource).not.toContain("DraftSync");
		expect(composerSource).not.toContain("PromptComposerStateWatcher");

		// submitChatPromptMessage was inlined into handleSubmit
		expect(composerSource).not.toContain("submitChatPromptMessage");
	});

it("composer calls provider-dependent hooks only inside PromptInputProvider context", () => {
		const composerSource = read(
			"frontend/components/chat-ui/chat-prompt-composer.tsx",
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
			"frontend/components/chat-ui/chat-prompt-composer.tsx",
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
			"frontend/components/chat-ui/chat-prompt-composer.tsx",
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
			"frontend/components/chat-ui/chat-prompt-composer.tsx",
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
			"frontend/components/chat-ui/chat-screen.tsx",
		);

		// Must export the new pure functions
		expect(chatScreenSource).toContain("buildOptimisticUserMessage");
		expect(chatScreenSource).toContain("resolveVisibleMessages");

		// Must use optimisticUserMessage state
		expect(chatScreenSource).toContain("optimisticUserMessage");

		// Must use Conversation layout for both empty and conversation states
		// (unified layout — composer always at bottom)
		expect(chatScreenSource).toContain("<Conversation");
	});

	it("chat screen has unified layout with composer in both states", () => {
		const chatScreenSource = read(
			"frontend/components/chat-ui/chat-screen.tsx",
		);

		// Both empty state and conversation state should use <Conversation>
		// The composer should appear in both states at the bottom
		const conversationTagCount = chatScreenSource.match(/<Conversation[^>]/g)?.length ?? 0;
		expect(conversationTagCount).toBeGreaterThanOrEqual(1);

		// ConversationEmptyState should be inside the layout (not a separate branch)
		expect(chatScreenSource).toContain("ConversationEmptyState");
	});
});
