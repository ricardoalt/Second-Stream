import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("QueryClientProvider", () => {
	it("renders QueryClientProvider with QueryClient", () => {
		const source = readFileSync(
			join(ROOT, "components/providers/query-client-provider.tsx"),
			"utf8",
		);

		// Must use QueryClient from @tanstack/react-query
		expect(source).toContain("QueryClient");
		expect(source).toContain("QueryClientProvider");

		// Must have "use client" directive
		expect(source).toContain('"use client"');

		// Must configure staleTime and refetchOnWindowFocus
		expect(source).toContain("staleTime");
		expect(source).toContain("refetchOnWindowFocus");
	});

	it("ClientLayout wraps children with QueryProvider", () => {
		const source = readFileSync(
			join(ROOT, "components/providers/client-layout.tsx"),
			"utf8",
		);

		expect(source).toContain("QueryProvider");
		expect(source).toContain("<QueryProvider>");
	});

	it("uses useState for QueryClient to avoid re-creation on re-render", () => {
		const source = readFileSync(
			join(ROOT, "components/providers/query-client-provider.tsx"),
			"utf8",
		);

		expect(source).toContain("useState");
		expect(source).toContain("new QueryClient");
	});
});
