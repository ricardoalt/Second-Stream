"use client";

import {
	Building,
	ChevronDown,
	ChevronRight,
	FileText,
	Lightbulb,
	Loader2,
	MapPin,
	Sparkles,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { memo, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import {
	useDashboardActions,
	useDashboardPendingProposalUpdateIds,
} from "@/lib/stores/dashboard-store";
import type {
	DashboardBucket,
	DashboardRow,
	DraftItemRow,
	PersistedStreamRow,
	ProposalFollowUpState,
} from "@/lib/types/dashboard";
import {
	isDraftItem,
	isPersistedStream,
	PROPOSAL_FOLLOW_UP_LABELS,
} from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED ROW COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface StreamRowProps {
	row: DashboardRow;
	bucket: DashboardBucket;
	showReport?: boolean | undefined;
	/** Whether to show the derived status badge column */
	showStatus?: boolean | undefined;
	/** Whether to show the missing information column */
	showMissingInfo?: boolean | undefined;
}

export const StreamRow = memo(function StreamRow({
	row,
	bucket,
	showReport,
	showStatus,
	showMissingInfo,
}: StreamRowProps) {
	const router = useRouter();
	const { openDraftConfirmation } = useDashboardActions();

	const handleClick = useCallback(() => {
		if (isPersistedStream(row)) {
			// In the Proposal bucket, jump directly to the proposals tab
			const url =
				bucket === "proposal"
					? routes.project.proposals(row.projectId)
					: routes.project.detail(row.projectId);
			router.push(url);
		} else if (isDraftItem(row)) {
			openDraftConfirmation(row);
		}
	}, [row, bucket, router, openDraftConfirmation]);

	if (isPersistedStream(row)) {
		return (
			<PersistedRow
				row={row}
				bucket={bucket}
				onClick={handleClick}
				showReport={showReport}
				showStatus={showStatus}
				showMissingInfo={showMissingInfo}
			/>
		);
	}

	return <DraftRow row={row} onClick={handleClick} />;
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSISTED STREAM ROW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PersistedRowProps {
	row: PersistedStreamRow;
	bucket: DashboardBucket;
	onClick: () => void;
	showReport?: boolean | undefined;
	showStatus?: boolean | undefined;
	showMissingInfo?: boolean | undefined;
}

/** Left-border accent color per bucket — semantic OKLCH tokens for dark-mode consistency. */
const BUCKET_BORDER: Record<DashboardBucket, string> = {
	total: "border-l-transparent",
	needs_confirmation: "border-l-warning",
	missing_information: "border-l-destructive/70",
	intelligence_report: "border-l-success",
	proposal: "border-l-info",
};

/** Buckets where the stale badge is shown. */
const STALE_BUCKETS = new Set<DashboardBucket>([
	"total",
	"missing_information",
]);

const PROPOSAL_FOLLOW_UP_TRANSITIONS: Record<
	ProposalFollowUpState,
	ProposalFollowUpState[]
> = {
	uploaded: ["waiting_to_send"],
	waiting_to_send: ["waiting_response", "rejected"],
	waiting_response: [
		"waiting_to_send",
		"under_negotiation",
		"accepted",
		"rejected",
	],
	under_negotiation: ["waiting_response", "accepted", "rejected"],
	accepted: [],
	rejected: [],
};

function PersistedRow({
	row,
	bucket,
	onClick,
	showReport,
	showStatus,
	showMissingInfo,
}: PersistedRowProps) {
	const borderColor =
		bucket === "total" ? BUCKET_BORDER[row.bucket] : "border-l-transparent";
	const proposalState = row.proposalFollowUpState;
	const showProposalBadgeInline = proposalState != null;
	const showMobileReportButton = row.bucket === "intelligence_report";
	const proposalBadgeInlineClassName = showStatus ? "md:hidden" : undefined;

	const staleDays = useMemo(() => {
		const ms = Date.now() - new Date(row.lastActivityAt).getTime();
		return Math.floor(ms / 86_400_000);
	}, [row.lastActivityAt]);

	const showStaleBadge = STALE_BUCKETS.has(bucket) && staleDays >= 7;
	return (
		<div
			className={cn(
				"group relative w-full rounded-lg border border-border/40 bg-card/60 text-left",
				"border-l-3",
				borderColor,
				"hover:bg-accent/40 hover:border-border/60 cursor-pointer transition-colors duration-150",
				row.archivedAt && "opacity-60",
			)}
		>
			<button
				type="button"
				onClick={onClick}
				aria-label={`Open ${row.streamName}`}
				className="absolute inset-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			/>
			<div className="relative z-10 flex items-center gap-4 px-4 py-3 pointer-events-none">
				{/* Name + proposal badge (+ company/location on mobile) */}
				<div className="flex-1 min-w-0 space-y-1">
					<div className="flex items-center gap-2">
						<span className="font-medium truncate text-sm text-foreground">
							{row.streamName}
						</span>
						{showProposalBadgeInline && proposalState != null && (
							<ProposalStateBadge
								state={proposalState}
								{...(proposalBadgeInlineClassName
									? { className: proposalBadgeInlineClassName }
									: {})}
							/>
						)}
					</div>
					{(row.wasteCategoryLabel || row.ownerDisplayName) && (
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
							{row.wasteCategoryLabel && (
								<span className="truncate max-w-full">
									{row.wasteCategoryLabel}
								</span>
							)}
							{row.ownerDisplayName && (
								<span className="inline-flex items-center gap-1 truncate max-w-full">
									<User className="h-3 w-3 shrink-0" />
									{row.ownerDisplayName}
								</span>
							)}
						</div>
					)}
					{/* Mobile-only: company/location under name */}
					<div className="flex items-center gap-3 text-xs text-muted-foreground lg:hidden">
						{row.companyLabel && (
							<TruncatedTooltip text={row.companyLabel}>
								<span className="flex items-center gap-1 truncate">
									<Building className="h-3 w-3 shrink-0" />
									{row.companyLabel}
								</span>
							</TruncatedTooltip>
						)}
						{row.locationLabel && (
							<TruncatedTooltip text={row.locationLabel}>
								<span className="flex items-center gap-1 truncate">
									<MapPin className="h-3 w-3 shrink-0" />
									{row.locationLabel}
								</span>
							</TruncatedTooltip>
						)}
						{showMobileReportButton && (
							<ReportQuickViewButton row={row} compact />
						)}
					</div>
					{/* Stale badge */}
					{showStaleBadge && (
						<Badge
							variant="outline"
							className="text-[10px] border-warning/30 bg-warning/5 text-warning"
						>
							Stale · {staleDays}d
						</Badge>
					)}
				</div>

				{/* Client / Location — own column on lg+ */}
				<div className="hidden lg:flex flex-col gap-0.5 w-36 min-w-0">
					{row.companyLabel ? (
						<TruncatedTooltip text={row.companyLabel}>
							<span className="flex items-center gap-1 text-xs text-foreground/80 truncate">
								<Building className="h-3 w-3 shrink-0 text-muted-foreground" />
								{row.companyLabel}
							</span>
						</TruncatedTooltip>
					) : (
						<span className="text-xs italic text-muted-foreground/50">—</span>
					)}
					{row.locationLabel && (
						<TruncatedTooltip text={row.locationLabel}>
							<span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
								<MapPin className="h-2.5 w-2.5 shrink-0" />
								{row.locationLabel}
							</span>
						</TruncatedTooltip>
					)}
				</div>

				{/* Volume / Frequency */}
				<TruncatedTooltip text={row.volumeSummary || "—"}>
					<div className="hidden md:block text-xs text-muted-foreground w-28 text-right truncate">
						{row.volumeSummary || "—"}
					</div>
				</TruncatedTooltip>

				{/* Missing Information */}
				{showMissingInfo && (
					<div className="hidden md:block text-xs w-36 truncate">
						{row.missingFields.length > 0 ? (
							<MissingFieldsSummary fields={row.missingFields} />
						) : row.missingRequiredInfo ? (
							<span className="text-destructive/70">Missing info</span>
						) : (
							<span className="text-muted-foreground/50">—</span>
						)}
					</div>
				)}

				{showReport && (
					<div className="hidden md:flex justify-center w-32">
						<ReportQuickViewButton row={row} />
					</div>
				)}

				{/* Status badge column */}
				{showStatus && (
					<div className="hidden md:flex justify-center w-32">
						<StatusCell row={row} bucket={bucket} />
					</div>
				)}

				{/* Click affordance */}
				<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
			</div>
		</div>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DRAFT ITEM ROW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DraftRowProps {
	row: DraftItemRow;
	onClick: (() => void) | undefined;
	disabled?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
	bulk_import: "Import",
	voice_interview: "Voice",
};

const DRAFT_STATUS_BADGE: Record<string, { label: string; className: string }> =
	{
		pending_review: {
			label: "Pending Review",
			className:
				"border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning",
		},
		accepted: {
			label: "Accepted",
			className:
				"border-success/40 bg-success/10 text-success-foreground dark:text-success",
		},
		amended: {
			label: "Amended",
			className:
				"border-info/40 bg-info/10 text-info-foreground dark:text-info",
		},
	};

function DraftRow({ row, onClick, disabled }: DraftRowProps) {
	const statusConfig = DRAFT_STATUS_BADGE[row.draftStatus] ?? {
		label: row.draftStatus,
		className: "",
	};

	const sharedClassName = cn(
		"group flex items-center gap-4 px-4 py-3 rounded-lg w-full text-left",
		"border border-dashed",
		"transition-colors duration-150",
		disabled
			? "border-muted/40 bg-muted/5 opacity-60 cursor-default"
			: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
	);

	const content = (
		<>
			{/* Name + badges + context */}
			<div className="flex-1 min-w-0 space-y-1">
				<div className="flex items-center gap-2">
					<span className="font-medium truncate text-sm text-foreground">
						{row.streamName}
					</span>
					<Badge
						variant="outline"
						className={cn("text-xs shrink-0", statusConfig.className)}
					>
						{statusConfig.label}
					</Badge>
					<Badge
						variant="outline"
						className="text-xs border-border/40 text-muted-foreground"
					>
						{SOURCE_LABELS[row.sourceType] ?? row.sourceType}
					</Badge>
				</div>
				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					{row.companyLabel ? (
						<TruncatedTooltip text={row.companyLabel}>
							<span className="flex items-center gap-1 truncate">
								<Building className="h-3 w-3 shrink-0" />
								{row.companyLabel}
							</span>
						</TruncatedTooltip>
					) : (
						<span className="text-xs italic text-muted-foreground/60">
							Pending
						</span>
					)}
					{row.locationLabel ? (
						<TruncatedTooltip text={row.locationLabel}>
							<span className="flex items-center gap-1 truncate">
								<MapPin className="h-3 w-3 shrink-0" />
								{row.locationLabel}
							</span>
						</TruncatedTooltip>
					) : (
						<span className="text-xs italic text-muted-foreground/60">
							Pending
						</span>
					)}
				</div>
			</div>

			{/* Client / Location — desktop column */}
			<div className="hidden lg:flex flex-col gap-0.5 w-36 min-w-0">
				{row.companyLabel ? (
					<TruncatedTooltip text={row.companyLabel}>
						<span className="flex items-center gap-1 text-xs text-foreground/80 truncate">
							<Building className="h-3 w-3 shrink-0 text-muted-foreground" />
							{row.companyLabel}
						</span>
					</TruncatedTooltip>
				) : (
					<span className="text-xs italic text-muted-foreground/50">
						Pending
					</span>
				)}
				{row.locationLabel ? (
					<TruncatedTooltip text={row.locationLabel}>
						<span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
							<MapPin className="h-2.5 w-2.5 shrink-0" />
							{row.locationLabel}
						</span>
					</TruncatedTooltip>
				) : (
					<span className="text-[11px] italic text-muted-foreground/50">
						Pending
					</span>
				)}
			</div>

			{/* Volume */}
			<TruncatedTooltip text={row.volumeSummary || "Pending"}>
				<div className="hidden md:block text-xs text-muted-foreground w-28 text-right truncate">
					{row.volumeSummary || "Pending"}
				</div>
			</TruncatedTooltip>

			{/* CTA or disabled hint */}
			{disabled ? (
				<span className="text-xs text-muted-foreground/60 shrink-0 italic">
					Assign company to review
				</span>
			) : (
				<span className="text-xs font-medium text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
					Review →
				</span>
			)}
		</>
	);

	const cvStyle = {
		contentVisibility: "auto" as const,
		containIntrinsicSize: "0 56px",
	};

	if (disabled) {
		return (
			<div className={sharedClassName} style={cvStyle} aria-disabled="true">
				{content}
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={onClick}
			style={cvStyle}
			className={sharedClassName}
		>
			{content}
		</button>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROPOSAL STATE BADGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PROPOSAL_STATE_COLORS: Record<ProposalFollowUpState, string> = {
	uploaded: "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
	waiting_to_send:
		"border-info/40 bg-info/10 text-info-foreground dark:text-info",
	waiting_response:
		"border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
	under_negotiation:
		"border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning",
	accepted:
		"border-success/40 bg-success/10 text-success-foreground dark:text-success",
	rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};

function ProposalStateBadge({
	state,
	className,
}: {
	state: ProposalFollowUpState;
	className?: string;
}) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"text-xs shrink-0",
				PROPOSAL_STATE_COLORS[state],
				className,
			)}
		>
			{PROPOSAL_FOLLOW_UP_LABELS[state]}
		</Badge>
	);
}

function StatusCell({
	row,
	bucket,
}: {
	row: PersistedStreamRow;
	bucket: DashboardBucket;
}) {
	const proposalState = row.proposalFollowUpState;
	const isProposalEditable =
		proposalState != null &&
		row.canEditProposalFollowUp &&
		PROPOSAL_FOLLOW_UP_TRANSITIONS[proposalState].length > 0;

	if (bucket === "proposal" && proposalState && isProposalEditable) {
		return <ProposalStatusEditor row={row} />;
	}

	if (bucket === "proposal" && proposalState) {
		return <ProposalStateBadge state={proposalState} />;
	}

	if (bucket === "intelligence_report") {
		const reportSnapshot = buildIntelligenceReportSnapshot(row);
		return (
			<Badge
				variant="outline"
				className={cn(
					"text-[10px] shrink-0 whitespace-nowrap",
					reportSnapshot.statusTone === "ready"
						? "border-success/40 bg-success/10 text-success-foreground dark:text-success"
						: "border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning",
				)}
			>
				{reportSnapshot.statusLabel}
			</Badge>
		);
	}

	return (
		<div className="flex flex-col items-center gap-1 text-center">
			<DerivedStatusBadge row={row} />
			{bucket === "total" && (
				<span className="text-[10px] text-muted-foreground whitespace-nowrap">
					Last updated {formatRelativeDate(row.lastActivityAt)}
				</span>
			)}
		</div>
	);
}

function ReportQuickViewButton({
	row,
	compact = false,
}: {
	row: PersistedStreamRow;
	compact?: boolean;
}) {
	const router = useRouter();
	const stopRowNavigation = useCallback((event: React.SyntheticEvent) => {
		event.stopPropagation();
	}, []);
	const reportSnapshot = buildIntelligenceReportSnapshot(row);
	const handleOpenProject = useCallback(() => {
		router.push(routes.project.detail(row.projectId));
	}, [router, row.projectId]);

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					onClick={stopRowNavigation}
					onPointerDown={stopRowNavigation}
					className={cn(
						"pointer-events-auto h-7 px-2 text-xs text-info hover:text-info",
						compact && "h-6 px-1.5 text-[11px] md:hidden",
					)}
				>
					<FileText className="h-3 w-3" />
					{compact ? "Snapshot" : "Review snapshot"}
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="sm:max-w-md">
				<SheetHeader>
					<SheetTitle>{row.streamName}</SheetTitle>
					<SheetDescription>
						Quick snapshot before opening the full project.
					</SheetDescription>
				</SheetHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 text-sm">
					<div className="rounded-lg border border-success/25 bg-success/5 p-4">
						<div className="flex items-start gap-3">
							<div className="rounded-full bg-success/10 p-2 text-success">
								<Sparkles className="h-4 w-4" />
							</div>
							<div className="space-y-1">
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Intelligence snapshot
								</p>
								<p className="leading-relaxed text-foreground/90">
									{reportSnapshot.summary}
								</p>
							</div>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<ReportInfoCard
							label="Client"
							value={row.companyLabel ?? "Pending"}
						/>
						<ReportInfoCard
							label="Location"
							value={row.locationLabel ?? "Pending"}
						/>
						<ReportInfoCard
							label="Volume / Frequency"
							value={row.volumeSummary ?? "Pending"}
						/>
						<ReportInfoCard label="Status" value={reportSnapshot.statusLabel} />
						<ReportInfoCard
							label="Last updated"
							value={formatRelativeDate(row.lastActivityAt)}
						/>
					</div>

					<ReportBulletCard
						icon={Lightbulb}
						title="Key findings"
						items={reportSnapshot.findings}
					/>

					<ReportBulletCard
						icon={ChevronRight}
						title="Recommended next steps"
						items={reportSnapshot.recommendations}
					/>

					<div className="rounded-lg border border-info/30 bg-info/5 p-3">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Status
								</p>
								<p className="mt-1 font-medium">{reportSnapshot.statusLabel}</p>
							</div>
							<Badge
								variant="outline"
								className={cn(
									reportSnapshot.statusTone === "ready"
										? "border-success/40 bg-success/10 text-success-foreground dark:text-success"
										: "border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning",
								)}
							>
								{reportSnapshot.confidenceLabel}
							</Badge>
						</div>
					</div>

					<p className="text-xs text-muted-foreground">
						Review the key points here. Open the project for full details.
					</p>

					<Button type="button" onClick={handleOpenProject} className="w-full">
						Open project
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function buildIntelligenceReportSnapshot(row: PersistedStreamRow) {
	const findings = [
		row.wasteCategoryLabel
			? `${row.wasteCategoryLabel} stream identified and ready for review.`
			: "Waste stream identified and ready for review.",
		row.volumeSummary
			? `Volume / frequency: ${row.volumeSummary}.`
			: "Volume or frequency context still needs confirmation.",
		row.ownerDisplayName
			? `Assigned owner: ${row.ownerDisplayName}.`
			: "Owner not assigned yet.",
	];

	const recommendations =
		row.missingFields.length > 0
			? [
					`Confirm missing details: ${row.missingFields.slice(0, 2).join(", ")}${
						row.missingFields.length > 2 ? " and more" : ""
					}.`,
					"Review the snapshot against the project details before moving forward.",
				]
			: [
					"Review the snapshot and confirm it is ready for the next step.",
					"Open the project for more context.",
				];

	const statusTone = row.missingFields.length > 0 ? "validation" : "ready";
	const statusLabel =
		statusTone === "ready" ? "Ready for review" : "Needs validation";

	const confidenceLabel = statusLabel;

	const summary =
		row.missingFields.length > 0
			? `Intelligence snapshot for ${row.streamName}. Key details are in place, but a few fields still need validation before moving forward.`
			: `Intelligence snapshot for ${row.streamName}. The stream is ready for a quick review of findings and next steps.`;

	return {
		summary,
		findings,
		recommendations,
		statusTone,
		statusLabel,
		confidenceLabel,
	};
}

function ReportInfoCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-border/50 bg-background/80 p-3">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-sm font-medium text-foreground">{value}</p>
		</div>
	);
}

function ReportBulletCard({
	icon: Icon,
	title,
	items,
}: {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	items: string[];
}) {
	return (
		<div className="rounded-lg border border-border/50 bg-muted/20 p-3">
			<div className="flex items-center gap-2">
				<Icon className="h-4 w-4 text-primary" />
				<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{title}
				</p>
			</div>
			<div className="mt-2 space-y-2">
				{items.map((item) => (
					<p key={item} className="text-sm leading-relaxed text-foreground/90">
						{item}
					</p>
				))}
			</div>
		</div>
	);
}

function ProposalStatusEditor({ row }: { row: PersistedStreamRow }) {
	const { updateProposalFollowUpState } = useDashboardActions();
	const pendingUpdateIds = useDashboardPendingProposalUpdateIds();
	const state = row.proposalFollowUpState;
	const nextStates = state ? PROPOSAL_FOLLOW_UP_TRANSITIONS[state] : [];
	const isUpdating = pendingUpdateIds[row.projectId] === true;

	const stopRowNavigation = useCallback((event: React.SyntheticEvent) => {
		event.stopPropagation();
	}, []);
	const handleSelect = useCallback(
		async (nextState: ProposalFollowUpState) => {
			if (isUpdating) return;
			try {
				await updateProposalFollowUpState(row.projectId, nextState);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to update proposal follow-up state",
				);
			}
		},
		[isUpdating, row.projectId, updateProposalFollowUpState],
	);

	if (!state) {
		return <DerivedStatusBadge row={row} />;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					disabled={isUpdating}
					onClick={stopRowNavigation}
					onPointerDown={stopRowNavigation}
					className="pointer-events-auto inline-flex min-w-[6.75rem] items-center justify-center gap-1.5 rounded-md border border-border/50 bg-background/90 px-2.5 py-1 text-xs text-foreground shadow-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70"
				>
					{isUpdating ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : (
						<ProposalStateBadge
							state={state}
							className="border-0 bg-transparent px-0 py-0 shadow-none"
						/>
					)}
					<ChevronDown className="h-3 w-3 text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-56"
				onClick={stopRowNavigation}
			>
				<DropdownMenuLabel>Proposal follow-up</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="px-2 pb-2 text-xs text-muted-foreground">
					Current: {PROPOSAL_FOLLOW_UP_LABELS[state]}
				</div>
				{nextStates.length > 0 ? (
					nextStates.map((nextState) => (
						<DropdownMenuItem
							key={nextState}
							onSelect={() => {
								void handleSelect(nextState);
							}}
						>
							{PROPOSAL_FOLLOW_UP_LABELS[nextState]}
						</DropdownMenuItem>
					))
				) : (
					<DropdownMenuItem disabled>No next state available</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DERIVED STATUS BADGE (for Status column)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DERIVED_STATUS: Record<string, { label: string; className: string }> = {
	needs_confirmation: {
		label: "Needs Confirm",
		className:
			"border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning",
	},
	missing_information: {
		label: "Missing Info",
		className: "border-destructive/40 bg-destructive/10 text-destructive",
	},
	intelligence_report: {
		label: "Ready",
		className:
			"border-success/40 bg-success/10 text-success-foreground dark:text-success",
	},
	confirmed: {
		label: "Confirmed",
		className: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
	},
};

function DerivedStatusBadge({ row }: { row: PersistedStreamRow }) {
	// If has proposal state, use the detailed proposal badge
	if (row.proposalFollowUpState) {
		return <ProposalStateBadge state={row.proposalFollowUpState} />;
	}

	// Derive from boolean flags (priority order)
	let statusKey = "confirmed";
	if (row.pendingConfirmation) statusKey = "needs_confirmation";
	else if (row.missingRequiredInfo) statusKey = "missing_information";
	else if (row.intelligenceReady) statusKey = "intelligence_report";

	const config = DERIVED_STATUS[statusKey];
	if (!config) return null;

	return (
		<Badge
			variant="outline"
			className={cn("text-[10px] shrink-0 whitespace-nowrap", config.className)}
		>
			{config.label}
		</Badge>
	);
}

function MissingFieldsSummary({ fields }: { fields: string[] }) {
	const preview = fields.slice(0, 2);
	const remainder = fields.length - preview.length;
	const text = preview.join(", ");

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className="pointer-events-auto cursor-help text-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
				>
					{text}
					{remainder > 0 ? ` +${remainder} more` : ""}
				</button>
			</TooltipTrigger>
			<TooltipContent className="max-w-xs text-xs">
				{fields.join(", ")}
			</TooltipContent>
		</Tooltip>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRUNCATED TOOLTIP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TruncatedTooltip({
	text,
	children,
}: {
	text: string;
	children: React.ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="pointer-events-auto inline-flex max-w-full">
					{children}
				</span>
			</TooltipTrigger>
			<TooltipContent>{text}</TooltipContent>
		</Tooltip>
	);
}
