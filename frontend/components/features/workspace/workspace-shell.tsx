"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo } from "react";
import { FilesSection } from "@/components/features/projects/files-section";
import { Button } from "@/components/ui/button";
import type { ProjectDetail, ProjectSummary } from "@/lib/project-types";
import { useLocationStore } from "@/lib/stores/location-store";
import {
	useWorkspaceActions,
	useWorkspaceError,
	useWorkspaceLoading,
} from "@/lib/stores/workspace-store";
import { ProposalReviewModal } from "./proposal-review-modal";
import { WorkspaceCanvas } from "./workspace-canvas";
import { WorkspaceHeader } from "./workspace-header";

export type WorkspaceView = "workspace" | "files";

interface WorkspaceShellProps {
	project: ProjectSummary | ProjectDetail;
}

export function WorkspaceShell({ project }: WorkspaceShellProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const { hydrate, reset } = useWorkspaceActions();
	const loading = useWorkspaceLoading();
	const error = useWorkspaceError();

	// Normalize legacy ?tab= params → workspace view system
	const legacyTab = searchParams.get("tab");
	useEffect(() => {
		if (!legacyTab) return;
		const params = new URLSearchParams(searchParams.toString());
		params.delete("tab");
		if (legacyTab === "files") {
			params.set("view", "files");
		}
		// technical, overview, proposals all fall to workspace default (no ?view=)
		const qs = params.toString();
		router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
	}, [legacyTab, searchParams, router, pathname]);

	const viewParam = searchParams.get("view");
	const viewMode: WorkspaceView = viewParam === "files" ? "files" : "workspace";

	// Hydrate workspace on mount
	useEffect(() => {
		hydrate(project.id);
		return () => {
			reset();
		};
	}, [project.id, hydrate, reset]);

	// Derive contacts link from location
	const locationId = project.locationId;
	const location = useLocationStore((s) => s.currentLocation);
	const loadLocation = useLocationStore((s) => s.loadLocation);

	useEffect(() => {
		if (locationId && (!location || location.id !== locationId)) {
			loadLocation(locationId);
		}
	}, [locationId, location, loadLocation]);

	const contactsHref = useMemo(() => {
		if (
			!locationId ||
			!location ||
			location.id !== locationId ||
			!location.companyId
		)
			return null;
		return `/companies/${location.companyId}/locations/${locationId}`;
	}, [location, locationId]);

	// View mode navigation
	const setViewMode = useCallback(
		(mode: WorkspaceView) => {
			const params = new URLSearchParams(searchParams.toString());
			if (mode === "workspace") {
				params.delete("view");
			} else {
				params.set("view", mode);
			}
			const qs = params.toString();
			router.replace(`${pathname}${qs ? `?${qs}` : ""}`, {
				scroll: false,
			});
		},
		[router, pathname, searchParams],
	);

	const handleViewFiles = useCallback(() => {
		setViewMode("files");
	}, [setViewMode]);

	// Files view — full-screen with back button
	if (viewMode === "files") {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto px-4 py-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setViewMode("workspace")}
						className="mb-4"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to workspace
					</Button>
					<Suspense
						fallback={
							<div className="flex justify-center py-12">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						}
					>
						<FilesSection projectId={project.id} />
					</Suspense>
				</div>
			</div>
		);
	}

	// Workspace view
	return (
		<div className="min-h-screen bg-background">
			<WorkspaceHeader
				project={project}
				onViewFiles={handleViewFiles}
				contactsHref={contactsHref}
			/>
			<main className="container mx-auto px-4 py-6">
				{loading ? (
					<div className="flex justify-center py-12">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : error ? (
					<div className="text-center py-12">
						<p className="text-destructive">{error}</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-4"
							onClick={() => hydrate(project.id)}
						>
							Retry
						</Button>
					</div>
				) : (
					<WorkspaceCanvas projectId={project.id} />
				)}
			</main>
			<ProposalReviewModal projectId={project.id} />
		</div>
	);
}
