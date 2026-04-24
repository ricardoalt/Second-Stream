type MinimalUser = {
	role?: string | null;
	isSuperuser?: boolean | null;
};

export function getPostAuthLandingPath(user: MinimalUser | null): string {
	void user;
	return "/chat";
}

export function getAdminRedirectPath(user: MinimalUser | null): string | null {
	return user?.isSuperuser || user?.role === "org_admin" ? null : "/";
}
