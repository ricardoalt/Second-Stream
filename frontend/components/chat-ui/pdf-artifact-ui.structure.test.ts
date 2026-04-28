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
		expect(source).toContain('target="_blank"');
		expect(source).toContain('rel="noreferrer"');
		expect(source).toContain(`aria-label={\`View \${filename} in a new tab\`}`);
		expect(source).toContain(`aria-label={\`Download \${filename}\`}`);
		expect(source).toContain(`title={\`View \${filename}\`}`);
		expect(source).toContain(`title={\`Download \${filename}\`}`);
	});
});
