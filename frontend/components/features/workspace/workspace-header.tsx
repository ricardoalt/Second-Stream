"use client";

import {
	Archive,
	ChevronDown,
	ChevronRight,
	Contact,
	Edit,
	FileText,
	Home,
	MoreHorizontal,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArchivedBanner } from "@/components/shared/archived-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog";
import { ConfirmPurgeDialog } from "@/components/ui/confirm-purge-dialog";
import { ConfirmRestoreDialog } from "@/components/ui/confirm-restore-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { STATUS_COLORS } from "@/lib/project-status";
import type { ProjectDetail, ProjectSummary } from "@/lib/project-types";
import { routes } from "@/lib/routes";
import { useProjectActions } from "@/lib/stores/project-store";
import {
	useWorkspaceDerived,
	useWorkspaceSummaryStale,
} from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils";

const EditProjectDialog = dynamic(
	() =>
		import("@/components/features/projects/edit-project-dialog").then(
			(mod) => mod.EditProjectDialog,
		),
	{ ssr: false, loading: () => null },
);

interface WorkspaceHeaderProps {
	project: ProjectSummary | ProjectDetail;
	onViewFiles: () => void;
	contactsHref: string | null;
}

export function WorkspaceHeader({
	project,
	onViewFiles,
	contactsHref,
}: WorkspaceHeaderProps) {
	const router = useRouter();
	const { archiveProject, restoreProject, purgeProject } = useProjectActions();
	const {
		canArchiveProject,
		canEditProject,
		canRestoreProject,
		canPurgeProject,
	} = usePermissions();
	const derived = useWorkspaceDerived();
	const summaryStale = useWorkspaceSummaryStale();

	const [summaryExpanded, setSummaryExpanded] = useState(false);

	const [showEditDialog, setShowEditDialog] = useState(false);
	const [showArchiveDialog, setShowArchiveDialog] = useState(false);
	const [showRestoreDialog, setShowRestoreDialog] = useState(false);
	const [showPurgeDialog, setShowPurgeDialog] = useState(false);
	const [isArchiving, setIsArchiving] = useState(false);
	const [isRestoring, setIsRestoring] = useState(false);
	const [isPurging, setIsPurging] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);

	const isArchived = Boolean(project.archivedAt);

	const handleArchive = async () => {
		setIsArchiving(true);
		try {
			await archiveProject(project.id);
			toast.success("Project archived", {
				description: `"${project.name}" has been archived`,
			});
			setShowArchiveDialog(false);
		} catch {
			toast.error("Archive failed");
		} finally {
			setIsArchiving(false);
		}
	};

	const handleRestore = async () => {
		setIsRestoring(true);
		try {
			await restoreProject(project.id);
			toast.success("Project restored", {
				description: `"${project.name}" has been restored`,
			});
			setShowRestoreDialog(false);
		} catch {
			toast.error("Restore failed");
		} finally {
			setIsRestoring(false);
		}
	};

	const handlePurge = async () => {
		setIsPurging(true);
		try {
			await purgeProject(project.id, project.name);
			toast.success("Project permanently deleted");
			router.push(routes.dashboard);
		} catch {
			toast.error("Purge failed");
			setIsPurging(false);
		}
	};

	return (
		<header className="border-b bg-card">
			<div className="container mx-auto px-4 py-6">
				{/* Archived Banner */}
				{isArchived && project.archivedAt && (
					<ArchivedBanner
						entityType="project"
						entityName={project.name}
						archivedAt={project.archivedAt}
						canRestore={canRestoreProject(project)}
						canPurge={canPurgeProject()}
						onRestore={() => setShowRestoreDialog(true)}
						onPurge={() => setShowPurgeDialog(true)}
						loading={isRestoring || isPurging}
					/>
				)}

				{/* Breadcrumb */}
				<nav
					aria-label="Breadcrumb"
					className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4"
				>
					<Link
						href="/dashboard"
						className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
					>
						<Home className="h-3.5 w-3.5" aria-hidden="true" />
						<span className="hidden sm:inline">Dashboard</span>
					</Link>
					<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
					<span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
						{project.name}
					</span>
				</nav>

				{/* Title row */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-3 mb-1 flex-wrap">
							<h1 className="text-xl sm:text-2xl font-bold truncate">
								{project.name}
							</h1>
							<Badge
								variant="secondary"
								className={
									STATUS_COLORS[project.status] ??
									"bg-muted text-muted-foreground"
								}
							>
								{project.status}
							</Badge>
							{isArchived && (
								<Badge
									variant="outline"
									className="border-amber-500 text-amber-500"
								>
									Archived
								</Badge>
							)}
						</div>
						<p className="text-sm text-muted-foreground mb-4">
							{project.client} &bull; {project.location || project.projectType}
						</p>

						{/* Summary */}
						<div className="mb-3 max-w-2xl">
							{derived.summary ? (
								<button
									type="button"
									onClick={() => setSummaryExpanded((v) => !v)}
									className="text-left w-full"
									aria-expanded={summaryExpanded}
									aria-controls="workspace-summary-text"
								>
									<div className="flex items-center gap-2 mb-0.5">
										<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
											Summary
										</span>
										{summaryStale && (
											<Badge
												variant="outline"
												className="text-xs text-amber-600 border-amber-300"
											>
												Needs refresh
											</Badge>
										)}
										<ChevronDown
											className={cn(
												"h-3 w-3 text-muted-foreground transition-transform",
												summaryExpanded && "rotate-180",
											)}
										/>
									</div>
									<p
										id="workspace-summary-text"
										className={cn(
											"text-sm text-muted-foreground",
											!summaryExpanded && "line-clamp-2",
										)}
									>
										{derived.summary}
									</p>
								</button>
							) : (
								<p className="text-xs text-muted-foreground italic">
									No summary yet — click Start analysis to generate
								</p>
							)}
						</div>

						{/* Coverage bar */}
						<div className="max-w-md">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium">
									Information Coverage
								</span>
								<span className="text-sm font-semibold text-primary">
									{derived.informationCoverage}%
								</span>
							</div>
							<Progress value={derived.informationCoverage} className="h-2" />
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
						{contactsHref && (
							<Button
								variant="outline"
								size="sm"
								asChild
								className="hidden sm:inline-flex"
							>
								<Link href={contactsHref}>
									<Contact className="mr-2 h-4 w-4" />
									Contacts
								</Link>
							</Button>
						)}

						<Button
							variant="outline"
							size="sm"
							onClick={onViewFiles}
							className="hidden sm:inline-flex"
						>
							<FileText className="mr-2 h-4 w-4" />
							Files
						</Button>

						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<Button size="sm" disabled>
										Discovery Complete
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent>Coming soon in v2</TooltipContent>
						</Tooltip>

						{/* More actions dropdown */}
						<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9"
									aria-label="More actions"
								>
									<MoreHorizontal className="h-4 w-4" aria-hidden="true" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{/* Mobile-only items */}
								{contactsHref && (
									<DropdownMenuItem
										className="sm:hidden"
										onSelect={() => router.push(contactsHref)}
									>
										<Contact className="mr-2 h-4 w-4" />
										Contacts
									</DropdownMenuItem>
								)}
								<DropdownMenuItem className="sm:hidden" onSelect={onViewFiles}>
									<FileText className="mr-2 h-4 w-4" />
									Files
								</DropdownMenuItem>
								<DropdownMenuSeparator className="sm:hidden" />

								{/* Always visible */}
								<DropdownMenuItem
									disabled={isArchived || !canEditProject(project)}
									onSelect={(event) => {
										event.preventDefault();
										setMenuOpen(false);
										requestAnimationFrame(() => {
											setShowEditDialog(true);
										});
									}}
								>
									<Edit className="mr-2 h-4 w-4" />
									Edit Project
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								{!isArchived && canArchiveProject(project) && (
									<DropdownMenuItem
										className="text-amber-600 focus:text-amber-600"
										onSelect={(event) => {
											event.preventDefault();
											setMenuOpen(false);
											requestAnimationFrame(() => {
												setShowArchiveDialog(true);
											});
										}}
									>
										<Archive className="mr-2 h-4 w-4" />
										Archive Project
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>

			<ConfirmArchiveDialog
				open={showArchiveDialog}
				onOpenChange={setShowArchiveDialog}
				onConfirm={handleArchive}
				entityType="project"
				entityName={project.name}
				loading={isArchiving}
			/>

			<ConfirmRestoreDialog
				open={showRestoreDialog}
				onOpenChange={setShowRestoreDialog}
				onConfirm={handleRestore}
				entityType="project"
				entityName={project.name}
				loading={isRestoring}
			/>

			<ConfirmPurgeDialog
				open={showPurgeDialog}
				onOpenChange={setShowPurgeDialog}
				onConfirm={handlePurge}
				entityType="project"
				entityName={project.name}
				loading={isPurging}
			/>

			<EditProjectDialog
				open={showEditDialog}
				onOpenChange={setShowEditDialog}
				project={project}
			/>
		</header>
	);
}
