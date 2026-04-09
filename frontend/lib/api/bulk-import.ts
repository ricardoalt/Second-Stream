/**
 * Bulk Import API client
 * Handles file upload, run polling, item review, and finalization.
 */

import { apiClient } from "./client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type RunStatus =
	| "uploaded"
	| "processing"
	| "review_ready"
	| "finalizing"
	| "completed"
	| "failed"
	| "no_data";

export type ItemStatus =
	| "pending_review"
	| "accepted"
	| "amended"
	| "rejected"
	| "invalid";

export type ItemType = "location" | "project";
export type EntrypointType = "organization" | "company" | "location";
export type RunSourceType = "bulk_import" | "voice_interview";
export type ItemAction = "accept" | "amend" | "reject" | "reset";

export interface BulkImportUploadResponse {
	runId: string;
	status: RunStatus;
}

export interface BulkImportRun {
	id: string;
	entrypointType: EntrypointType;
	entrypointId: string;
	sourceFilename: string;
	sourceType: RunSourceType;
	discoverySourceType?: "file" | "audio" | "text" | null;
	status: RunStatus;
	progressStep: string | null;
	processingError: string | null;
	totalItems: number;
	acceptedCount: number;
	rejectedCount: number;
	amendedCount: number;
	invalidCount: number;
	duplicateCount: number;
	createdByUserId: string | null;
	finalizedByUserId: string | null;
	finalizedAt: string | null;
	createdAt: string;
	updatedAt: string;
	voiceInterviewId: string | null;
}

export interface DuplicateCandidate {
	id: string;
	name: string;
	reason: string;
	[key: string]: unknown;
}

export interface BulkImportRunLocationOption {
	id: string;
	name: string;
	city: string;
	state: string;
	address: string | null;
}

export type BulkImportLocationResolution =
	| {
			mode: "locked";
			name: string;
	  }
	| {
			mode: "existing";
			locationId: string;
	  }
	| {
			mode: "create_new";
			name: string;
			city: string;
			state: string;
			address?: string;
	  };

export type BulkImportCompanyResolution =
	| {
			mode: "existing";
			companyId: string;
	  }
	| {
			mode: "create_new";
			name: string;
			industry?: string;
			sector?: string;
			subsector?: string;
	  };

export interface BulkImportItem {
	id: string;
	runId: string;
	itemType: ItemType;
	status: ItemStatus;
	needsReview: boolean;
	confidence: number | null;
	extractedData: Record<string, unknown>;
	normalizedData: Record<string, unknown>;
	userAmendments: Record<string, unknown> | null;
	reviewNotes: string | null;
	duplicateCandidates: DuplicateCandidate[] | null;
	confirmCreateNew: boolean;
	parentItemId: string | null;
	createdLocationId: string | null;
	createdProjectId: string | null;
	groupId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface BulkImportFinalizeRequest {
	resolvedGroupIds?: string[];
	idempotencyKey?: string;
	closeReason?: "empty_extraction";
}

export interface PaginatedItems {
	items: BulkImportItem[];
	total: number;
	page: number;
	size: number;
	pages: number;
}

export interface BulkImportFinalizeSummary {
	runId: string;
	locationsCreated: number;
	projectsCreated: number;
	rejected: number;
	invalid: number;
	duplicatesResolved: number;
}

export interface BulkImportFinalizeResponse {
	status: RunStatus;
	summary: BulkImportFinalizeSummary;
}

export interface BulkImportDiscoveryDraftDecisionResponse {
	status: RunStatus;
	summary: BulkImportFinalizeSummary;
	item: BulkImportItem;
}

export interface BulkImportSummaryResponse {
	summary: BulkImportFinalizeSummary;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API CLIENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BASE = "/bulk-import";
export const BULK_IMPORT_PAGE_SIZE = 100;

export const bulkImportAPI = {
	/**
	 * Upload a file and create an import run.
	 */
	async upload(
		file: File,
		entrypointType: EntrypointType,
		entrypointId: string,
	): Promise<BulkImportUploadResponse> {
		return apiClient.uploadFile<BulkImportUploadResponse>(
			`${BASE}/upload`,
			file,
			{
				entrypoint_type: entrypointType,
				entrypoint_id: entrypointId,
			},
		);
	},

	/**
	 * Get run status (used for polling during processing).
	 */
	async getRun(runId: string): Promise<BulkImportRun> {
		return apiClient.get<BulkImportRun>(`${BASE}/runs/${runId}`);
	},

	/**
	 * Get the latest review_ready run for an entrypoint, or null.
	 */
	async getPendingRun(
		entrypointType: EntrypointType,
		entrypointId: string,
	): Promise<BulkImportRun | null> {
		return apiClient.get<BulkImportRun | null>(
			`${BASE}/runs/pending?entrypoint_type=${entrypointType}&entrypoint_id=${entrypointId}`,
		);
	},

	/**
	 * List items for review (paginated, filterable by status).
	 */
	async listItems(
		runId: string,
		page = 1,
		size = BULK_IMPORT_PAGE_SIZE,
		status?: ItemStatus,
	): Promise<PaginatedItems> {
		const normalizedSize = Number.isFinite(size)
			? Math.trunc(size)
			: BULK_IMPORT_PAGE_SIZE;
		const safeSize = Math.max(
			1,
			Math.min(normalizedSize, BULK_IMPORT_PAGE_SIZE),
		);
		const params = new URLSearchParams({
			page: String(page),
			size: String(safeSize),
		});
		if (status) params.set("status", status);
		return apiClient.get<PaginatedItems>(
			`${BASE}/runs/${runId}/items?${params}`,
		);
	},

	/**
	 * List all items for a run (auto-paginates).
	 */
	async listAllItems(runId: string): Promise<BulkImportItem[]> {
		const firstPage = await bulkImportAPI.listItems(runId, 1);
		let items = firstPage.items;

		if (firstPage.pages <= 1) {
			return items;
		}

		const remainingPages = await Promise.all(
			Array.from({ length: firstPage.pages - 1 }, (_, index) =>
				bulkImportAPI.listItems(runId, index + 2),
			),
		);

		for (const page of remainingPages) {
			items = items.concat(page.items);
		}

		return items;
	},

	/**
	 * Update an item's decision (accept, amend, reject, reset).
	 */
	async patchItem(
		itemId: string,
		action: ItemAction,
		options?: {
			normalizedData?: Record<string, unknown>;
			reviewNotes?: string;
			locationResolution?: BulkImportLocationResolution;
			confirmCreateNew?: boolean;
		},
	): Promise<BulkImportItem> {
		const locationResolution = options?.locationResolution;
		const serializedLocationResolution =
			locationResolution?.mode === "existing"
				? {
						mode: "existing" as const,
						location_id: locationResolution.locationId,
					}
				: locationResolution?.mode === "create_new"
					? {
							mode: "create_new" as const,
							name: locationResolution.name,
							city: locationResolution.city,
							state: locationResolution.state,
							address: locationResolution.address,
						}
					: locationResolution?.mode === "locked"
						? {
								mode: "locked" as const,
								name: locationResolution.name,
							}
						: undefined;

		return apiClient.patch<BulkImportItem>(`${BASE}/items/${itemId}`, {
			action,
			normalized_data: options?.normalizedData,
			review_notes: options?.reviewNotes,
			location_resolution: serializedLocationResolution,
			confirm_create_new: options?.confirmCreateNew,
		});
	},

	async decideDiscoveryDraft(
		itemId: string,
		payload: {
			action: "confirm" | "reject";
			normalizedData?: Record<string, unknown>;
			reviewNotes?: string;
			companyResolution?: BulkImportCompanyResolution;
			locationResolution?: BulkImportLocationResolution;
			confirmCreateNew?: boolean;
			ownerUserId?: string;
		},
	): Promise<BulkImportDiscoveryDraftDecisionResponse> {
		const companyResolution = payload.companyResolution;
		const locationResolution = payload.locationResolution;
		const serializedCompanyResolution =
			companyResolution?.mode === "existing"
				? {
						mode: "existing" as const,
						company_id: companyResolution.companyId,
				  }
				: companyResolution?.mode === "create_new"
					? {
							mode: "create_new" as const,
							name: companyResolution.name,
							industry: companyResolution.industry,
							sector: companyResolution.sector,
							subsector: companyResolution.subsector,
					  }
					: undefined;
		const serializedLocationResolution =
			locationResolution?.mode === "existing"
				? {
						mode: "existing" as const,
						location_id: locationResolution.locationId,
					}
				: locationResolution?.mode === "create_new"
					? {
							mode: "create_new" as const,
							name: locationResolution.name,
							city: locationResolution.city,
							state: locationResolution.state,
							address: locationResolution.address,
						}
					: locationResolution?.mode === "locked"
						? {
								mode: "locked" as const,
								name: locationResolution.name,
							}
						: undefined;

		return apiClient.post<BulkImportDiscoveryDraftDecisionResponse>(
			`${BASE}/items/${itemId}/discovery-decision`,
			{
				action: payload.action,
				normalized_data: payload.normalizedData,
				review_notes: payload.reviewNotes,
				company_resolution: serializedCompanyResolution,
				location_resolution: serializedLocationResolution,
				confirm_create_new: payload.confirmCreateNew,
				owner_user_id: payload.ownerUserId,
			},
		);
	},

	async searchRunLocations(
		runId: string,
		options?: {
			query?: string;
			limit?: number;
		},
	): Promise<BulkImportRunLocationOption[]> {
		const params = new URLSearchParams();
		if (options?.query !== undefined) {
			params.set("query", options.query);
		}
		if (options?.limit !== undefined) {
			params.set("limit", String(options.limit));
		}
		const suffix = params.size > 0 ? `?${params.toString()}` : "";
		return apiClient.get<BulkImportRunLocationOption[]>(
			`${BASE}/runs/${runId}/locations${suffix}`,
		);
	},

	/**
	 * Finalize the import run — creates real entities.
	 */
	async finalize(
		runId: string,
		payload?: BulkImportFinalizeRequest,
	): Promise<BulkImportFinalizeResponse> {
		const body = payload
			? {
					...(payload.resolvedGroupIds
						? { resolved_group_ids: payload.resolvedGroupIds }
						: {}),
					...(payload.idempotencyKey
						? { idempotency_key: payload.idempotencyKey }
						: {}),
					...(payload.closeReason ? { close_reason: payload.closeReason } : {}),
				}
			: undefined;
		return apiClient.post<BulkImportFinalizeResponse>(
			`${BASE}/runs/${runId}/finalize`,
			body,
		);
	},

	/**
	 * Get post-finalize summary.
	 */
	async getSummary(runId: string): Promise<BulkImportSummaryResponse> {
		return apiClient.get<BulkImportSummaryResponse>(
			`${BASE}/runs/${runId}/summary`,
		);
	},

	/**
	 * Import orphan waste streams directly to a location (no re-analysis).
	 */
	async importOrphanProjects(
		runId: string,
		locationId: string,
		itemIds: string[],
	): Promise<AssignOrphansResponse> {
		return apiClient.post<AssignOrphansResponse>(
			`${BASE}/runs/${runId}/orphan-projects/import`,
			{
				location_id: locationId,
				item_ids: itemIds,
			},
		);
	},
};

export interface AssignOrphansResponse {
	projectsCreated: number;
	createdProjectIds: Record<string, string>;
	skipped: number;
}
