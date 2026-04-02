import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { AgentDetailResponse } from "@/lib/api/organizations";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

const { APIClientError } = await import("@/lib/api/client");
const { AgentDetailLoadedState, resolveAgentDetailErrorMessage } = await import(
	"./agent-detail-page-content"
);

function buildDetail(
	overrides?: Partial<AgentDetailResponse>,
): AgentDetailResponse {
	return {
		user: {
			id: "user-1",
			email: "agent@secondstream.test",
			firstName: "Alex",
			lastName: "Field",
			isVerified: true,
			isActive: true,
			createdAt: "2026-04-01T00:00:00.000Z",
			isSuperuser: false,
			role: "field_agent",
			organizationId: "org-1",
			permissions: [],
			permissionsVersion: "2026-02-28-role-authz-mvp-v1",
		},
		kpis: {
			openStreams: 3,
			missingInformation: 1,
			offersInProgress: 2,
			completedStreams: 5,
		},
		streams: [
			{
				projectId: "project-1",
				streamName: "HDPE offcuts",
				status: "In Progress",
				companyLabel: "Acme Plastics",
				locationLabel: "Austin",
				lastActivityAt: "2026-04-01T00:00:00.000Z",
				missingRequiredInfo: true,
				missingFields: ["volume"],
				proposalFollowUpState: "waiting_response",
			},
		],
		page: 1,
		size: 10,
		total: 1,
		pages: 1,
		...overrides,
	};
}

describe("agent detail page content", () => {
	it("renders KPI values and owned streams from successful detail payload", () => {
		const markup = renderToStaticMarkup(
			<AgentDetailLoadedState
				detail={buildDetail()}
				displayName="Alex Field"
				page={1}
				onPrevPage={() => {}}
				onNextPage={() => {}}
			/>,
		);

		expect(markup.includes("Alex Field")).toBe(true);
		expect(markup.includes("OPEN STREAMS")).toBe(true);
		expect(markup.includes("Owned Streams")).toBe(true);
		expect(markup.includes("HDPE offcuts")).toBe(true);
		expect(markup.includes("Acme Plastics")).toBe(true);
		expect(markup.includes("Page 1 of 1")).toBe(true);
	});

	it("renders explicit zero/empty state when response has zero KPIs and no streams", () => {
		const markup = renderToStaticMarkup(
			<AgentDetailLoadedState
				detail={buildDetail({
					kpis: {
						openStreams: 0,
						missingInformation: 0,
						offersInProgress: 0,
						completedStreams: 0,
					},
					streams: [],
					total: 0,
				})}
				displayName="Alex Field"
				page={1}
				onPrevPage={() => {}}
				onNextPage={() => {}}
			/>,
		);

		expect(markup.includes("No streams found")).toBe(true);
		expect(markup.includes("Page 1 of 1")).toBe(true);
		expect(markup.includes(">0<")).toBe(true);
	});

	it("maps not-found and generic errors to user-facing detail messages", () => {
		const notFoundMessage = resolveAgentDetailErrorMessage(
			new APIClientError({
				message: "Field agent not found",
				code: "NOT_FOUND",
			}),
		);

		const genericMessage = resolveAgentDetailErrorMessage(
			new Error("network timeout"),
		);

		expect(notFoundMessage).toBe("Field agent not found.");
		expect(genericMessage).toBe("network timeout");
	});
});
