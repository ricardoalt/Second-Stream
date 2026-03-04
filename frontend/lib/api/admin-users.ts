import type { User, UserRole } from "@/lib/types/user";
import { apiClient } from "./client";

/** Backend response shape for user data (snake_case) */
interface AdminUserResponse {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	company_name?: string | null;
	location?: string | null;
	sector?: string | null;
	subsector?: string | null;
	is_verified?: boolean;
	is_active?: boolean;
	created_at?: string;
	is_superuser?: boolean;
	role?: UserRole;
	organization_id?: string | null;
	permissions?: string[];
	permissions_version?: string;
}

export interface AdminCreateUserInput {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	isSuperuser?: boolean;
	role?: UserRole;
}

export interface AdminUpdateUserInput {
	isSuperuser?: boolean;
	isActive?: boolean;
	password?: string;
	role?: UserRole;
}

export interface TransferOrganizationInput {
	targetOrganizationId: string;
	reason: string;
	reassignToUserId?: string | null;
}

interface TransferOrganizationResponse {
	user_id?: string;
	userId?: string;
	from_organization_id?: string;
	fromOrganizationId?: string;
	to_organization_id?: string;
	toOrganizationId?: string;
	reassigned_projects_count?: number;
	reassignedProjectsCount?: number;
	transferred_at?: string;
	transferredAt?: string;
}

export interface TransferOrganizationResult {
	userId: string;
	fromOrganizationId: string;
	toOrganizationId: string;
	reassignedProjectsCount: number;
	transferredAt: string;
}

function transformTransferOrganizationResult(
	response: TransferOrganizationResponse,
): TransferOrganizationResult {
	const userId = response.userId ?? response.user_id;
	const fromOrganizationId =
		response.fromOrganizationId ?? response.from_organization_id;
	const toOrganizationId =
		response.toOrganizationId ?? response.to_organization_id;
	const reassignedProjectsCount =
		response.reassignedProjectsCount ?? response.reassigned_projects_count;
	const transferredAt = response.transferredAt ?? response.transferred_at;

	if (
		typeof userId !== "string" ||
		typeof fromOrganizationId !== "string" ||
		typeof toOrganizationId !== "string" ||
		typeof reassignedProjectsCount !== "number" ||
		typeof transferredAt !== "string"
	) {
		throw new Error("Invalid transfer organization response");
	}

	return {
		userId,
		fromOrganizationId,
		toOrganizationId,
		reassignedProjectsCount,
		transferredAt,
	};
}

function transformUser(response: AdminUserResponse): User {
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
	};
}

export const adminUsersAPI = {
	async list(): Promise<User[]> {
		const data = await apiClient.get<AdminUserResponse[]>("/admin/users");
		return data.map(transformUser);
	},
	async create(payload: AdminCreateUserInput): Promise<User> {
		const body = {
			email: payload.email,
			password: payload.password,
			first_name: payload.firstName,
			last_name: payload.lastName,
			is_superuser: payload.isSuperuser ?? false,
			is_active: true,
			role: payload.role ?? "field_agent",
		};
		const response = await apiClient.post<AdminUserResponse>(
			"/admin/users",
			body,
		);
		return transformUser(response);
	},
	async update(userId: string, payload: AdminUpdateUserInput): Promise<User> {
		const body = Object.fromEntries(
			Object.entries({
				is_superuser: payload.isSuperuser,
				is_active: payload.isActive,
				password: payload.password,
				role: payload.role,
			}).filter(
				([, value]) => value !== undefined && value !== null && value !== "",
			),
		);
		const response = await apiClient.patch<AdminUserResponse>(
			`/admin/users/${userId}`,
			body,
		);
		return transformUser(response);
	},
	async transferOrganization(
		userId: string,
		payload: TransferOrganizationInput,
	): Promise<TransferOrganizationResult> {
		const response = await apiClient.post<TransferOrganizationResponse>(
			`/admin/users/${userId}/transfer-organization`,
			{
				target_organization_id: payload.targetOrganizationId,
				reason: payload.reason,
				reassign_to_user_id: payload.reassignToUserId ?? null,
			},
		);
		return transformTransferOrganizationResult(response);
	},
};
