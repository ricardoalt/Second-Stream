"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import {
	AdminMobileNav,
	AdminSidebar,
	OrgSwitcher,
} from "@/components/features/admin";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/contexts";
import { getAdminRedirectPath } from "@/lib/routing/workspace-guards";

export default function AdminLayout({ children }: { children: ReactNode }) {
	const { isSuperAdmin, isLoading } = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const showOrgSwitcher = !pathname.startsWith("/admin/users");

	useEffect(() => {
		if (isLoading) {
			return;
		}

		const redirectPath = getAdminRedirectPath(isSuperAdmin);
		if (redirectPath) {
			router.replace(redirectPath);
		}
	}, [isLoading, isSuperAdmin, router]);

	if (isLoading || !isSuperAdmin) {
		return (
			<div className="flex h-[calc(100vh-4rem)]">
				<div className="hidden md:block w-64 border-r bg-card/30">
					<div className="p-5 border-b">
						<div className="flex items-center gap-3">
							<Skeleton className="h-9 w-9 rounded-lg" />
							<div className="space-y-1.5">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-20" />
							</div>
						</div>
					</div>
					<div className="p-4 space-y-2">
						<Skeleton className="h-12 w-full rounded-xl" />
						<Skeleton className="h-12 w-full rounded-xl" />
					</div>
				</div>
				<div className="flex-1 flex flex-col">
					<div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-10 w-[220px]" />
					</div>
					<div className="flex-1 p-4 md:p-6">
						<Skeleton className="h-8 w-48 mb-6" />
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Skeleton className="h-24 rounded-xl" />
							<Skeleton className="h-24 rounded-xl" />
							<Skeleton className="h-24 rounded-xl" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-4rem)]">
			<AdminSidebar />
			<div className="flex-1 flex flex-col overflow-hidden">
				<header className="flex items-center justify-between border-b border-border/50 bg-card/20 backdrop-blur-sm px-4 py-3 md:px-6">
					<div className="flex items-center gap-3">
						<AdminMobileNav />
						<div className="hidden md:block">
							<h1 className="text-base font-medium text-foreground">
								Admin Console
							</h1>
							<p className="text-xs text-muted-foreground">
								Manage organizations and users
							</p>
						</div>
					</div>
					{showOrgSwitcher ? (
						<OrgSwitcher />
					) : (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge
										variant="outline"
										className="text-amber-600 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
									>
										Platform-wide
									</Badge>
								</TooltipTrigger>
								<TooltipContent>
									<p>
										Platform admins are global. Org filters do not apply here.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</header>
				<main className="flex-1 overflow-auto p-4 md:p-6 bg-background/50">
					{children}
				</main>
			</div>
		</div>
	);
}
