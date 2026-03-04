"use client";

import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { authAPI } from "@/lib/api/auth";
import { apiClient } from "@/lib/api/client";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { isPublicRoute } from "@/lib/constants";
import { SELECTED_ORG_STORAGE_KEY } from "@/lib/constants/storage";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { useProjectStore } from "@/lib/stores/project-store";
import { clearTechnicalStorageKeys } from "@/lib/stores/technical-data-persistence";
import type { User } from "@/lib/types/user";
import { logger } from "@/lib/utils/logger";

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	isAdmin: boolean;
	isSuperAdmin: boolean;
	isOrgAdmin: boolean;
	canWriteClientData: boolean;
	canCreateClientData: boolean;
	canWriteLocationContacts: boolean;
	login: (email: string, password: string) => Promise<void>;
	register: (
		email: string,
		password: string,
		firstName: string,
		lastName: string,
		company?: string,
	) => Promise<void>;
	logout: () => void;
	updateUser: (data: Partial<User>) => Promise<void>;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearUserData(): void {
	localStorage.removeItem("h2o-project-store");
	clearTechnicalStorageKeys();
	localStorage.removeItem("active-proposal-generation");
	localStorage.removeItem("waste-company-store");
	localStorage.removeItem("waste-location-store");
	localStorage.removeItem(SELECTED_ORG_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();
	const pathname = usePathname();
	const resetProjectStore = useProjectStore((state) => state.resetStore);
	const resetOrganizationStore = useOrganizationStore(
		(state) => state.resetStore,
	);
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);
	const previousOrgIdRef = useRef<string | null>(selectedOrgId);

	useEffect(() => {
		// Global 401 handler - uses hard refresh to ensure clean state
		apiClient.setUnauthorizedHandler(() => {
			logger.warn("Global 401: Clearing session", "AuthContext");
			authAPI.logout();
			setUser(null);
			clearUserData();
			resetProjectStore();
			resetOrganizationStore();
			if (window.location.pathname !== "/login") {
				window.location.href = "/login";
			}
		});

		const initAuth = async () => {
			const hasToken = authAPI.initializeAuth();
			if (hasToken) {
				try {
					const response = await authAPI.validateSession();
					if (response.valid && response.user) {
						setUser(response.user);
					} else {
						authAPI.logout();
					}
				} catch {
					authAPI.logout();
				}
			}
			setIsLoading(false);
		};

		initAuth();
	}, [resetProjectStore, resetOrganizationStore]);

	useEffect(() => {
		if (isLoading) return;

		if (!user && !isPublicRoute(pathname)) {
			router.replace("/login");
		} else if (user && (pathname === "/login" || pathname === "/register")) {
			router.replace("/dashboard");
		}
	}, [user, isLoading, pathname, router]);

	const login = async (email: string, password: string) => {
		try {
			setIsLoading(true);
			clearUserData();
			resetProjectStore();
			resetOrganizationStore();
			const response = await authAPI.login({ email, password });
			setUser(response.user);
			toast.success("Login successful");
		} catch (error) {
			toast.error("Login failed. Please check your credentials.");
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	const register = async (
		email: string,
		password: string,
		firstName: string,
		lastName: string,
		company?: string,
	) => {
		try {
			setIsLoading(true);
			clearUserData();
			resetProjectStore();
			resetOrganizationStore();
			const response = await authAPI.register({
				email,
				password,
				name: `${firstName} ${lastName}`,
				...(company && { company }),
			});
			setUser(response.user);
			toast.success("Registration successful");
		} catch {
			toast.error("Registration failed. Try with another email.");
			throw new Error("Registration failed");
		} finally {
			setIsLoading(false);
		}
	};

	const logout = () => {
		authAPI.logout();
		setUser(null);
		clearUserData();
		resetProjectStore();
		resetOrganizationStore();
		toast.success("Session closed");
		router.push("/login");
	};

	const updateUser = async (data: Partial<User>) => {
		const backendData: Record<string, string | undefined> = {};
		if (data.firstName !== undefined) backendData.first_name = data.firstName;
		if (data.lastName !== undefined) backendData.last_name = data.lastName;
		if (data.companyName !== undefined)
			backendData.company_name = data.companyName;
		if (data.location !== undefined) backendData.location = data.location;
		if (data.sector !== undefined) backendData.sector = data.sector;
		if (data.subsector !== undefined) backendData.subsector = data.subsector;

		const updatedUser = await authAPI.updateProfile(backendData);
		setUser(updatedUser);
	};

	// Only logout on 401; 403 means action denied, not auth failure
	const refreshUser = useCallback(async () => {
		try {
			const currentUser = await authAPI.getCurrentUser();
			setUser(currentUser);
		} catch (error: unknown) {
			const status =
				error && typeof error === "object" && "status" in error
					? (error as { status?: unknown }).status
					: undefined;
			if (status === 401) {
				setUser(null);
			}
			// 403: Keep session, user is authenticated but action was denied
			// Network/5xx: silently keep current session
		}
	}, []);

	useEffect(() => {
		if (!user?.isSuperuser) {
			previousOrgIdRef.current = selectedOrgId;
			return;
		}
		if (previousOrgIdRef.current === selectedOrgId) {
			return;
		}
		previousOrgIdRef.current = selectedOrgId;
		void refreshUser();
	}, [refreshUser, selectedOrgId, user?.isSuperuser]);

	const hasPermission = (permission: string): boolean =>
		Boolean(user?.permissions?.includes(permission));

	const canWriteClientData = Boolean(
		hasPermission(PERMISSIONS.COMPANY_UPDATE) ||
			hasPermission(PERMISSIONS.LOCATION_UPDATE) ||
			hasPermission(PERMISSIONS.PROJECT_UPDATE),
	);
	const canCreateClientData = Boolean(
		hasPermission(PERMISSIONS.COMPANY_CREATE) ||
			hasPermission(PERMISSIONS.LOCATION_CREATE) ||
			hasPermission(PERMISSIONS.PROJECT_CREATE) ||
			hasPermission(PERMISSIONS.BULK_IMPORT_MANAGE) ||
			hasPermission(PERMISSIONS.VOICE_INTERVIEW_MANAGE),
	);
	const canWriteLocationContacts = Boolean(
		hasPermission(PERMISSIONS.LOCATION_CONTACT_CREATE) ||
			hasPermission(PERMISSIONS.LOCATION_CONTACT_UPDATE) ||
			hasPermission(PERMISSIONS.INCOMING_MATERIAL_CREATE) ||
			hasPermission(PERMISSIONS.INCOMING_MATERIAL_UPDATE),
	);

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				isAuthenticated: !!user,
				isAdmin: !!user?.isSuperuser,
				isSuperAdmin: !!user?.isSuperuser,
				isOrgAdmin: user?.role === "org_admin",
				canWriteClientData,
				canCreateClientData,
				canWriteLocationContacts,
				login,
				register,
				logout,
				updateUser,
				refreshUser,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextType {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
}
