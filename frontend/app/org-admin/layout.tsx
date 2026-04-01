"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import {
	OrgAdminMobileNav,
	OrgAdminSidebar,
} from "@/components/features/org-admin";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/contexts";
import { getOrgAdminRedirectPath } from "@/lib/routing/workspace-guards";

export default function OrgAdminLayout({ children }: { children: ReactNode }) {
	const { user, isAuthenticated, isLoading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (isLoading || !isAuthenticated || !user) {
			return;
		}

		const redirectPath = getOrgAdminRedirectPath(user);
		if (redirectPath) {
			router.replace(redirectPath);
		}
	}, [isAuthenticated, isLoading, router, user]);

	if (isLoading || !user || user.role !== "org_admin") {
		return (
			<div className="flex h-[calc(100vh-4rem)]">
				<div className="hidden w-64 border-r bg-card/30 md:block">
					<div className="space-y-2 p-4">
						<Skeleton className="h-10 w-full rounded-xl" />
						<Skeleton className="h-10 w-full rounded-xl" />
						<Skeleton className="h-10 w-full rounded-xl" />
					</div>
				</div>
				<div className="flex flex-1 flex-col">
					<div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
						<Skeleton className="h-5 w-36" />
					</div>
					<div className="flex-1 p-4 md:p-6">
						<Skeleton className="h-7 w-56" />
					</div>
				</div>
			</div>
		);
	}

	const pageTitle =
		pathname === "/org-admin" ? "Dashboard" : "Organization Workspace";

	return (
		<div className="flex h-[calc(100vh-4rem)]">
			<OrgAdminSidebar />
			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="flex items-center justify-between border-b border-border/50 bg-card/20 px-4 py-3 md:px-6">
					<div className="flex items-center gap-3">
						<OrgAdminMobileNav />
						<div>
							<h1 className="text-base font-medium text-foreground">
								{pageTitle}
							</h1>
							<p className="text-xs text-muted-foreground">
								Org-admin workspace
							</p>
						</div>
					</div>
				</header>
				<main className="flex-1 overflow-auto bg-background/50 p-4 md:p-6">
					{children}
				</main>
			</div>
		</div>
	);
}
