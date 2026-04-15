type MinimalUser = {
	role?: string | null;
	isSuperuser?: boolean | null;
};

export function getPostAuthLandingPath(user: MinimalUser | null): string {
	if (user?.isSuperuser) {
		return "/dashboard";
	}

	return "/dashboard";
}

export function getAdminRedirectPath(user: MinimalUser | null): string | null {
	return user?.isSuperuser || user?.role === "org_admin" ? null : "/";
}
