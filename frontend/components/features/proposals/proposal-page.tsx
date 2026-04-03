"use client";

import { ArrowLeft, Download, FileText, ListChecks } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/contexts";
import { formatDateTime } from "@/lib/format";
import type { ProposalRatingStats } from "@/lib/types/proposal-rating";
import { ExternalReportView } from "./external-report-view";
import { SectionErrorBoundary } from "./overview/section-error-boundary";
import { ProposalOverview } from "./proposal-overview";
import { ProposalRatingWidget } from "./proposal-rating-widget";
import {
	type ReportAudience,
	ReportAudienceToggle,
} from "./report-audience-toggle";
import { QuickActionsCard } from "./sidebar";
import type { Project, Proposal } from "./types";

interface ProposalPageProps {
	proposal: Proposal;
	project: Project;
	isLoading?: boolean;
	onStatusChange?: (newStatus: string) => void;
	onDownloadPDF?: (audience?: ReportAudience) => void;
}

const STATUS_BADGE_VARIANT: Record<
	Proposal["status"],
	"default" | "secondary" | "outline"
> = {
	Draft: "outline",
	Current: "default",
	Archived: "secondary",
};

export const ProposalPage = memo(function ProposalPage({
	proposal,
	project,
	isLoading = false,
	onStatusChange,
	onDownloadPDF,
}: ProposalPageProps) {
	const { isSuperAdmin } = useAuth();
	const [isChecklistOpen, setIsChecklistOpen] = useState(false);
	const [audience, setAudience] = useState<ReportAudience>("internal");
	const [ratingStats, setRatingStats] = useState<ProposalRatingStats | null>(
		null,
	);
	const handleStatsLoaded = useCallback(
		(stats: ProposalRatingStats | null) => setRatingStats(stats),
		[],
	);

	if (isLoading) {
		return <ProposalPageSkeleton />;
	}

	const handleDownloadPDF = (targetAudience: ReportAudience) => {
		if (onDownloadPDF) {
			onDownloadPDF(targetAudience);
		}
	};

	return (
		<div className="min-h-screen bg-muted/10">
			{/* Header - Sólido sin glassmorphism */}
			<header className="sticky top-0 z-40 border-b border-border bg-background">
				<div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
						<Link
							href={`/project/${project.id}`}
							className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to {project.name}
						</Link>
						<div>
							<div className="flex flex-wrap items-center gap-3">
								<h1 className="text-xl font-semibold md:text-2xl">
									{proposal.title}
								</h1>
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant={STATUS_BADGE_VARIANT[proposal.status]}>
										{proposal.status}
									</Badge>
									<Badge variant="secondary">{proposal.proposalType}</Badge>
									{ratingStats?.visible && ratingStats.criteriaAvg ? (
										<>
											<Badge variant="success">
												Overall {ratingStats.overallAvg?.toFixed(2)}
											</Badge>
											<Badge variant="outline">
												{ratingStats.ratingCount} ratings
											</Badge>
											<TooltipProvider delayDuration={150}>
												<Tooltip>
													<TooltipTrigger asChild>
														<Badge variant="muted" className="cursor-help">
															Criteria Avg
														</Badge>
													</TooltipTrigger>
													<TooltipContent>
														<p>
															Coverage:{" "}
															{ratingStats.criteriaAvg.coverageNeedsAvg.toFixed(
																2,
															)}
														</p>
														<p>
															Info quality:{" "}
															{ratingStats.criteriaAvg.qualityInfoAvg.toFixed(
																2,
															)}
														</p>
														<p>
															Business data:{" "}
															{ratingStats.criteriaAvg.businessDataAvg.toFixed(
																2,
															)}
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</>
									) : ratingStats ? (
										<Badge variant="muted">
											{ratingStats.ratingCount}/
											{ratingStats.minimumRequiredCount} ratings
										</Badge>
									) : null}
								</div>
							</div>
							<div className="mt-1 text-xs text-muted-foreground md:text-sm">
								Generated on {formatDateTime(proposal.createdAt)} · Version{" "}
								{proposal.version}
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
						{/* Report Audience Toggle */}
						<ReportAudienceToggle
							value={audience}
							onValueChange={setAudience}
						/>

						{/* PDF Download Dropdown */}
						{onDownloadPDF && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button className="gap-2">
										<Download className="h-4 w-4" />
										Download PDF
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => handleDownloadPDF("internal")}
									>
										<FileText className="h-4 w-4 mr-2" />
										Internal Report
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => handleDownloadPDF("external")}
									>
										<FileText className="h-4 w-4 mr-2" />
										Client Report
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}

						{/* Checklist Drawer */}
						<Drawer open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
							<Button
								variant="outline"
								className="gap-2"
								onClick={() => setIsChecklistOpen(true)}
							>
								<ListChecks className="h-4 w-4" />
								Checklist
							</Button>
							<DrawerContent className="px-4 pb-6">
								<DrawerHeader className="items-start text-left">
									<DrawerTitle>Project checklist</DrawerTitle>
									<CardDescription>
										Quick actions to align with the team.
									</CardDescription>
								</DrawerHeader>
								<div className="space-y-4">
									<QuickActionsCard
										proposal={proposal}
										onDownloadPDF={() => handleDownloadPDF(audience)}
										onStatusChange={onStatusChange}
										closeDrawer={() => setIsChecklistOpen(false)}
									/>
								</div>
							</DrawerContent>
						</Drawer>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 py-6 lg:py-8">
				{isSuperAdmin ? (
					<p className="mb-6 text-sm text-muted-foreground">
						Ratings are available for organization users.
					</p>
				) : (
					<ProposalRatingWidget
						projectId={project.id}
						proposalId={proposal.id}
						isWriteBlocked={proposal.status === "Archived"}
						onStatsLoaded={handleStatsLoaded}
					/>
				)}

				<SectionErrorBoundary sectionName="Proposal Content">
					{audience === "internal" ? (
						<ProposalOverview proposal={proposal} />
					) : (
						<ExternalReportView proposal={proposal} />
					)}
				</SectionErrorBoundary>
			</main>
		</div>
	);
});

/**
 * Loading skeleton for proposal page
 */
function ProposalPageSkeleton() {
	return (
		<div className="min-h-screen bg-background">
			<div className="border-b bg-card/50">
				<div className="container mx-auto px-4 py-3">
					<Skeleton className="h-5 w-40" />
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="space-y-6">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-72 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		</div>
	);
}
