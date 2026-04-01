type MinimalUser = {
	role?: string | null;
	isSuperuser?: boolean | null;
};

export function getSuperAdminEntryPath(
	selectedOrgId: string | null | undefined,
): string {
	return selectedOrgId ? "/admin/workspace" : "/admin/organizations";
}

export function getOrgAdminRedirectPath(
	user: MinimalUser | null,
): string | null {
	if (user?.role === "org_admin") {
		return null;
	}

	if (user?.isSuperuser) {
		return "/admin";
	}

	return "/";
}

export function getAdminRedirectPath(isSuperAdmin: boolean): string | null {
	return isSuperAdmin ? null : "/";
}
