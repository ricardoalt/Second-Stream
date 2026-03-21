import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { DashboardListResponse } from "@/lib/types/dashboard";

type DashboardAPI = typeof import("@/lib/api/dashboard")["dashboardAPI"];
type DashboardStore = typeof import("./dashboard-store")["useDashboardStore"];

let dashboardAPI: DashboardAPI | null = null;
let useDashboardStore: DashboardStore | null = null;
let originalGetDashboard: DashboardAPI["getDashboard"] | null = null;

const getDashboardAPI = (): DashboardAPI => {
	if (dashboardAPI === null) {
		throw new Error("dashboardAPI not initialized");
	}
	return dashboardAPI;
};

const getDashboardStore = (): DashboardStore => {
	if (useDashboardStore === null) {
		throw new Error("dashboard store not initialized");
	}
	return useDashboardStore;
};

const getOriginalGetDashboard = (): DashboardAPI["getDashboard"] => {
	if (originalGetDashboard === null) {
		throw new Error("original getDashboard not initialized");
	}
	return originalGetDashboard;
};

const buildDashboardResponse = (): DashboardListResponse => ({
	bucket: "needs_confirmation",
	counts: {
		total: 0,
		needsConfirmation: 0,
		missingInformation: 0,
		intelligenceReport: 0,
		proposal: 0,
	},
	items: [],
	secondaryDraftRows: [],
	total: 0,
	page: 1,
	size: 20,
	pages: 1,
	draftPreview: null,
});

const waitFor = async (predicate: () => boolean): Promise<void> => {
	for (let attempt = 0; attempt < 50; attempt += 1) {
		if (predicate()) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error("Condition not met in time");
};

beforeAll(async () => {
	process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";
	const dashboardModule = await import("@/lib/api/dashboard");
	dashboardAPI = dashboardModule.dashboardAPI;
	originalGetDashboard = dashboardModule.dashboardAPI.getDashboard;

	const dashboardStoreModule = await import("./dashboard-store");
	useDashboardStore = dashboardStoreModule.useDashboardStore;
});

afterEach(() => {
	getDashboardAPI().getDashboard = getOriginalGetDashboard();
	getDashboardStore().getState().resetStore();
});

describe("dashboard-store session-scoped queue", () => {
	it("openNeedsConfirmationForSession refreshes even if bucket already active", async () => {
		let callCount = 0;
		getDashboardAPI().getDashboard = async () => {
			callCount += 1;
			return buildDashboardResponse();
		};

		getDashboardStore().setState({
			bucket: "needs_confirmation",
			filters: {},
			loading: false,
		});

		getDashboardStore()
			.getState()
			.openNeedsConfirmationForSession("session-123");

		await waitFor(() => callCount > 0);

		const state = getDashboardStore().getState();
		expect(callCount).toBe(1);
		expect(state.bucket).toBe("needs_confirmation");
		expect(state.filters.discoverySessionId).toBe("session-123");
	});
});
