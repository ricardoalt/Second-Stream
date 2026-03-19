"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { WorkspaceShell } from "@/components/features/workspace";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useCurrentProject,
	useProjectActions,
	useProjectLoading,
} from "@/lib/stores/project-store";

export default function ProjectPage() {
	const params = useParams();
	const id = params.id as string;
	const currentProject = useCurrentProject();
	const loading = useProjectLoading();
	const { loadProject } = useProjectActions();

	useEffect(() => {
		if (id && (!currentProject || currentProject.id !== id)) {
			loadProject(id);
		}
	}, [id, currentProject, loadProject]);

	if (loading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="container mx-auto px-4 py-6">
						<div className="space-y-4">
							<Skeleton className="h-8 w-64" />
							<Skeleton className="h-4 w-32" />
							<div className="flex gap-2">
								<Skeleton className="h-6 w-20" />
								<Skeleton className="h-6 w-16" />
							</div>
						</div>
					</div>
				</div>
				<main className="container mx-auto px-4 py-6">
					<div className="space-y-4">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				</main>
			</div>
		);
	}

	if (!currentProject) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center space-y-4">
					<h1 className="text-2xl font-semibold text-foreground">
						Project not found
					</h1>
					<p className="text-muted-foreground">
						The project you are looking for does not exist or you do not have
						permission to view it.
					</p>
				</div>
			</div>
		);
	}

	return <WorkspaceShell project={currentProject} />;
}
