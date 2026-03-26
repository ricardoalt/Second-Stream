// TODO: FE-FA-2 Waste Streams — this store and bucket model will be migrated to the Waste Streams family
/**
 * Dashboard store — dedicated Zustand store for the triage dashboard.
 *
 * Key semantics:
 * - `counts` = union-scoped counts, always used for tab badges
 * - `items` + `listTotal` + `page` + `pages` = main list pagination
 *   (may be persisted-only when bucket=total)
 * - `draftPreview` = capped preview slice, only for bucket=total
 * - `proposalFollowUpState` is cleared when leaving the proposal bucket
 *
 * Fix #3: Uses a requestId counter for last-request-wins — fast bucket/filter
 * changes never leave stale results on screen.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { dashboardAPI } from "@/lib/api/dashboard";
import type {
	DashboardBucket,
	DashboardCounts,
	DashboardRow,
	DraftItemRow,
	PersistedStreamRow,
	ProposalFollowUpState,
} from "@/lib/types/dashboard";
import { isPersistedStream } from "@/lib/types/dashboard";
import { getErrorMessage, logger } from "@/lib/utils/logger";

export const DASHBOARD_PAGE_SIZE = 20;

let activeDashboardRequestController: AbortController | null = null;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type DashboardSortField = "activity" | "name";

interface DashboardState {
	// Active bucket
	bucket: DashboardBucket;

	// Union-scoped counts — used for tab badges
	counts: DashboardCounts;

	// Main list — pagination is scoped to bucket rows only
	items: DashboardRow[];
	listTotal: number;
	page: number;
	pages: number;

	// Draft preview (only for bucket=total)
	draftPreview: { items: DraftItemRow[]; total: number } | null;
	secondaryDraftRows: DraftItemRow[];
	activeDraft: DraftItemRow | null;

	// UI state
	loading: boolean;
	isInitialized: boolean;
	error: string | null;
	searchResetVersion: number;

	// Client-side sort (applied on current page data)
	sort: DashboardSortField;
	pendingProposalUpdateIds: Record<string, true>;

	// Last-request-wins counter (Fix #3)
	_requestId: number;

	// Filters (server-side)
	filters: {
		search?: string | undefined;
		discoverySessionId?: string | undefined;
		proposalFollowUpState?: ProposalFollowUpState | undefined;
	};

	// Actions
	loadDashboard: () => Promise<void>;
	switchBucket: (bucket: DashboardBucket) => void;
	openFullDraftQueue: () => void;
	openNeedsConfirmationForSession: (sessionId: string) => void;
	openDraftConfirmation: (draft: DraftItemRow) => void;
	closeDraftConfirmation: () => void;
	setSearch: (search: string) => void;
	setProposalSubfilter: (state: ProposalFollowUpState | undefined) => void;
	clearNeedsConfirmationSessionFilter: () => void;
	setPage: (page: number) => void;
	setSort: (sort: DashboardSortField) => void;
	updateProposalFollowUpState: (
		projectId: string,
		nextState: ProposalFollowUpState,
	) => Promise<void>;
	resetStore: () => void;
}

const EMPTY_COUNTS: DashboardCounts = {
	total: 0,
	needsConfirmation: 0,
	missingInformation: 0,
	intelligenceReport: 0,
	proposal: 0,
};

function resetVisibleDashboardList(draft: DashboardState) {
	draft.items = [];
	draft.listTotal = 0;
	draft.page = 1;
	draft.pages = 0;
	draft.draftPreview = null;
	draft.secondaryDraftRows = [];
}

function resetVisibleDashboardPage(draft: DashboardState) {
	draft.items = [];
	draft.listTotal = 0;
	draft.pages = 0;
	draft.draftPreview = null;
	draft.secondaryDraftRows = [];
}

function updatePersistedRow(
	items: DashboardRow[],
	projectId: string,
	updater: (row: PersistedStreamRow) => PersistedStreamRow,
): DashboardRow[] {
	return items.map((item) => {
		if (!isPersistedStream(item) || item.projectId !== projectId) {
			return item;
		}

		return updater(item);
	});
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useDashboardStore = create<DashboardState>()(
	immer((set, get) => ({
		bucket: "total",
		counts: { ...EMPTY_COUNTS },
		items: [],
		listTotal: 0,
		page: 1,
		pages: 0,
		draftPreview: null,
		secondaryDraftRows: [],
		activeDraft: null,
		loading: false,
		isInitialized: false,
		error: null,
		searchResetVersion: 0,
		sort: "activity",
		pendingProposalUpdateIds: {},
		_requestId: 0,
		filters: {},

		loadDashboard: async () => {
			// Bump request counter — stale responses are discarded
			const thisRequestId = get()._requestId + 1;
			activeDashboardRequestController?.abort(
				new DOMException("Dashboard request replaced", "AbortError"),
			);
			const requestController = new AbortController();
			activeDashboardRequestController = requestController;
			set((draft) => {
				draft._requestId = thisRequestId;
				draft.loading = true;
				draft.error = null;
			});

			try {
				const { bucket, page, filters } = get();
				const response = await dashboardAPI.getDashboard({
					bucket,
					page,
					size: DASHBOARD_PAGE_SIZE,
					search: filters.search || undefined,
					discoverySessionId: filters.discoverySessionId,
					archived: "active",
					proposalFollowUpState: filters.proposalFollowUpState,
					signal: requestController.signal,
				});

				if (activeDashboardRequestController === requestController) {
					activeDashboardRequestController = null;
				}

				// Discard if a newer request has been issued
				if (get()._requestId !== thisRequestId) return;

				set((draft) => {
					draft.counts = response.counts;
					draft.items = response.items;
					draft.listTotal = response.total;
					draft.page = response.page;
					draft.pages = response.pages;
					draft.draftPreview = response.draftPreview;
					draft.secondaryDraftRows = response.secondaryDraftRows;
					draft.loading = false;
					draft.isInitialized = true;
				});
			} catch (error) {
				if (activeDashboardRequestController === requestController) {
					activeDashboardRequestController = null;
				}

				if (requestController.signal.aborted) {
					return;
				}

				// Discard if a newer request has been issued
				if (get()._requestId !== thisRequestId) return;

				const message = getErrorMessage(error, "Failed to load dashboard");
				logger.error("Failed to load dashboard", error, "DashboardStore");
				set((draft) => {
					draft.loading = false;
					draft.isInitialized = true;
					draft.error = message;
				});
			}
		},

		switchBucket: (bucket: DashboardBucket) => {
			const current = get();
			if (current.bucket === bucket) return;

			set((draft) => {
				if (current.bucket === "proposal" && bucket !== "proposal") {
					draft.filters.proposalFollowUpState = undefined;
				}
				if (bucket !== "needs_confirmation") {
					draft.filters.discoverySessionId = undefined;
				}
				draft.bucket = bucket;
				resetVisibleDashboardList(draft);
				draft.loading = true;
				draft.filters.search = undefined;
				draft.searchResetVersion += 1;
			});

			void get().loadDashboard();
		},

		openFullDraftQueue: () => {
			set((draft) => {
				draft.bucket = "needs_confirmation";
				resetVisibleDashboardList(draft);
				draft.loading = true;
				draft.filters.search = undefined;
				draft.filters.discoverySessionId = undefined;
				draft.filters.proposalFollowUpState = undefined;
				draft.searchResetVersion += 1;
			});

			void get().loadDashboard();
		},

		openNeedsConfirmationForSession: (sessionId: string) => {
			set((draft) => {
				draft.bucket = "needs_confirmation";
				resetVisibleDashboardList(draft);
				draft.loading = true;
				draft.filters.search = undefined;
				draft.filters.proposalFollowUpState = undefined;
				draft.filters.discoverySessionId = sessionId;
				draft.searchResetVersion += 1;
			});

			void get().loadDashboard();
		},

		openDraftConfirmation: (activeDraft) => {
			set((draft) => {
				draft.activeDraft = activeDraft;
			});
		},

		closeDraftConfirmation: () => {
			set((draft) => {
				draft.activeDraft = null;
			});
		},

		setSearch: (search: string) => {
			set((draft) => {
				draft.filters.search = search || undefined;
				resetVisibleDashboardList(draft);
				draft.loading = true;
			});
			void get().loadDashboard();
		},

		setProposalSubfilter: (state: ProposalFollowUpState | undefined) => {
			set((draft) => {
				draft.filters.proposalFollowUpState = state;
				resetVisibleDashboardList(draft);
				draft.loading = true;
			});
			void get().loadDashboard();
		},

		clearNeedsConfirmationSessionFilter: () => {
			set((draft) => {
				if (draft.filters.discoverySessionId === undefined) return;
				draft.filters.discoverySessionId = undefined;
				resetVisibleDashboardList(draft);
				draft.loading = true;
			});
			void get().loadDashboard();
		},

		setPage: (page: number) => {
			set((draft) => {
				draft.page = page;
				resetVisibleDashboardPage(draft);
				draft.loading = true;
			});
			void get().loadDashboard();
		},

		setSort: (sort: DashboardSortField) => {
			set((draft) => {
				draft.sort = sort;
			});
		},

		updateProposalFollowUpState: async (projectId, nextState) => {
			const current = get();
			const mutationContext = {
				bucket: current.bucket,
				page: current.page,
				search: current.filters.search,
				proposalFollowUpState: current.filters.proposalFollowUpState,
			};
			const previousItems = current.items;
			const previousListTotal = current.listTotal;
			const previousPages = current.pages;
			const previousDraftPreview = current.draftPreview;
			const previousCounts = current.counts;
			const activeProposalSubfilter = current.filters.proposalFollowUpState;
			const shouldHideFromActiveList =
				current.bucket === "proposal" &&
				activeProposalSubfilter !== undefined &&
				activeProposalSubfilter !== nextState;

			set((draft) => {
				draft.pendingProposalUpdateIds[projectId] = true;
				draft.items = updatePersistedRow(draft.items, projectId, (row) => ({
					...row,
					proposalFollowUpState: nextState,
					lastActivityAt: new Date().toISOString(),
				}));

				if (shouldHideFromActiveList) {
					draft.items = draft.items.filter(
						(item) =>
							!isPersistedStream(item) ||
							!(
								item.projectId === projectId &&
								item.proposalFollowUpState === nextState
							),
					);
					draft.listTotal = Math.max(0, draft.listTotal - 1);
					draft.pages =
						draft.listTotal === 0
							? 0
							: Math.ceil(draft.listTotal / DASHBOARD_PAGE_SIZE);
					draft.page =
						draft.pages === 0 ? 1 : Math.min(draft.page, draft.pages);
				}
			});

			try {
				const response = await dashboardAPI.updateProposalFollowUpState(
					projectId,
					nextState,
				);

				set((draft) => {
					draft.items = updatePersistedRow(draft.items, projectId, (row) => ({
						...row,
						proposalFollowUpState: response.proposalFollowUpState,
						lastActivityAt: response.updatedAt,
					}));
					delete draft.pendingProposalUpdateIds[projectId];
				});

				await get().loadDashboard();
			} catch (error) {
				set((draft) => {
					const shouldRollback =
						draft.bucket === mutationContext.bucket &&
						draft.page === mutationContext.page &&
						draft.filters.search === mutationContext.search &&
						draft.filters.proposalFollowUpState ===
							mutationContext.proposalFollowUpState;

					if (shouldRollback) {
						draft.items = previousItems;
						draft.listTotal = previousListTotal;
						draft.pages = previousPages;
						draft.draftPreview = previousDraftPreview;
						draft.counts = previousCounts;
					}
					delete draft.pendingProposalUpdateIds[projectId];
				});
				throw error;
			}
		},

		resetStore: () => {
			activeDashboardRequestController?.abort(
				new DOMException("Dashboard store reset", "AbortError"),
			);
			activeDashboardRequestController = null;
			set((draft) => {
				draft.bucket = "total";
				draft.counts = { ...EMPTY_COUNTS };
				draft.items = [];
				draft.listTotal = 0;
				draft.page = 1;
				draft.pages = 0;
				draft.draftPreview = null;
				draft.secondaryDraftRows = [];
				draft.activeDraft = null;
				draft.loading = false;
				draft.isInitialized = false;
				draft.error = null;
				draft.searchResetVersion = 0;
				draft.sort = "activity";
				draft.pendingProposalUpdateIds = {};
				draft._requestId = 0;
				draft.filters = {};
			});
		},
	})),
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SELECTORS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useDashboardBucket = () => useDashboardStore((s) => s.bucket);

export const useDashboardCounts = () => useDashboardStore((s) => s.counts);

export const useDashboardItems = () => useDashboardStore((s) => s.items);

export const useDashboardDraftPreview = () =>
	useDashboardStore((s) => s.draftPreview);

export const useDashboardSecondaryDraftRows = () =>
	useDashboardStore((s) => s.secondaryDraftRows);

export const useDashboardActiveDraft = () =>
	useDashboardStore((s) => s.activeDraft);

export const useDashboardLoading = () => useDashboardStore((s) => s.loading);

export const useDashboardInitialized = () =>
	useDashboardStore((s) => s.isInitialized);

export const useDashboardError = () => useDashboardStore((s) => s.error);

export const useDashboardSort = () => useDashboardStore((s) => s.sort);

export const useDashboardPagination = () =>
	useDashboardStore(
		useShallow((s) => ({
			listTotal: s.listTotal,
			page: s.page,
			pages: s.pages,
		})),
	);

export const useDashboardFilters = () => useDashboardStore((s) => s.filters);

export const useDashboardSearchResetVersion = () =>
	useDashboardStore((s) => s.searchResetVersion);

export const useDashboardActions = () =>
	useDashboardStore(
		useShallow((s) => ({
			loadDashboard: s.loadDashboard,
			switchBucket: s.switchBucket,
			openFullDraftQueue: s.openFullDraftQueue,
			openNeedsConfirmationForSession: s.openNeedsConfirmationForSession,
			openDraftConfirmation: s.openDraftConfirmation,
			closeDraftConfirmation: s.closeDraftConfirmation,
			setSearch: s.setSearch,
			setProposalSubfilter: s.setProposalSubfilter,
			clearNeedsConfirmationSessionFilter:
				s.clearNeedsConfirmationSessionFilter,
			setPage: s.setPage,
			setSort: s.setSort,
			updateProposalFollowUpState: s.updateProposalFollowUpState,
			resetStore: s.resetStore,
		})),
	);

export const useDashboardPendingProposalUpdateIds = () =>
	useDashboardStore((s) => s.pendingProposalUpdateIds);
