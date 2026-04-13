type AccountStatus = "lead" | "active" | null | undefined;

export function resolveCompanyDetailRedirect(params: {
	companyId: string | null | undefined;
	accountStatus: AccountStatus;
	origin: "lead" | "client";
}): string | null {
	const { companyId, accountStatus, origin } = params;

	if (!companyId) {
		return null;
	}

	if (origin === "client" && accountStatus === "lead") {
		return `/leads/${companyId}`;
	}

	if (origin === "lead" && accountStatus === "active") {
		return `/clients/${companyId}`;
	}

	return null;
}
