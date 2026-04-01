"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { AgentShellLayout } from "@/components/features/agent-shell/agent-shell-layout";
import { useAuth } from "@/lib/contexts";
import { getAdminRedirectPath } from "@/lib/routing/workspace-guards";

const PLATFORM_ROUTE_PREFIXES = [
	"/admin/organizations",
	"/admin/users",
	"/admin/feedback",
	"/admin/proposal-ratings",
] as const;

function isPlatformRoute(pathname: string): boolean {
	return PLATFORM_ROUTE_PREFIXES.some((routePrefix) =>
		pathname.startsWith(routePrefix),
	);
}

export default function AdminLayout({ children }: { children: ReactNode }) {
	const { user, isSuperAdmin, isLoading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const platformRoute = isPlatformRoute(pathname);

	useEffect(() => {
		if (isLoading) {
			return;
		}

		const redirectPath = getAdminRedirectPath(user);
		if (redirectPath) {
			router.replace(redirectPath);
			return;
		}

		if (user?.role === "org_admin" && platformRoute) {
			router.replace("/dashboard");
		}
	}, [isLoading, platformRoute, router, user]);

	if (isLoading || !user || (!isSuperAdmin && user.role !== "org_admin")) {
		return null;
	}

	if (user.role === "org_admin" && platformRoute) {
		return null;
	}

	return <AgentShellLayout>{children}</AgentShellLayout>;
}
