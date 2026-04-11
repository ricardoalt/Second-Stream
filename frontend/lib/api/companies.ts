/**
 * Companies API client
 */

import type { SuccessResponse } from "@/lib/types/api";
import type {
	CompanyContact,
	CompanyCreate,
	CompanyDetail,
	CompanySummary,
	CompanyUpdate,
	IncomingMaterial,
	LocationContact,
	LocationCreate,
	LocationDetail,
	LocationSummary,
	LocationUpdate,
} from "@/lib/types/company";
import {
	fetchWithClientDataCache,
	invalidateClientDataCacheByPrefix,
} from "@/lib/utils/client-data-cache";
import { apiClient } from "./client";

const COMPANIES_CACHE_TTL_MS = 60_000;

export type ArchivedFilter = "active" | "archived" | "all";

type JsonBody = Record<string, unknown>;

type CompanyContactPayload = {
	name?: string;
	email?: string;
	phone?: string;
	title?: string;
	notes?: string;
	isPrimary?: boolean;
};

function compactContactPayload(data: CompanyContactPayload): JsonBody {
	const body: JsonBody = {};
	if (data.name !== undefined) body.name = data.name;
	if (data.email !== undefined) body.email = data.email;
	if (data.phone !== undefined) body.phone = data.phone;
	if (data.title !== undefined) body.title = data.title;
	if (data.notes !== undefined) body.notes = data.notes;
	if (data.isPrimary !== undefined) body.isPrimary = data.isPrimary;
	return body;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPANIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const companiesAPI = {
	/**
	 * List all companies
	 */
	async list(archived?: ArchivedFilter): Promise<CompanySummary[]> {
		const query = archived ? `?archived=${archived}` : "";
		return fetchWithClientDataCache({
			key: `companies:list:${archived ?? "default"}`,
			ttlMs: COMPANIES_CACHE_TTL_MS,
			fetcher: () => apiClient.get<CompanySummary[]>(`/companies${query}`),
		});
	},

	/**
	 * Get company details with locations
	 */
	async get(id: string): Promise<CompanyDetail> {
		return apiClient.get<CompanyDetail>(`/companies/${id}`);
	},

	/**
	 * Create a new company
	 */
	async create(data: CompanyCreate): Promise<CompanyDetail> {
		const company = await apiClient.post<CompanyDetail>("/companies", data);
		invalidateClientDataCacheByPrefix("companies:list:");
		return company;
	},

	/**
	 * Update company
	 */
	async update(id: string, data: CompanyUpdate): Promise<CompanyDetail> {
		return apiClient.put<CompanyDetail>(`/companies/${id}`, data);
	},

	/**
	 * Delete company (archive compat)
	 */
	async delete(id: string): Promise<SuccessResponse> {
		return apiClient.delete<SuccessResponse>(`/companies/${id}`);
	},

	async archiveCompany(id: string): Promise<SuccessResponse> {
		return apiClient.post<SuccessResponse>(`/companies/${id}/archive`);
	},

	async restoreCompany(id: string): Promise<SuccessResponse> {
		return apiClient.post<SuccessResponse>(`/companies/${id}/restore`);
	},

	async purgeCompany(id: string, confirmName: string): Promise<void> {
		await apiClient.post<void>(`/companies/${id}/purge`, {
			confirm_name: confirmName,
		});
	},

	async createContact(
		companyId: string,
		data: CompanyContactPayload,
	): Promise<CompanyContact> {
		return apiClient.post<CompanyContact>(
			`/companies/${companyId}/contacts`,
			compactContactPayload(data),
		);
	},

	async updateContact(
		companyId: string,
		contactId: string,
		data: CompanyContactPayload,
	): Promise<CompanyContact> {
		return apiClient.put<CompanyContact>(
			`/companies/${companyId}/contacts/${contactId}`,
			compactContactPayload(data),
		);
	},

	async deleteContact(
		companyId: string,
		contactId: string,
	): Promise<SuccessResponse> {
		return apiClient.delete<SuccessResponse>(
			`/companies/${companyId}/contacts/${contactId}`,
		);
	},
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOCATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const locationsAPI = {
	buildListUrl(companyId?: string, archived?: ArchivedFilter) {
		const searchParams = new URLSearchParams();
		if (companyId) {
			searchParams.append("company_id", companyId);
		}
		if (archived) {
			searchParams.append("archived", archived);
		}

		const query = searchParams.toString();
		return query ? `/companies/locations?${query}` : "/companies/locations";
	},

	/**
	 * List all locations (optionally filtered by company)
	 */
	async listAll(
		companyId?: string,
		archived?: ArchivedFilter,
	): Promise<LocationSummary[]> {
		const url = locationsAPI.buildListUrl(companyId, archived);
		return apiClient.get<LocationSummary[]>(url);
	},

	/**
	 * List all locations for a company
	 */
	async listByCompany(
		companyId: string,
		archived?: ArchivedFilter,
	): Promise<LocationSummary[]> {
		return locationsAPI.listAll(companyId, archived);
	},

	/**
	 * Get location details
	 */
	async get(id: string, archived?: ArchivedFilter): Promise<LocationDetail> {
		const query = archived ? `?archived=${archived}` : "";
		return apiClient.get<LocationDetail>(`/companies/locations/${id}${query}`);
	},

	/**
	 * Create a new location for a company
	 */
	async create(
		companyId: string,
		data: LocationCreate,
	): Promise<LocationSummary> {
		// Backend BaseSchema accepts camelCase via populate_by_name=True
		// No need to transform to snake_case - send as-is
		const response = await apiClient.post<LocationSummary>(
			`/companies/${companyId}/locations`,
			data,
		);

		// Backend already returns camelCase - no transformation needed
		return response;
	},

	/**
	 * Update location
	 */
	async update(id: string, data: LocationUpdate): Promise<LocationDetail> {
		return apiClient.put<LocationDetail>(`/companies/locations/${id}`, data);
	},

	/**
	 * Delete location (archive compat)
	 */
	async delete(id: string): Promise<SuccessResponse> {
		return apiClient.delete<SuccessResponse>(`/companies/locations/${id}`);
	},

	async archiveLocation(id: string): Promise<SuccessResponse> {
		return apiClient.post<SuccessResponse>(
			`/companies/locations/${id}/archive`,
		);
	},

	async restoreLocation(id: string): Promise<SuccessResponse> {
		return apiClient.post<SuccessResponse>(
			`/companies/locations/${id}/restore`,
		);
	},

	async purgeLocation(id: string, confirmName: string): Promise<void> {
		await apiClient.post<void>(`/companies/locations/${id}/purge`, {
			confirm_name: confirmName,
		});
	},

	async createContact(
		locationId: string,
		data: Omit<
			LocationContact,
			"id" | "locationId" | "createdAt" | "updatedAt"
		>,
	): Promise<LocationContact> {
		return apiClient.post<LocationContact>(
			`/companies/locations/${locationId}/contacts`,
			data,
		);
	},

	async updateContact(
		locationId: string,
		contactId: string,
		data: Partial<
			Omit<LocationContact, "id" | "locationId" | "createdAt" | "updatedAt">
		>,
	): Promise<LocationContact> {
		return apiClient.put<LocationContact>(
			`/companies/locations/${locationId}/contacts/${contactId}`,
			data,
		);
	},

	async deleteContact(
		locationId: string,
		contactId: string,
	): Promise<SuccessResponse> {
		return apiClient.delete(
			`/companies/locations/${locationId}/contacts/${contactId}`,
		);
	},

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// INCOMING MATERIALS
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	async listIncomingMaterials(locationId: string): Promise<IncomingMaterial[]> {
		return apiClient.get<IncomingMaterial[]>(
			`/companies/locations/${locationId}/incoming-materials`,
		);
	},

	async createIncomingMaterial(
		locationId: string,
		data: Omit<
			IncomingMaterial,
			"id" | "locationId" | "createdAt" | "updatedAt"
		>,
	): Promise<IncomingMaterial> {
		return apiClient.post<IncomingMaterial>(
			`/companies/locations/${locationId}/incoming-materials`,
			data,
		);
	},

	async updateIncomingMaterial(
		locationId: string,
		materialId: string,
		data: Partial<
			Omit<IncomingMaterial, "id" | "locationId" | "createdAt" | "updatedAt">
		>,
	): Promise<IncomingMaterial> {
		return apiClient.put<IncomingMaterial>(
			`/companies/locations/${locationId}/incoming-materials/${materialId}`,
			data,
		);
	},

	async deleteIncomingMaterial(
		locationId: string,
		materialId: string,
	): Promise<SuccessResponse> {
		return apiClient.delete(
			`/companies/locations/${locationId}/incoming-materials/${materialId}`,
		);
	},
};
