import { describe, expect, it, mock } from "bun:test";
import type { ChatStatus } from "ai";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

async function loadChatScreenModule() {
	return import("./chat-screen");
}

describe("main chat screen behavior", () => {
	it("shows landing state only for brand-new chats without history", async () => {
		const { shouldShowMainChatLandingState } = await loadChatScreenModule();

		expect(
			shouldShowMainChatLandingState({
				routeMode: "new",
				messagesCount: 0,
				historyLoading: false,
			}),
		).toBe(true);

		expect(
			shouldShowMainChatLandingState({
				routeMode: "new",
				messagesCount: 0,
				historyLoading: true,
			}),
		).toBe(false);

		expect(
			shouldShowMainChatLandingState({
				routeMode: "existing",
				messagesCount: 0,
				historyLoading: false,
			}),
		).toBe(false);
	});

	it("resolves first-turn feedback label before streaming starts", async () => {
		const { resolveMainChatSubmitFeedbackLabel } = await loadChatScreenModule();

		expect(
			resolveMainChatSubmitFeedbackLabel({
				routeMode: "new",
				messagesCount: 0,
				status: "ready",
				isPreparingSubmit: true,
			}),
		).toBe("Creating your chat...");

		expect(
			resolveMainChatSubmitFeedbackLabel({
				routeMode: "new",
				messagesCount: 0,
				status: "submitted",
				isPreparingSubmit: false,
			}),
		).toBe("Sending your first message...");

		expect(
			resolveMainChatSubmitFeedbackLabel({
				routeMode: "existing",
				messagesCount: 2,
				status: "ready",
				isPreparingSubmit: false,
			}),
		).toBe(null);
	});

	it("uses only existing threads for transport/hydration", async () => {
		const { canUseMainChatTransport } = await loadChatScreenModule();

		expect(canUseMainChatTransport("thread-1")).toBe(true);
		expect(canUseMainChatTransport("new")).toBe(false);
		expect(canUseMainChatTransport("")).toBe(false);
	});

	it("submits text turns through AI SDK sendMessage", async () => {
		const { submitMainChatTurn } = await loadChatScreenModule();
		const sendMessage = mock(async () => undefined);
		const createThread = mock(async () => ({ id: "thread-created" }));
		const onThreadCreated = mock(() => undefined);

		await submitMainChatTurn({
			routeMode: "existing",
			currentThreadId: "thread-1",
			message: { text: "hola" },
			sendMessage,
			createThread,
			onThreadCreated,
			onAccepted: () => {},
		});

		expect(sendMessage).toHaveBeenCalledWith({ text: "hola" });
		expect(createThread).toHaveBeenCalledTimes(0);
		expect(onThreadCreated).toHaveBeenCalledTimes(0);
	});

	it("creates a thread on first turn before sending in new mode", async () => {
		const { submitMainChatTurn } = await loadChatScreenModule();
		const sendMessage = mock(async () => undefined);
		const createThread = mock(async () => ({ id: "thread-new-1" }));
		const onThreadCreated = mock(() => undefined);

		const result = await submitMainChatTurn({
			routeMode: "new",
			currentThreadId: "new",
			message: { text: "  First turn text  " },
			sendMessage,
			createThread,
			onThreadCreated,
			onAccepted: () => {},
		});

		expect(createThread).toHaveBeenCalledWith("First turn text");
		expect(onThreadCreated).toHaveBeenCalledWith("thread-new-1");
		expect(sendMessage).toHaveBeenCalledWith({ text: "First turn text" });
		expect(result).toEqual({ threadId: "thread-new-1" });
	});

	it("rejects submit when route mode is unavailable", async () => {
		const { submitMainChatTurn } = await loadChatScreenModule();

		await expect(
			submitMainChatTurn({
				routeMode: "unavailable",
				currentThreadId: "",
				message: { text: "hola" },
				sendMessage: async () => undefined,
				createThread: async () => ({ id: "thread-wont-be-used" }),
				onThreadCreated: () => {},
				onAccepted: () => {},
			}),
		).rejects.toThrow("Thread unavailable");
	});

	it("rejects attachment submits when upload boundary is missing", async () => {
		const { submitMainChatTurn } = await loadChatScreenModule();
		const createThread = mock(async () => ({ id: "thread-created" }));

		await expect(
			submitMainChatTurn({
				routeMode: "existing",
				currentThreadId: "thread-1",
				message: {
					text: "hola",
					files: [
						{
							type: "file",
							filename: "doc.pdf",
							mediaType: "application/pdf",
							url: "data:application/pdf;base64,QQ==",
						},
					],
				},
				sendMessage: async () => undefined,
				createThread,
				onThreadCreated: () => {},
				onAccepted: () => {},
			}),
		).rejects.toThrow("Attachment upload is not configured");

		expect(createThread).toHaveBeenCalledTimes(0);
	});

	it("uploads attachments before sending and exposes ids to transport boundary", async () => {
		const { submitMainChatTurn } = await loadChatScreenModule();
		const sendMessage = mock(async () => undefined);
		const uploadAttachment = mock(
			async (file: File) => `uploaded-${file.name.replace(".", "-")}`,
		);
		const onAttachmentsPrepared = mock(() => undefined);

		await submitMainChatTurn({
			routeMode: "existing",
			currentThreadId: "thread-1",
			message: {
				text: "send with files",
				files: [
					{
						type: "file",
						filename: "doc.pdf",
						mediaType: "application/pdf",
						url: "attachment://local-1",
					},
					{
						type: "file",
						filename: "notes.txt",
						mediaType: "text/plain",
						url: "attachment://local-2",
					},
				],
			},
			sendMessage,
			createThread: async () => ({ id: "thread-created" }),
			uploadAttachment,
			resolveUploadFile: async (part) =>
				new File(["payload"], part.filename ?? "unknown.bin", {
					type: part.mediaType ?? "application/octet-stream",
				}),
			onAttachmentsPrepared,
			onThreadCreated: () => {},
			onAccepted: () => {},
		});

		expect(uploadAttachment).toHaveBeenCalledTimes(2);
		expect(onAttachmentsPrepared).toHaveBeenCalledWith([
			"uploaded-doc-pdf",
			"uploaded-notes-txt",
		]);
		expect(sendMessage).toHaveBeenCalledWith({ text: "send with files" });
	});

	it("converts data-url attachment parts into uploadable files", async () => {
		const { resolveUploadFileFromPromptPart } = await loadChatScreenModule();

		const file = await resolveUploadFileFromPromptPart({
			type: "file",
			filename: "hello.txt",
			mediaType: "text/plain",
			url: "data:text/plain;base64,aGVsbG8=",
		});

		expect(file.name).toBe("hello.txt");
		expect(file.type.startsWith("text/plain")).toBe(true);
		expect(await file.text()).toBe("hello");
	});

	it("drives thinking state from AI SDK status", async () => {
		const { shouldShowMainChatThinking } = await loadChatScreenModule();

		const statuses: ChatStatus[] = ["ready", "submitted", "streaming", "error"];

		expect(shouldShowMainChatThinking(statuses[0])).toBe(false);
		expect(shouldShowMainChatThinking(statuses[1])).toBe(true);
		expect(shouldShowMainChatThinking(statuses[2])).toBe(true);
		expect(shouldShowMainChatThinking(statuses[3])).toBe(false);
	});

	it("builds optimistic user message for immediate display", async () => {
		const { buildOptimisticUserMessage } = await loadChatScreenModule();

		const message = buildOptimisticUserMessage("Hello, how are you?");
		expect(message.role).toBe("user");
		expect(message.parts).toEqual([
			{ type: "text", text: "Hello, how are you?" },
		]);
		expect(message.id).toBeTruthy();
		expect(message.id.startsWith("optimistic-")).toBe(true);
	});

	it("builds optimistic user message with trimmed text", async () => {
		const { buildOptimisticUserMessage } = await loadChatScreenModule();

		const message = buildOptimisticUserMessage("  spaced text  ");
		expect(message.parts).toEqual([{ type: "text", text: "spaced text" }]);
	});

	it("merges optimistic message with chat messages for display", async () => {
		const { resolveVisibleMessages } = await loadChatScreenModule();

		const chatMessages = [
			{ id: "msg-1", role: "user" as const, parts: [{ type: "text" as const, text: "first" }] },
			{ id: "msg-2", role: "assistant" as const, parts: [{ type: "text" as const, text: "response" }] },
		];

		// When optimistic message is present, it appears last
		const optimistic = { id: "optimistic-user-1", role: "user" as const, parts: [{ type: "text" as const, text: "second question" }] };
		const result = resolveVisibleMessages(chatMessages, optimistic);
		expect(result).toHaveLength(3);
		expect(result[2]).toBe(optimistic);
	});

	it("returns chat messages unchanged when no optimistic message", async () => {
		const { resolveVisibleMessages } = await loadChatScreenModule();

		const chatMessages = [
			{ id: "msg-1", role: "user" as const, parts: [{ type: "text" as const, text: "hello" }] },
		];

		const result = resolveVisibleMessages(chatMessages, null);
		expect(result).toEqual(chatMessages);
	});

	it("does not duplicate optimistic message when chat already has a user message with matching content", async () => {
		const { resolveVisibleMessages, buildOptimisticUserMessage } = await loadChatScreenModule();

		const optimistic = buildOptimisticUserMessage("my question");
		const chatMessages = [
			{ id: "real-msg-1", role: "user" as const, parts: [{ type: "text" as const, text: "my question" }] },
		];

		// When chat already has the message (e.g., sendMessage completed),
		// the optimistic message should NOT be appended
		const result = resolveVisibleMessages(chatMessages, optimistic);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("real-msg-1");
	});

	it("does not merge optimistic when chat messages already cover the content", async () => {
		const { resolveVisibleMessages, buildOptimisticUserMessage } = await loadChatScreenModule();

		const optimistic = buildOptimisticUserMessage("question");
		// Simulate: useChat has now populated messages that include the optimistic msg's content
		const chatMessages = [
			{ id: "real-msg-1", role: "user" as const, parts: [{ type: "text" as const, text: "question" }] },
			{ id: "real-msg-2", role: "assistant" as const, parts: [{ type: "text" as const, text: "answer" }] },
		];

		const result = resolveVisibleMessages(chatMessages, optimistic);
		expect(result).toHaveLength(2);
	});
});