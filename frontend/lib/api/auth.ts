import type { User, UserRole } from "@/lib/types/user";
import { logger } from "@/lib/utils/logger";
import { apiClient } from "./client";

interface LoginRequest {
	email: string;
	password: string;
	rememberMe?: boolean;
}

interface LoginResponse {
	user: User;
	token: string;
	expiresIn: number;
}

interface RegisterRequest {
	email: string;
	password: string;
	name: string;
	company?: string;
}

interface PasswordResetRequest {
	email: string;
}

interface PasswordResetConfirmRequest {
	token: string;
	newPassword: string;
}

interface UpdateProfileRequest {
	first_name?: string;
	last_name?: string;
	company_name?: string;
	location?: string;
	sector?: string;
	subsector?: string;
}

// Backend response types (snake_case from FastAPI)
interface BackendTokenResponse {
	access_token: string;
	token_type: string;
	expires_in?: number;
}

interface BackendUserResponse {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	company_name?: string;
	location?: string;
	sector?: string;
	subsector?: string;
	is_verified: boolean;
	is_active: boolean;
	created_at: string;
	is_superuser: boolean;
	role: UserRole;
	organization_id?: string | null;
	permissions?: string[];
	permissions_version?: string;
}

// Auth API service
export const authAPI = {
	// Authentication
	async login(credentials: LoginRequest): Promise<LoginResponse> {
		// FastAPI Users requires form-urlencoded with 'username' field
		const formData = new URLSearchParams();
		formData.append("username", credentials.email); // FastAPI Users uses 'username' instead of 'email'
		formData.append("password", credentials.password);

		const response = await apiClient.post<BackendTokenResponse>(
			"/auth/jwt/login",
			formData,
			{
				"Content-Type": "application/x-www-form-urlencoded",
			},
		);

		// Backend returns: { access_token, token_type, expires_in }
		// expires_in is injected by middleware in backend
		// We need to fetch user data separately from /auth/me

		// Store access token
		const accessToken = response.access_token;
		if (accessToken) {
			apiClient.setAuthToken(accessToken);
			localStorage.setItem("access_token", accessToken);
		}

		// Fetch user data from /auth/me
		const user = await authAPI.getCurrentUser();

		const transformedResponse: LoginResponse = {
			user,
			token: accessToken,
			expiresIn: response.expires_in || 86400, // Use backend value or fallback to 24h
		};

		return transformedResponse;
	},

	async register(userData: RegisterRequest): Promise<LoginResponse> {
		// FastAPI Users expects snake_case fields
		const backendData = {
			email: userData.email,
			password: userData.password,
			first_name: userData.name.split(" ")[0] || userData.name,
			last_name: userData.name.split(" ").slice(1).join(" ") || "",
			company_name: userData.company || "",
			location: "",
			sector: "",
			is_active: true,
			is_superuser: false,
			is_verified: false,
		};

		// Register user (FastAPI Users returns user data)
		await apiClient.post<BackendUserResponse>("/auth/register", backendData);

		// After successful registration, automatically login
		return authAPI.login({
			email: userData.email,
			password: userData.password,
		});
	},

	async logout(): Promise<void> {
		const token = localStorage.getItem("access_token");
		apiClient.clearAuthToken();
		localStorage.removeItem("access_token");

		if (!token) return;

		try {
			await apiClient.post("/auth/jwt/logout", undefined, {
				Authorization: `Bearer ${token}`,
			});
		} catch (error) {
			logger.error("Logout request failed", error, "Auth");
			return;
		}
	},

	// Password management
	async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
		// FastAPI Users endpoint for password reset
		return apiClient.post<void>("/auth/forgot-password", {
			email: request.email,
		});
	},

	async confirmPasswordReset(
		request: PasswordResetConfirmRequest,
	): Promise<void> {
		// FastAPI Users endpoint for resetting password with token
		return apiClient.post<void>("/auth/reset-password", {
			token: request.token,
			password: request.newPassword,
		});
	},

	// User management
	async getCurrentUser(): Promise<User> {
		const response = await apiClient.get<BackendUserResponse>("/auth/me");

		// Transform backend snake_case to frontend camelCase
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
	},

	async updateProfile(data: UpdateProfileRequest): Promise<User> {
		// Send only non-undefined fields to backend
		const payload = Object.fromEntries(
			Object.entries(data).filter(([_, v]) => v !== undefined),
		);
		await apiClient.patch("/auth/me", payload);
		return authAPI.getCurrentUser();
	},

	async changePassword(
		_currentPassword: string,
		newPassword: string,
	): Promise<void> {
		// FastAPI Users allows password change via PATCH /auth/me
		await apiClient.patch("/auth/me", { password: newPassword });
	},

	async deleteAccount(): Promise<void> {
		await apiClient.delete<void>("/auth/me");
		authAPI.logout(); // Clear tokens after deletion
	},

	// Account verification
	async verifyEmail(token: string): Promise<void> {
		// FastAPI Users endpoint for email verification
		return apiClient.post<void>("/auth/verify", { token });
	},

	async resendVerificationEmail(): Promise<void> {
		// FastAPI Users endpoint for requesting new verification token
		return apiClient.post<void>("/auth/request-verify-token");
	},

	// Session management
	async validateSession(): Promise<{ valid: boolean; user?: User }> {
		try {
			const user = await authAPI.getCurrentUser();

			return { valid: true, user };
		} catch (error) {
			logger.error("Session validation failed", error, "Auth");
			return { valid: false };
		}
	},

	// Initialize auth from stored tokens
	initializeAuth(): boolean {
		const token = localStorage.getItem("access_token");
		if (token) {
			apiClient.setAuthToken(token);
			return true;
		}
		return false;
	},
};

// Export types
export type {
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	UpdateProfileRequest,
};
