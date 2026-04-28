import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
	return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("pdf artifact UI", () => {
	it("renders output-available as visible artifact card before Tool wrapper", () => {
		const source = read("components/chat-ui/message-parts-renderer.tsx");

		expect(source).toContain('if (part.state === "output-available")');
		expect(source).toContain("return (");
		expect(source).toContain("<PdfDocumentCard");
		expect(source).toContain("<Tool");

		const outputBranchIndex = source.indexOf(
			'if (part.state === "output-available")',
		);
		const toolIndex = source.indexOf("<Tool");
		expect(outputBranchIndex).toBeGreaterThan(-1);
		expect(toolIndex).toBeGreaterThan(-1);
		expect(outputBranchIndex).toBeLessThan(toolIndex);
	});

	it("includes always-visible View and Download actions with accessibility labels", () => {
		const source = read("components/chat-ui/pdf-document-card.tsx");

		expect(source).toContain("View");
		expect(source).toContain("Download");
		expect(source).toContain(`aria-label={\`View \${filename} in a new tab\`}`);
		expect(source).toContain(`aria-label={\`Download \${filename}\`}`);
	});

	it("prefers attachment_id over stale presigned URLs for download resolution", () => {
		const source = read("components/chat-ui/pdf-document-card.tsx");

		expect(source).toContain("attachment_id");
		expect(source).toContain("downloadChatAttachment");
	});

	it("accepts nullable download_url, view_url, and expires_at in PdfOutput type", () => {
		const source = read("types/ui-message.ts");

		expect(source).toContain("download_url: string | null;");
		expect(source).toContain("view_url: string | null;");
		expect(source).toContain("expires_at: string | null;");
	});

	it("pre-opens a blank window before async attachment fetch to avoid popup blockers", () => {
		const source = read("components/chat-ui/pdf-document-card.tsx");

		const handleViewStart = source.indexOf("const handleView = useCallback");
		expect(handleViewStart).toBeGreaterThan(-1);

		const handleViewBody = source.slice(handleViewStart);
		const pendingWindowIndex = handleViewBody.indexOf(
			'window.open("", "_blank")',
		);
		const downloadIndex = handleViewBody.indexOf("downloadChatAttachment");
		expect(pendingWindowIndex).toBeGreaterThan(-1);
		expect(downloadIndex).toBeGreaterThan(-1);
		expect(pendingWindowIndex).toBeLessThan(downloadIndex);
	});

	it("closes pending window and surfaces an error message on view failure", () => {
		const source = read("components/chat-ui/pdf-document-card.tsx");

		expect(source).toContain("pendingWindow.close()");
		expect(source).toContain('role="alert"');
		expect(source).toContain("We couldn't open this file");
	});
});
