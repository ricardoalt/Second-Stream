process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { MyUIMessage } from "@/types/ui-message";

const { MessagePartsRenderer } = await import(
	"@/components/chat-ui/message-parts-renderer"
);

describe("MessagePartsRenderer", () => {
	it("renders data-pdf-artifact parts with PdfDocumentCard UI", () => {
		const message = {
			id: "msg-1",
			role: "assistant",
			content: "Here is your brief",
			parts: [
				{ type: "text" as const, text: "Here is your brief" },
				{
					type: "data-pdf-artifact" as const,
					data: {
						artifactType: "generateIdeationBrief" as const,
						output: {
							attachment_id: "att-1",
							filename: "brief.pdf",
							download_url: null,
							view_url: null,
							size_bytes: 1_234_567,
						},
					},
				},
			],
			createdAt: "2026-01-01T00:00:00.000Z",
		} as MyUIMessage;

		const markup = renderToStaticMarkup(
			<MessagePartsRenderer
				message={message}
				isLastMessage={false}
				isStreamingOrSubmitted={false}
				messages={[message]}
				setMessages={() => {}}
				regenerate={() => {}}
			/>,
		);

		expect(markup).toContain("Ideation Brief");
		expect(markup).toContain("brief.pdf");
		expect(markup).toContain("1.2 MB");
		expect(markup).toContain("View");
		expect(markup).toContain("Download");
	});

	it("renders data-pdf-artifact for analytical read artifactType", () => {
		const message = {
			id: "msg-2",
			role: "assistant",
			content: "Here is your read",
			parts: [
				{ type: "text" as const, text: "Here is your read" },
				{
					type: "data-pdf-artifact" as const,
					data: {
						artifactType: "generateAnalyticalRead" as const,
						output: {
							attachment_id: "att-2",
							filename: "read.pdf",
							download_url: null,
							view_url: null,
							size_bytes: 5678,
						},
					},
				},
			],
			createdAt: "2026-01-01T00:00:00.000Z",
		} as MyUIMessage;

		const markup = renderToStaticMarkup(
			<MessagePartsRenderer
				message={message}
				isLastMessage={false}
				isStreamingOrSubmitted={false}
				messages={[message]}
				setMessages={() => {}}
				regenerate={() => {}}
			/>,
		);

		expect(markup).toContain("Analytical Read");
		expect(markup).toContain("read.pdf");
		expect(markup).toContain("View");
		expect(markup).toContain("Download");
	});

	it("renders data-pdf-artifact for playbook artifactType", () => {
		const message = {
			id: "msg-3",
			role: "assistant",
			content: "Here is your playbook",
			parts: [
				{ type: "text" as const, text: "Here is your playbook" },
				{
					type: "data-pdf-artifact" as const,
					data: {
						artifactType: "generatePlaybook" as const,
						output: {
							attachment_id: "att-3",
							filename: "playbook.pdf",
							download_url: null,
							view_url: null,
							size_bytes: 9999,
						},
					},
				},
			],
			createdAt: "2026-01-01T00:00:00.000Z",
		} as MyUIMessage;

		const markup = renderToStaticMarkup(
			<MessagePartsRenderer
				message={message}
				isLastMessage={false}
				isStreamingOrSubmitted={false}
				messages={[message]}
				setMessages={() => {}}
				regenerate={() => {}}
			/>,
		);

		expect(markup).toContain("Discovery Playbook");
		expect(markup).toContain("playbook.pdf");
		expect(markup).toContain("View");
		expect(markup).toContain("Download");
	});

	it("suppresses PDF tool output-error when same tool type succeeds later", () => {
		const message = {
			id: "msg-retry",
			role: "assistant",
			content: "",
			parts: [
				{
					type: "tool-generateIdeationBrief" as const,
					state: "output-error" as const,
					toolCallId: "call-error",
					toolName: "generateIdeationBrief",
					input: { customer: "Acme", stream: "Caustic" },
					errorText: "validation failed",
				},
				{
					type: "tool-generateIdeationBrief" as const,
					state: "output-available" as const,
					toolCallId: "call-success",
					toolName: "generateIdeationBrief",
					input: { customer: "Acme", stream: "Caustic" },
					output: {
						attachment_id: "att-retry",
						filename: "brief-retry.pdf",
						download_url: null,
						view_url: null,
						size_bytes: 1234,
					},
				},
			],
			createdAt: "2026-01-01T00:00:00.000Z",
		} as MyUIMessage;

		const markup = renderToStaticMarkup(
			<MessagePartsRenderer
				message={message}
				isLastMessage={false}
				isStreamingOrSubmitted={false}
				messages={[message]}
				setMessages={() => {}}
				regenerate={() => {}}
			/>,
		);

		// Error state must be suppressed because a later success exists.
		expect(markup).not.toContain("Could not generate");
		// Success state must still render.
		expect(markup).toContain("brief-retry.pdf");
		expect(markup).toContain("View");
		expect(markup).toContain("Download");
	});
});
