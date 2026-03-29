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
	DashboardRow,
	DraftItemRow,
} from "@/lib/types/dashboard";
import { isDraftItem, isPersistedStream } from "@/lib/types/dashboard";
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

interface StreamsState {
	allItems: StreamRow[];
	draftItems: StreamRow[];
	missingInfoItems: StreamRow[];
	counts: DashboardCounts;
	draftRowsById: Record<string, DraftItemRow>;
	loading: boolean;
	isInitialized: boolean;
	error: string | null;
	loadStreams: () => Promise<void>;
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

		loadStreams: async () => {
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
						}),
						dashboardAPI.getDashboard({
							bucket: "needs_confirmation",
							size: 100,
						}),
						dashboardAPI.getDashboard({
							bucket: "missing_information",
							size: 100,
						}),
					]);

				const allItems = allResponse.items.map(adaptDashboardRow);
				const draftRows = [
					...draftsResponse.items,
					...draftsResponse.secondaryDraftRows,
				].filter(isDraftItem);
				const draftItems = draftRows.map(adaptDraftItem);
				const missingInfoItems = missingInfoResponse.items
					.filter(isPersistedStream)
					.map(adaptPersistedStream);

				const draftRowsById = draftRows.reduce<Record<string, DraftItemRow>>(
					(acc, row) => {
						acc[row.itemId] = row;
						return acc;
					},
					{},
				);

				set((draft) => {
					draft.allItems = allItems;
					draft.draftItems = draftItems;
					draft.missingInfoItems = missingInfoItems;
					draft.counts = allResponse.counts;
					draft.draftRowsById = draftRowsById;
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
