"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import React, { memo, useCallback, useEffect } from "react";
import { BucketTabs } from "@/components/features/dashboard/components/bucket-tabs";
import { DashboardHeader } from "@/components/features/dashboard/components/dashboard-header";
import { DraftConfirmationSheet } from "@/components/features/dashboard/components/draft-confirmation-sheet";
import { DraftPreviewRail } from "@/components/features/dashboard/components/draft-preview-rail";
import { DraftQueueTable } from "@/components/features/dashboard/components/draft-queue-table";
import { PersistedStreamTable } from "@/components/features/dashboard/components/persisted-stream-table";
import { ProposalSubfilters } from "@/components/features/dashboard/components/proposal-subfilters";
import { SectionErrorBoundary } from "@/components/features/proposals/overview/section-error-boundary";
import ClientOnly from "@/components/shared/common/client-only";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useDashboardActions,
	useDashboardBucket,
	useDashboardDraftPreview,
	useDashboardError,
	useDashboardInitialized,
} from "@/lib/stores/dashboard-store";

const DiscoveryWizard = dynamic(
	() =>
		import("@/components/features/discovery-wizard/discovery-wizard").then(
			(mod) => mod.DiscoveryWizard,
		),
	{ ssr: false, loading: () => null },
);

/**
 * Main Dashboard Content — triage-first layout.
 *
 * Bucket routing:
 * - total:               PersistedStreamTable (main) + DraftPreviewRail (aside)
 * - needs_confirmation:  DraftQueueTable (full-width)
 * - proposal:            ProposalSubfilters + PersistedStreamTable
 * - missing_information: PersistedStreamTable
 * - intelligence_report: PersistedStreamTable
 */
const DashboardContent = memo(function DashboardContent() {
	const bucket = useDashboardBucket();
	const error = useDashboardError();
	const initialized = useDashboardInitialized();
	const { loadDashboard } = useDashboardActions();
	const [createModalOpen, setCreateModalOpen] = React.useState(false);

	useEffect(() => {
		void loadDashboard();
	}, [loadDashboard]);

	const handleOpenCreateModal = useCallback(() => {
		setCreateModalOpen(true);
	}, []);

	return (
		<div className="space-y-6">
			{/* Bucket tabs + scoped search */}
			<div>
				<BucketTabs />
				<div className="mb-4">
					<DashboardHeader key={bucket} />
				</div>
				{/* Error state (Fix #4) */}
				{error && initialized ? (
					<DashboardError message={error} onRetry={loadDashboard} />
				) : (
					<div
						role="tabpanel"
						id={`bucket-panel-${bucket}`}
						aria-labelledby={`bucket-tab-${bucket}`}
						className="rounded-lg border border-border/40 bg-card/30 p-4"
					>
						<AnimatePresence mode="wait">
							<motion.div
								key={initialized ? bucket : "skeleton"}
								initial={{ opacity: 0, y: 6 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -6 }}
								transition={{ duration: 0.15 }}
							>
								<BucketContent
									bucket={bucket}
									onCreateProject={handleOpenCreateModal}
								/>
							</motion.div>
						</AnimatePresence>
					</div>
				)}
			</div>

			{/* Create wizard modal */}
			<DiscoveryWizard
				open={createModalOpen}
				onOpenChange={setCreateModalOpen}
			/>
			<DraftConfirmationSheet />
		</div>
	);
});

/**
 * Renders the correct view for each bucket.
 */
function BucketContent({
	bucket,
	onCreateProject,
}: {
	bucket: string;
	onCreateProject: () => void;
}) {
	switch (bucket) {
		case "total":
			return (
				<div className="flex flex-col lg:flex-row gap-6">
					<div className="flex-1 min-w-0">
						<PersistedStreamTable onCreateProject={onCreateProject} />
						{/* Mobile-only draft awareness (rail is hidden below lg) */}
						<MobileDraftBanner />
					</div>
					<aside className="hidden lg:block w-80 shrink-0">
						<DraftPreviewRail />
					</aside>
				</div>
			);

		case "needs_confirmation":
			return <DraftQueueTable />;

		case "proposal":
			return (
				<div className="space-y-4">
					<ProposalSubfilters />
					<PersistedStreamTable />
				</div>
			);

		case "missing_information":
		case "intelligence_report":
			return <PersistedStreamTable />;

		default:
			return <PersistedStreamTable />;
	}
}

/**
 * Mobile-only banner shown when the draft preview rail is hidden (below lg).
 * Surfaces draft awareness on small screens.
 */
function MobileDraftBanner() {
	const draftPreview = useDashboardDraftPreview();
	const { openFullDraftQueue } = useDashboardActions();

	if (!draftPreview || draftPreview.total === 0) return null;

	return (
		<button
			type="button"
			onClick={openFullDraftQueue}
			className="mt-4 flex w-full items-center gap-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left transition-colors hover:bg-amber-500/10 lg:hidden"
		>
			<AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
			<span className="flex-1 text-sm text-foreground">
				<strong>{draftPreview.total}</strong>{" "}
				{draftPreview.total === 1 ? "draft" : "drafts"} awaiting review
			</span>
			<span className="text-xs font-medium text-amber-600 dark:text-amber-400">
				Review →
			</span>
		</button>
	);
}

/**
 * Fix #4 — Visible, retryable error state.
 */
function DashboardError({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
			<AlertCircle className="h-8 w-8 text-destructive" />
			<div className="space-y-1">
				<h3 className="text-sm font-medium text-foreground">
					Failed to load dashboard
				</h3>
				<p className="text-sm text-muted-foreground max-w-md">{message}</p>
			</div>
			<Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
				<RefreshCw className="h-3.5 w-3.5" />
				Try Again
			</Button>
		</div>
	);
}

/**
 * Dashboard skeleton for initial page load.
 */
function DashboardSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header skeleton */}
			<div className="flex items-center gap-3">
				<Skeleton className="h-9 flex-1 max-w-sm" />
				<Skeleton className="h-9 w-36" />
			</div>

			{/* Stat cards skeleton */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
				{[1, 2, 3, 4, 5].map((i) => (
					<div
						key={i}
						className="rounded-lg border border-border/30 bg-card/40 px-4 py-3.5 space-y-2"
					>
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-7 w-12" />
						<Skeleton className="h-3 w-full" />
					</div>
				))}
			</div>

			{/* Table skeleton */}
			<div className="space-y-2">
				{[1, 2, 3, 4, 5, 6].map((i) => (
					<div key={i} className="flex items-center gap-4 px-4 py-3">
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-2/3" />
							<Skeleton className="h-3 w-1/3" />
						</div>
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-3 w-20" />
					</div>
				))}
			</div>
		</div>
	);
}

// Main Dashboard Page
export default function DashboardPage() {
	return (
		<SectionErrorBoundary sectionName="Dashboard">
			<ClientOnly fallback={<DashboardSkeleton />}>
				<DashboardContent />
			</ClientOnly>
		</SectionErrorBoundary>
	);
}
