import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { StreamRow } from "@/components/features/streams/types";
import {
	adaptDraftItem,
	adaptPersistedStream,
} from "@/lib/adapters/streams-adapter";
import { dashboardAPI } from "@/lib/api/dashboard";
import type {
	DashboardCounts,
	DashboardListResponse,
	DashboardRow,
	DraftItemRow,
} from "@/lib/types/dashboard";
import { isDraftItem, isPersistedStream } from "@/lib/types/dashboard";
import {
	isClientDataCacheStale,
	peekClientDataCache,
} from "@/lib/utils/client-data-cache";
import { getErrorMessage, logger } from "@/lib/utils/logger";

const EMPTY_COUNTS: DashboardCounts = {
	total: 0,
	needsConfirmation: 0,
	missingInformation: 0,
	intelligenceReport: 0,
	proposal: 0,
};

function adaptDashboardRow(row: DashboardRow): StreamRow {
	if (isDraftItem(row)) {
		return adaptDraftItem(row);
	}

	return adaptPersistedStream(row);
}

function dashboardCacheKeyFor(
	bucket: "total" | "needs_confirmation" | "missing_information",
) {
	return `dashboard:/projects/dashboard?bucket=${bucket}&size=100`;
}

function toDraftRows(response: DashboardListResponse): DraftItemRow[] {
	return [...response.items, ...response.secondaryDraftRows].filter(
		isDraftItem,
	);
}

function hydrateStateFromResponses(args: {
	allResponse: DashboardListResponse;
	draftsResponse: DashboardListResponse;
	missingInfoResponse: DashboardListResponse;
}): Pick<
	StreamsState,
	"allItems" | "draftItems" | "missingInfoItems" | "counts" | "draftRowsById"
> {
	const allItems = args.allResponse.items.map(adaptDashboardRow);
	const draftRows = toDraftRows(args.draftsResponse);
	const draftItems = draftRows.map(adaptDraftItem);
	const missingInfoItems = args.missingInfoResponse.items
		.filter(isPersistedStream)
		.map(adaptPersistedStream);

	const draftRowsById = draftRows.reduce<Record<string, DraftItemRow>>(
		(acc, row) => {
			acc[row.itemId] = row;
			return acc;
		},
		{},
	);

	return {
		allItems,
		draftItems,
		missingInfoItems,
		counts: args.allResponse.counts,
		draftRowsById,
	};
}

interface StreamsState {
	allItems: StreamRow[];
	draftItems: StreamRow[];
	missingInfoItems: StreamRow[];
	counts: DashboardCounts;
	draftRowsById: Record<string, DraftItemRow>;
	loading: boolean;
	isInitialized: boolean;
	error: string | null;
	loadStreams: (opts?: { forceRefresh?: boolean }) => Promise<void>;
	resetStore: () => void;
}

export const useStreamsStore = create<StreamsState>()(
	immer((set) => ({
		allItems: [],
		draftItems: [],
		missingInfoItems: [],
		counts: { ...EMPTY_COUNTS },
		draftRowsById: {},
		loading: false,
		isInitialized: false,
		error: null,

		loadStreams: async (opts) => {
			const totalKey = dashboardCacheKeyFor("total");
			const draftsKey = dashboardCacheKeyFor("needs_confirmation");
			const missingInfoKey = dashboardCacheKeyFor("missing_information");
			const forceRefresh = opts?.forceRefresh === true;

			const cachedTotal = peekClientDataCache<DashboardListResponse>(totalKey);
			const cachedDrafts =
				peekClientDataCache<DashboardListResponse>(draftsKey);
			const cachedMissingInfo =
				peekClientDataCache<DashboardListResponse>(missingInfoKey);

			if (!forceRefresh && cachedTotal && cachedDrafts && cachedMissingInfo) {
				const hydrated = hydrateStateFromResponses({
					allResponse: cachedTotal.data,
					draftsResponse: cachedDrafts.data,
					missingInfoResponse: cachedMissingInfo.data,
				});

				set((draft) => {
					draft.allItems = hydrated.allItems;
					draft.draftItems = hydrated.draftItems;
					draft.missingInfoItems = hydrated.missingInfoItems;
					draft.counts = hydrated.counts;
					draft.draftRowsById = hydrated.draftRowsById;
					draft.loading = false;
					draft.isInitialized = true;
					draft.error = null;
				});

				const allFresh =
					!isClientDataCacheStale(totalKey) &&
					!isClientDataCacheStale(draftsKey) &&
					!isClientDataCacheStale(missingInfoKey);

				if (allFresh) {
					return;
				}
			}

			set((draft) => {
				draft.loading = true;
				draft.error = null;
			});

			try {
				const [allResponse, draftsResponse, missingInfoResponse] =
					await Promise.all([
						dashboardAPI.getDashboard({
							bucket: "total",
							size: 100,
							forceRefresh,
						}),
						dashboardAPI.getDashboard({
							bucket: "needs_confirmation",
							size: 100,
							forceRefresh,
						}),
						dashboardAPI.getDashboard({
							bucket: "missing_information",
							size: 100,
							forceRefresh,
						}),
					]);

				const hydrated = hydrateStateFromResponses({
					allResponse,
					draftsResponse,
					missingInfoResponse,
				});

				set((draft) => {
					draft.allItems = hydrated.allItems;
					draft.draftItems = hydrated.draftItems;
					draft.missingInfoItems = hydrated.missingInfoItems;
					draft.counts = hydrated.counts;
					draft.draftRowsById = hydrated.draftRowsById;
					draft.loading = false;
					draft.isInitialized = true;
				});
			} catch (error) {
				const message = getErrorMessage(error, "Failed to load streams");
				logger.error("Failed to load streams", error, "StreamsStore");
				set((draft) => {
					draft.loading = false;
					draft.isInitialized = true;
					draft.error = message;
				});
			}
		},

		resetStore: () => {
			set((draft) => {
				draft.allItems = [];
				draft.draftItems = [];
				draft.missingInfoItems = [];
				draft.counts = { ...EMPTY_COUNTS };
				draft.draftRowsById = {};
				draft.loading = false;
				draft.isInitialized = false;
				draft.error = null;
			});
		},
	})),
);

export const useStreamsAll = () => useStreamsStore((s) => s.allItems);

export const useStreamsDrafts = () => useStreamsStore((s) => s.draftItems);

export const useStreamsMissingInfo = () =>
	useStreamsStore((s) => s.missingInfoItems);

export const useStreamsCounts = () => useStreamsStore((s) => s.counts);

export const useStreamsDraftRowsById = () =>
	useStreamsStore((s) => s.draftRowsById);

export const useStreamsLoading = () => useStreamsStore((s) => s.loading);

export const useStreamsInitialized = () =>
	useStreamsStore((s) => s.isInitialized);

export const useStreamsError = () => useStreamsStore((s) => s.error);

export const useStreamsActions = () =>
	useStreamsStore(
		useShallow((s) => ({
			loadStreams: s.loadStreams,
			resetStore: s.resetStore,
		})),
	);
