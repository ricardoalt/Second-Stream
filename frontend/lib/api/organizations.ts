import type { User, UserRole } from "@/lib/types/user";
import { apiClient } from "./client";

export interface Organization {
	id: string;
	name: string;
	slug: string;
	contactEmail: string | null;
	contactPhone: string | null;
	isActive: boolean;
	archivedAt?: string | null;
	archivedByUserId?: string | null;
	deactivatedUsersCount?: number;
	createdAt: string;
}

export interface OrganizationCreateInput {
	name: string;
	slug: string;
	contactEmail?: string;
	contactPhone?: string;
}

export interface OrgUserCreateInput {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role: Exclude<UserRole, "admin">;
}

export interface OrganizationUpdateInput {
	name?: string;
	contactEmail?: string | null;
	contactPhone?: string | null;
}

export interface OrganizationPurgeForceInput {
	confirmName: string;
	confirmPhrase: string;
	reason: string;
	ticketId: string;
}

export type OrganizationPurgeForceResult =
	| { status: "completed" }
	| { status: "pending_cleanup"; manifestId?: string };

export interface OrganizationArchiveInput {
	forceDeactivateUsers?: boolean;
}

export interface OrgUserUpdateInput {
	role?: Exclude<UserRole, "admin">;
	isActive?: boolean;
}

interface RawOrganizationResponse {
	id: string;
	name: string;
	slug: string;
	contact_email?: string | null;
	contactEmail?: string | null;
	contact_phone?: string | null;
	contactPhone?: string | null;
	is_active?: boolean;
	isActive?: boolean;
	archived_at?: string | null;
	archivedAt?: string | null;
	archived_by_user_id?: string | null;
	archivedByUserId?: string | null;
	deactivated_users_count?: number;
	deactivatedUsersCount?: number;
	created_at?: string;
	createdAt?: string;
}

interface RawUserResponse {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	company_name?: string;
	location?: string;
	sector?: string;
	subsector?: string;
	is_verified?: boolean;
	is_active?: boolean;
	created_at?: string;
	is_superuser?: boolean;
	role?: UserRole;
	organization_id?: string | null;
	permissions?: string[];
	permissions_version?: string;
	open_streams_count?: number;
	openStreamsCount?: number;
}

interface RawAgentDetailKpisResponse {
	open_streams?: number;
	openStreams?: number;
	missing_information?: number;
	missingInformation?: number;
	offers_in_progress?: number;
	offersInProgress?: number;
	completed_streams?: number;
	completedStreams?: number;
}

interface RawAgentDetailStreamResponse {
	project_id?: string;
	projectId?: string;
	stream_name?: string;
	streamName?: string;
	status: string;
	company_label?: string | null;
	companyLabel?: string | null;
	location_label?: string | null;
	locationLabel?: string | null;
	last_activity_at?: string;
	lastActivityAt?: string;
	missing_required_info?: boolean;
	missingRequiredInfo?: boolean;
	missing_fields?: string[];
	missingFields?: string[];
	proposal_follow_up_state?: string | null;
	proposalFollowUpState?: string | null;
}

interface RawAgentDetailResponse {
	user: RawUserResponse;
	kpis: RawAgentDetailKpisResponse;
	streams: RawAgentDetailStreamResponse[];
	page: number;
	size: number;
	total: number;
	pages: number;
}

export interface AgentDetailKpis {
	openStreams: number;
	missingInformation: number;
	offersInProgress: number;
	completedStreams: number;
}

export interface AgentDetailStream {
	projectId: string;
	streamName: string;
	status: string;
	companyLabel: string | null;
	locationLabel: string | null;
	lastActivityAt: string;
	missingRequiredInfo: boolean;
	missingFields: string[];
	proposalFollowUpState: string | null;
}

export interface AgentDetailResponse {
	user: User;
	kpis: AgentDetailKpis;
	streams: AgentDetailStream[];
	page: number;
	size: number;
	total: number;
	pages: number;
}

interface RawPurgeForcePendingResponse {
	error?: {
		code?: string;
		details?: {
			manifest_id?: string;
			manifestId?: string;
		};
	};
}

function parsePurgeManifestId(
	response: RawPurgeForcePendingResponse,
): string | undefined {
	return (
		response.error?.details?.manifestId ?? response.error?.details?.manifest_id
	);
}

function transformOrganization(
	response: RawOrganizationResponse,
): Organization {
	return {
		id: response.id,
		name: response.name,
		slug: response.slug,
		contactEmail: response.contactEmail ?? response.contact_email ?? null,
		contactPhone: response.contactPhone ?? response.contact_phone ?? null,
		isActive: response.isActive ?? response.is_active ?? true,
		archivedAt: response.archivedAt ?? response.archived_at ?? null,
		archivedByUserId:
			response.archivedByUserId ?? response.archived_by_user_id ?? null,
		deactivatedUsersCount:
			response.deactivatedUsersCount ?? response.deactivated_users_count ?? 0,
		createdAt:
			response.createdAt ?? response.created_at ?? new Date().toISOString(),
	};
}

function transformUser(response: RawUserResponse): User {
	return {
		id: response.id,
		email: response.email,
		firstName: response.first_name,
		lastName: response.last_name,
		companyName: response.company_name || undefined,
		location: response.location || undefined,
		sector: response.sector || undefined,
		subsector: response.subsector || undefined,
		isVerified: response.is_verified ?? false,
		isActive: response.is_active ?? true,
		createdAt: response.created_at || new Date().toISOString(),
		isSuperuser: response.is_superuser ?? false,
		role: response.role ?? "field_agent",
		organizationId: response.organization_id ?? null,
		permissions: response.permissions ?? [],
		permissionsVersion:
			response.permissions_version ?? "2026-02-28-role-authz-mvp-v1",
		openStreamsCount:
			response.openStreamsCount ?? response.open_streams_count ?? 0,
	};
}

function transformAgentDetail(
	response: RawAgentDetailResponse,
): AgentDetailResponse {
	return {
		user: transformUser(response.user),
		kpis: {
			openStreams: response.kpis.openStreams ?? response.kpis.open_streams ?? 0,
			missingInformation:
				response.kpis.missingInformation ??
				response.kpis.missing_information ??
				0,
			offersInProgress:
				response.kpis.offersInProgress ?? response.kpis.offers_in_progress ?? 0,
			completedStreams:
				response.kpis.completedStreams ?? response.kpis.completed_streams ?? 0,
		},
		streams: response.streams.map((stream) => ({
			projectId: stream.projectId ?? stream.project_id ?? "",
			streamName: stream.streamName ?? stream.stream_name ?? "",
			status: stream.status,
			companyLabel: stream.companyLabel ?? stream.company_label ?? null,
			locationLabel: stream.locationLabel ?? stream.location_label ?? null,
			lastActivityAt:
				stream.lastActivityAt ??
				stream.last_activity_at ??
				new Date().toISOString(),
			missingRequiredInfo:
				stream.missingRequiredInfo ?? stream.missing_required_info ?? false,
			missingFields: stream.missingFields ?? stream.missing_fields ?? [],
			proposalFollowUpState:
				stream.proposalFollowUpState ?? stream.proposal_follow_up_state ?? null,
		})),
		page: response.page,
		size: response.size,
		total: response.total,
		pages: response.pages,
	};
}

function withOrganizationHeader(orgId: string): Record<string, string> {
	return { "X-Organization-Id": orgId };
}

export const organizationsAPI = {
	/**
	 * List all organizations (Platform Admin only)
	 */
	async list(options?: { includeInactive?: boolean }): Promise<Organization[]> {
		const searchParams = new URLSearchParams();
		if (options?.includeInactive) {
			searchParams.set("include_inactive", "true");
		}
		const query = searchParams.toString();
		const endpoint = query ? `/organizations?${query}` : "/organizations";
		const data = await apiClient.get<RawOrganizationResponse[]>(endpoint);
		return data.map(transformOrganization);
	},

	/**
	 * Get organization by ID (Platform Admin only)
	 */
	async get(orgId: string): Promise<Organization> {
		const data = await apiClient.get<RawOrganizationResponse>(
			`/organizations/${orgId}`,
			withOrganizationHeader(orgId),
		);
		return transformOrganization(data);
	},

	/**
	 * Get current organization (any authenticated user)
	 */
	async getCurrent(): Promise<Organization> {
		const data = await apiClient.get<RawOrganizationResponse>(
			"/organizations/current",
		);
		return transformOrganization(data);
	},

	/**
	 * Create a new organization (Platform Admin only)
	 */
	async create(payload: OrganizationCreateInput): Promise<Organization> {
		const body = {
			name: payload.name,
			slug: payload.slug,
			contact_email: payload.contactEmail,
			contact_phone: payload.contactPhone,
		};
		const data = await apiClient.post<RawOrganizationResponse>(
			"/organizations",
			body,
		);
		return transformOrganization(data);
	},

	/**
	 * List users of a specific organization (Platform Admin only)
	 */
	async listOrgUsers(orgId: string): Promise<User[]> {
		const data = await apiClient.get<RawUserResponse[]>(
			`/organizations/${orgId}/users`,
			withOrganizationHeader(orgId),
		);
		return data.map(transformUser);
	},

	/**
	 * Create user in a specific organization (Platform Admin only)
	 */
	async createOrgUser(
		orgId: string,
		payload: OrgUserCreateInput,
	): Promise<User> {
		const body = {
			email: payload.email,
			password: payload.password,
			first_name: payload.firstName,
			last_name: payload.lastName,
			role: payload.role,
		};
		const data = await apiClient.post<RawUserResponse>(
			`/organizations/${orgId}/users`,
			body,
			withOrganizationHeader(orgId),
		);
		return transformUser(data);
	},

	/**
	 * List users of current organization (Org Admin or Platform Admin)
	 */
	async listMyOrgUsers(): Promise<User[]> {
		const data = await apiClient.get<RawUserResponse[]>(
			"/organizations/current/users",
		);
		return data.map(transformUser);
	},

	async getMyOrgUserDetail(
		userId: string,
		params?: { page?: number; size?: number },
	): Promise<AgentDetailResponse> {
		const search = new URLSearchParams();
		if (params?.page !== undefined) {
			search.set("page", String(params.page));
		}
		if (params?.size !== undefined) {
			search.set("size", String(params.size));
		}
		const query = search.toString();
		const endpoint = query
			? `/organizations/current/users/${userId}?${query}`
			: `/organizations/current/users/${userId}`;
		const data = await apiClient.get<RawAgentDetailResponse>(endpoint);
		return transformAgentDetail(data);
	},

	async getOrgUserDetail(
		orgId: string,
		userId: string,
		params?: { page?: number; size?: number },
	): Promise<AgentDetailResponse> {
		const search = new URLSearchParams();
		if (params?.page !== undefined) {
			search.set("page", String(params.page));
		}
		if (params?.size !== undefined) {
			search.set("size", String(params.size));
		}
		const query = search.toString();
		const endpoint = query
			? `/organizations/${orgId}/users/${userId}?${query}`
			: `/organizations/${orgId}/users/${userId}`;
		const data = await apiClient.get<RawAgentDetailResponse>(
			endpoint,
			withOrganizationHeader(orgId),
		);
		return transformAgentDetail(data);
	},

	/**
	 * Create user in current organization (Org Admin or Platform Admin)
	 */
	async createMyOrgUser(payload: OrgUserCreateInput): Promise<User> {
		const body = {
			email: payload.email,
			password: payload.password,
			first_name: payload.firstName,
			last_name: payload.lastName,
			role: payload.role,
		};
		const data = await apiClient.post<RawUserResponse>(
			"/organizations/current/users",
			body,
		);
		return transformUser(data);
	},

	/**
	 * Update an organization (Platform Admin only)
	 */
	async update(
		orgId: string,
		payload: OrganizationUpdateInput,
	): Promise<Organization> {
		const body: Record<string, unknown> = {};
		if (payload.name !== undefined) body.name = payload.name;
		if (payload.contactEmail !== undefined)
			body.contact_email = payload.contactEmail;
		if (payload.contactPhone !== undefined)
			body.contact_phone = payload.contactPhone;

		const data = await apiClient.patch<RawOrganizationResponse>(
			`/organizations/${orgId}`,
			body,
			withOrganizationHeader(orgId),
		);
		return transformOrganization(data);
	},

	async archive(
		orgId: string,
		input?: OrganizationArchiveInput,
	): Promise<Organization> {
		const body = input?.forceDeactivateUsers
			? { force_deactivate_users: true }
			: undefined;
		const data = await apiClient.post<RawOrganizationResponse>(
			`/organizations/${orgId}/archive`,
			body,
			withOrganizationHeader(orgId),
		);
		return transformOrganization(data);
	},

	async restore(orgId: string): Promise<Organization> {
		const data = await apiClient.post<RawOrganizationResponse>(
			`/organizations/${orgId}/restore`,
			undefined,
			withOrganizationHeader(orgId),
		);
		return transformOrganization(data);
	},

	async purgeForce(
		orgId: string,
		payload: OrganizationPurgeForceInput,
	): Promise<OrganizationPurgeForceResult> {
		const response = await apiClient.post<RawPurgeForcePendingResponse | null>(
			`/organizations/${orgId}/purge-force`,
			{
				confirm_name: payload.confirmName,
				confirm_phrase: payload.confirmPhrase,
				reason: payload.reason,
				ticket_id: payload.ticketId,
			},
			withOrganizationHeader(orgId),
		);

		if (response?.error?.code === "ORG_STORAGE_CLEANUP_PENDING") {
			const manifestId = parsePurgeManifestId(response);
			return {
				status: "pending_cleanup",
				...(manifestId ? { manifestId } : {}),
			};
		}

		return { status: "completed" };
	},

	/**
	 * Update user in a specific organization (Platform Admin only)
	 */
	async updateOrgUser(
		orgId: string,
		userId: string,
		payload: OrgUserUpdateInput,
	): Promise<User> {
		const body: Record<string, unknown> = {};
		if (payload.role !== undefined) body.role = payload.role;
		if (payload.isActive !== undefined) body.is_active = payload.isActive;

		const data = await apiClient.patch<RawUserResponse>(
			`/organizations/${orgId}/users/${userId}`,
			body,
			withOrganizationHeader(orgId),
		);
		return transformUser(data);
	},

	/**
	 * Update user in current organization (Org Admin or Platform Admin)
	 */
	async updateMyOrgUser(
		userId: string,
		payload: OrgUserUpdateInput,
	): Promise<User> {
		const body: Record<string, unknown> = {};
		if (payload.role !== undefined) body.role = payload.role;
		if (payload.isActive !== undefined) body.is_active = payload.isActive;

		const data = await apiClient.patch<RawUserResponse>(
			`/organizations/current/users/${userId}`,
			body,
		);
		return transformUser(data);
	},
};
