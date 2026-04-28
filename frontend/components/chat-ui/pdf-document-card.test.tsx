process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const { PdfDocumentCard, PDF_DOC_CONFIGS } = await import(
	"@/components/chat-ui/pdf-document-card"
);

describe("PdfDocumentCard", () => {
	const config = PDF_DOC_CONFIGS.generateIdeationBrief;

	it("renders output-available state with filename, size, and actions", () => {
		const markup = renderToStaticMarkup(
			<PdfDocumentCard
				{...config}
				state="output-available"
				output={{
					attachment_id: "att-1",
					filename: "brief.pdf",
					download_url: null,
					view_url: null,
					size_bytes: 2_097_152,
				}}
			/>,
		);

		expect(markup).toContain("brief.pdf");
		expect(markup).toContain("2.0 MB");
		expect(markup).toContain("View");
		expect(markup).toContain("Download");
	});

	it("renders output-error state with retry message", () => {
		const markup = renderToStaticMarkup(
			<PdfDocumentCard {...config} state="output-error" />,
		);

		expect(markup).toContain("Could not generate ideation brief");
		expect(markup).toContain("Please retry");
	});

	it("renders loading state with shimmer text", () => {
		const markup = renderToStaticMarkup(
			<PdfDocumentCard {...config} state="running" />,
		);

		expect(markup).toContain("Generating ideation brief...");
	});
});
