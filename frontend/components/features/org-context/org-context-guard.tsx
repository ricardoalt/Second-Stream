"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { isOrgExemptRoute, isPublicRoute } from "@/lib/constants";
import { useAuth } from "@/lib/contexts";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { OrgRequiredScreen } from "./org-required-screen";

interface OrgContextGuardProps {
	children: React.ReactNode;
}

type OrgsStatus = "idle" | "loading" | "loaded";

function LoadingShell() {
	return (
		<div className="min-h-screen bg-background">
			<header className="border-b">
				<div className="mx-auto max-w-7xl px-4 py-4">
					<Skeleton className="h-10 w-24" />
				</div>
			</header>
			<main className="flex min-h-[calc(100vh-73px)] items-center justify-center">
				<div className="w-full max-w-md space-y-4 p-4">
					<Skeleton className="h-8 w-48 mx-auto" />
					<Skeleton className="h-4 w-64 mx-auto" />
					<Skeleton className="h-64 w-full rounded-lg" />
				</div>
			</main>
		</div>
	);
}

/**
 * Guards protected routes for super admins who need organization context.
 *
 * CRITICAL: This guard BLOCKS rendering of children when org context is required
 * but not present. It does NOT render children with a modal overlay.
 *
 * Why blocking instead of overlay?
 * - NavBar and other components have hooks (useEnsureProjectsLoaded) that fire
 *   API requests on mount
 * - If we rendered children + modal, those requests would fire without
 *   X-Organization-Id header and fail with 400 errors
 * - By blocking render entirely, we prevent any data-loading hooks from mounting
 *
 * Flow:
 * 1. Auth loading? → Show loading shell
 * 2. Not super admin? → Render children (auto-scoped to their org)
 * 3. Route is exempt? → Render children (admin section, settings, etc.)
 * 4. Has selected org? → Render children normally
 * 5. No org selected? → BLOCK render, show OrgRequiredScreen
 */
export function OrgContextGuard({ children }: OrgContextGuardProps) {
	const { isSuperAdmin, isLoading: authLoading, isAuthenticated } = useAuth();
	const pathname = usePathname();
	const {
		selectedOrgId,
		organizations,
		loadOrganizations,
		selectOrganization,
		clearSelection,
	} = useOrganizationStore();

	const [orgsStatus, setOrgsStatus] = useState<OrgsStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const isPublicPath = isPublicRoute(pathname);

	// Single effect: load orgs when guard applies, then validate selection
	useEffect(() => {
		// Reset state when guard doesn't apply (logout, role change)
		if (isPublicPath || !isSuperAdmin || !isAuthenticated) {
			if (orgsStatus !== "idle") {
				setOrgsStatus("idle");
				setErrorMessage(null);
			}
			return;
		}

		const guardApplies = !isOrgExemptRoute(pathname);
		if (!guardApplies) return;

		async function loadAndValidate() {
			setOrgsStatus("loading");
			try {
				await loadOrganizations();

				const { organizations: loadedOrgs, selectedOrgId: currentOrgId } =
					useOrganizationStore.getState();

				if (currentOrgId && loadedOrgs.length > 0) {
					const orgExists = loadedOrgs.some((org) => org.id === currentOrgId);
					if (!orgExists) {
						clearSelection();
						setErrorMessage(
							"The previously selected organization is no longer available.",
						);
						toast.error("Organization unavailable - please select again");
					}
				}
			} finally {
				setOrgsStatus("loaded");
			}
		}

		if (orgsStatus === "idle") {
			void loadAndValidate();
		}
	}, [
		isPublicPath,
		isSuperAdmin,
		isAuthenticated,
		pathname,
		orgsStatus,
		loadOrganizations,
		clearSelection,
	]);

	const handleSelectOrg = useCallback(
		(orgId: string) => {
			setErrorMessage(null);
			selectOrganization(orgId);
			const org = organizations.find((o) => o.id === orgId);
			if (org) {
				toast.success(`Viewing data for ${org.name}`);
			}
		},
		[selectOrganization, organizations],
	);

	// --- Guard Logic ---

	// 0. Public routes should never be blocked by org context or auth loading UI
	if (isPublicPath) {
		return <>{children}</>;
	}

	// 1. Auth is loading - show loading shell
	if (authLoading) {
		return <LoadingShell />;
	}

	// 2. Not authenticated - let auth context handle redirect
	if (!isAuthenticated) {
		return <>{children}</>;
	}

	// 3. Not super admin - render children (they're auto-scoped to their org)
	if (!isSuperAdmin) {
		return <>{children}</>;
	}

	// 4. Route is exempt (admin section, settings, etc.) - render children
	if (isOrgExemptRoute(pathname)) {
		return <>{children}</>;
	}

	// 5. Organizations are still loading - show loading shell
	if (orgsStatus !== "loaded") {
		return <LoadingShell />;
	}

	// 6. Super admin on protected route without org - BLOCK render
	if (!selectedOrgId) {
		return (
			<OrgRequiredScreen
				organizations={organizations}
				isLoading={false}
				onSelect={handleSelectOrg}
				{...(errorMessage && { errorMessage })}
			/>
		);
	}

	// 7. Has org selected - render children normally
	return <>{children}</>;
}
