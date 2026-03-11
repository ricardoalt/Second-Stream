"use client";

import {
	Archive,
	ArrowLeft,
	Building2,
	Edit,
	Loader2,
	MapPin,
	MoreVertical,
	Plus,
	Trash2,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
/**
 * Company detail page - Shows company info and locations
 * Combines company details and location management in one view
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ImportReviewSection } from "@/components/features/bulk-import/import-review-section";
import { InlineDropZone } from "@/components/features/bulk-import/inline-drop-zone";
import { InlineImportProgress } from "@/components/features/bulk-import/inline-import-progress";
import { CompanyContactsCard } from "@/components/features/companies/company-contacts-card";
import { CreateCompanyDialog } from "@/components/features/companies/create-company-dialog";
import { CreateLocationDialog } from "@/components/features/locations/create-location-dialog";
import { VoiceInterviewLauncher } from "@/components/features/voice-interview/voice-interview-launcher";
import { VoiceProcessingProgress } from "@/components/features/voice-interview/voice-processing-progress";
import { VoiceReviewWorkspace } from "@/components/features/voice-interview/voice-review-workspace";
import { ArchivedBanner } from "@/components/shared/archived-banner";
import { formatSubsector } from "@/components/shared/forms/compact-sector-select";
import { Breadcrumb } from "@/components/shared/navigation/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArchivedFilterSelect } from "@/components/ui/archived-filter-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmArchiveDialog } from "@/components/ui/confirm-archive-dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { ConfirmPurgeDialog } from "@/components/ui/confirm-purge-dialog";
import { ConfirmRestoreDialog } from "@/components/ui/confirm-restore-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BulkImportRun } from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import type { ArchivedFilter } from "@/lib/api/companies";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useLocationStore } from "@/lib/stores/location-store";
import type { LocationSummary } from "@/lib/types/company";
import { ADDRESS_TYPE_LABELS, CUSTOMER_TYPE_LABELS } from "@/lib/types/company";

export default function CompanyDetailPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const companyId = params.id as string;
	const { canCreateClientData } = useAuth();
	const {
		canEditCompany,
		canDeleteLocation,
		canArchiveCompany,
		canRestoreCompany,
		canPurgeCompany,
	} = usePermissions();

	const {
		currentCompany,
		loading,
		loadCompany,
		archiveCompany,
		restoreCompany,
		purgeCompany,
		error: companyError,
		clearError: clearCompanyError,
	} = useCompanyStore();
	const {
		locations: allLocations,
		loadLocationsByCompany,
		deleteLocation,
		error: locationsError,
		clearError: clearLocationsError,
	} = useLocationStore();

	const [locationsFilter, setLocationsFilter] =
		useState<ArchivedFilter>("active");

	// Filter locations for current company only (store may have cached data from other companies)
	const locations = useMemo(
		() => allLocations.filter((loc) => loc.companyId === companyId),
		[allLocations, companyId],
	);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [locationToDelete, setLocationToDelete] =
		useState<LocationSummary | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);

	// Bulk import state
	const [inlineUploading, setInlineUploading] = useState(false);
	const [activeImportRun, setActiveImportRun] = useState<BulkImportRun | null>(
		null,
	);
	const [showReviewSection, setShowReviewSection] = useState(false);
	const [activeVoiceInterviewId, setActiveVoiceInterviewId] = useState<
		string | null
	>(null);
	const [voiceProcessing, setVoiceProcessing] = useState<{
		voiceInterviewId: string;
		filename?: string;
	} | null>(null);
	const dismissedRunsKey = `dismissed_import_runs_${companyId}`;
	// Tracks whether a dashboard deep-link has already loaded a run,
	// so the auto-resume effect does not overwrite it.
	const deepLinkHandledRef = useRef(false);
	// Global drag & drop
	const [_dragActive, setDragActive] = useState(false);
	const dragCounterRef = useRef(0);
	// Inline progress (drag & drop flow — no sidebar)
	const [inlineRunId, setInlineRunId] = useState<string | null>(null);
	const [inlineFilename, setInlineFilename] = useState<string | null>(null);
	const isArchived = Boolean(currentCompany?.archivedAt);

	const loadDismissedRuns = useCallback((): string[] => {
		try {
			const parsed = JSON.parse(localStorage.getItem(dismissedRunsKey) || "[]");
			if (!Array.isArray(parsed)) {
				return [];
			}
			return parsed.filter(
				(value): value is string => typeof value === "string",
			);
		} catch {
			return [];
		}
	}, [dismissedRunsKey]);

	const persistDismissedRun = useCallback(
		(runId: string) => {
			const dismissed = loadDismissedRuns();
			if (!dismissed.includes(runId)) {
				dismissed.push(runId);
				localStorage.setItem(dismissedRunsKey, JSON.stringify(dismissed));
			}
		},
		[dismissedRunsKey, loadDismissedRuns],
	);

	const closeReviewState = useCallback(
		(options?: { clearVoiceProcessing?: boolean }) => {
			setShowReviewSection(false);
			setActiveImportRun(null);
			setActiveVoiceInterviewId(null);
			if (options?.clearVoiceProcessing) {
				setVoiceProcessing(null);
			}
		},
		[],
	);

	const handlePageDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current++;
		if (e.dataTransfer.types.includes("Files")) {
			setDragActive(true);
		}
	}, []);

	const handlePageDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handlePageDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current--;
		if (dragCounterRef.current === 0) {
			setDragActive(false);
		}
	}, []);

	const handlePageDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);
			dragCounterRef.current = 0;
			const file = e.dataTransfer.files?.[0];
			if (
				file &&
				canCreateClientData &&
				!isArchived &&
				!showReviewSection &&
				!inlineRunId
			) {
				try {
					setInlineFilename(file.name);
					const result = await bulkImportAPI.upload(file, "company", companyId);
					setInlineRunId(result.runId);
				} catch (error) {
					toast.error(error instanceof Error ? error.message : "Upload failed");
					setInlineFilename(null);
				}
			}
		},
		[
			canCreateClientData,
			isArchived,
			showReviewSection,
			inlineRunId,
			companyId,
		],
	);

	// Archive dialog states
	const [showArchiveDialog, setShowArchiveDialog] = useState(false);
	const [showRestoreDialog, setShowRestoreDialog] = useState(false);
	const [showPurgeDialog, setShowPurgeDialog] = useState(false);
	const [isArchiving, setIsArchiving] = useState(false);
	const [isRestoring, setIsRestoring] = useState(false);
	const [isPurging, setIsPurging] = useState(false);

	const reloadCompanyData = useCallback(async () => {
		await Promise.all([
			loadCompany(companyId),
			loadLocationsByCompany(companyId, locationsFilter),
		]);
	}, [companyId, loadCompany, loadLocationsByCompany, locationsFilter]);

	useEffect(() => {
		if (isArchived && locationsFilter === "active") {
			setLocationsFilter("archived");
		}
	}, [isArchived, locationsFilter]);

	useEffect(() => {
		if (companyId) {
			void reloadCompanyData().catch(() => {});
		}
	}, [companyId, reloadCompanyData]);

	useEffect(() => {
		if (!canCreateClientData) return;
		const voiceRunId = searchParams.get("voiceRunId");
		const voiceInterviewId = searchParams.get("voiceInterviewId");
		if (!voiceRunId) return;
		void bulkImportAPI
			.getRun(voiceRunId)
			.then((run) => {
				setActiveImportRun(run);
				setActiveVoiceInterviewId(voiceInterviewId);
				setShowReviewSection(true);
				router.replace(`/companies/${companyId}`);
			})
			.catch(() => {
				toast.error("Could not load voice interview run");
				setActiveVoiceInterviewId(null);
				router.replace(`/companies/${companyId}`);
			});
	}, [canCreateClientData, searchParams, companyId, router]);

	// Deep-link from dashboard draft navigation (run_id + source_type params)
	useEffect(() => {
		if (!canCreateClientData || isArchived) return;
		const runId = searchParams.get("run_id");
		const sourceType = searchParams.get("source_type");
		if (!runId || !sourceType) return;

		// Mark deep-link handled so auto-resume skips
		deepLinkHandledRef.current = true;

		// Clean URL immediately to prevent re-triggering
		router.replace(`/companies/${companyId}`);

		void bulkImportAPI
			.getRun(runId)
			.then((run) => {
				setActiveImportRun(run);
				// Voice drafts: open VoiceReviewWorkspace if voiceInterviewId available
				if (sourceType === "voice_interview" && run.voiceInterviewId) {
					setActiveVoiceInterviewId(run.voiceInterviewId);
				}
				setShowReviewSection(true);
			})
			.catch(() => {
				toast.error("Could not load the review run");
			});
	}, [canCreateClientData, isArchived, searchParams, companyId, router]);

	// Auto-resume pending import on page load
	useEffect(() => {
		if (!companyId || !canCreateClientData || isArchived) return;
		// Skip if a dashboard deep-link already loaded a specific run
		if (deepLinkHandledRef.current) return;
		let cancelled = false;
		bulkImportAPI
			.getPendingRun("company", companyId)
			.then((run) => {
				if (!cancelled && run) {
					// Skip if user dismissed this run before
					if (loadDismissedRuns().includes(run.id)) {
						return;
					}
					setActiveImportRun(run);
					setShowReviewSection(true);
				}
			})
			.catch(() => {
				/* silent */
			});
		return () => {
			cancelled = true;
		};
	}, [companyId, canCreateClientData, isArchived, loadDismissedRuns]);

	const handleConfirmDelete = async () => {
		if (!locationToDelete) return;

		setDeleting(true);
		try {
			await deleteLocation(locationToDelete.id);
			toast.success(`Location "${locationToDelete.name}" deleted successfully`);

			// Close dialog IMMEDIATELY after successful delete
			setDeleteDialogOpen(false);
			setLocationToDelete(null);
			setDeleting(false);

			// Reload data in background (non-blocking)
			void reloadCompanyData().catch(() => {});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete location",
			);
			setDeleting(false);
		}
	};

	const handleArchive = async () => {
		setIsArchiving(true);
		try {
			await archiveCompany(companyId);
			toast.success("Company archived", {
				description: `"${currentCompany?.name}" has been archived`,
			});
			setShowArchiveDialog(false);
		} catch (_error) {
			toast.error("Archive failed", {
				description: "The company could not be archived. Please try again.",
			});
		} finally {
			setIsArchiving(false);
		}
	};

	const handleRestore = async () => {
		setIsRestoring(true);
		try {
			await restoreCompany(companyId);
			toast.success("Company restored", {
				description: `"${currentCompany?.name}" has been restored`,
			});
			setShowRestoreDialog(false);
		} catch (_error) {
			toast.error("Restore failed", {
				description: "The company could not be restored. Please try again.",
			});
		} finally {
			setIsRestoring(false);
		}
	};

	const handlePurge = async () => {
		if (!currentCompany) return;
		setIsPurging(true);
		try {
			await purgeCompany(companyId, currentCompany.name);
			toast.success("Company permanently deleted", {
				description: `"${currentCompany.name}" has been permanently deleted`,
			});
			router.push("/companies");
		} catch (_error) {
			toast.error("Purge failed", {
				description:
					"The company could not be permanently deleted. Please try again.",
			});
			setIsPurging(false);
		}
	};

	if (loading && !currentCompany) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!currentCompany) {
		return (
			<div className="container mx-auto py-8">
				<p className="text-muted-foreground">Company not found</p>
			</div>
		);
	}

	return (
		/* biome-ignore lint/a11y/noStaticElementInteractions: page-level drag-and-drop target */
		<section
			className="container mx-auto py-8 space-y-6 relative"
			onDragEnter={handlePageDragEnter}
			onDragOver={handlePageDragOver}
			onDragLeave={handlePageDragLeave}
			onDrop={handlePageDrop}
		>
			{/* Breadcrumb */}
			<Breadcrumb
				items={[
					{ label: "Companies", href: "/companies" },
					{ label: currentCompany.name, icon: Building2 },
				]}
			/>

			{/* Archived Banner */}
			{isArchived && currentCompany.archivedAt && (
				<ArchivedBanner
					entityType="company"
					entityName={currentCompany.name}
					archivedAt={currentCompany.archivedAt}
					canRestore={canRestoreCompany()}
					canPurge={canPurgeCompany()}
					onRestore={() => setShowRestoreDialog(true)}
					onPurge={() => setShowPurgeDialog(true)}
					loading={isRestoring || isPurging}
				/>
			)}

			{(companyError || locationsError) && (
				<Alert variant="destructive">
					<AlertTitle>Could not load company data</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">
							{companyError || locationsError}
						</p>
						<Button
							variant="outline"
							onClick={() => {
								clearCompanyError();
								clearLocationsError();
								void reloadCompanyData().catch(() => {});
							}}
						>
							Retry
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Go back"
					onClick={() => router.back()}
				>
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
							<Building2 className="h-8 w-8" />
							{currentCompany.name}
						</h1>
						{isArchived && (
							<Badge
								variant="outline"
								className="border-amber-500 text-amber-500"
							>
								Archived
							</Badge>
						)}
					</div>
					<p className="text-muted-foreground mt-1">
						{currentCompany.subsector
							? formatSubsector(currentCompany.subsector)
							: currentCompany.sector}
					</p>
				</div>
				<Badge variant="outline">
					{currentCompany.locationCount ?? 0}{" "}
					{(currentCompany.locationCount ?? 0) === 1 ? "location" : "locations"}
				</Badge>

				{/* Actions */}
				{canEditCompany(currentCompany) && (
					<Tooltip>
						<TooltipTrigger asChild>
							<span tabIndex={isArchived ? 0 : undefined}>
								<Button
									onClick={() => setEditCompanyDialogOpen(true)}
									disabled={isArchived}
								>
									<Edit className="mr-2 h-4 w-4" />
									Edit Company
								</Button>
							</span>
						</TooltipTrigger>
						{isArchived && <TooltipContent>Company is archived</TooltipContent>}
					</Tooltip>
				)}

				{!isArchived && canArchiveCompany() && (
					<Button
						variant="outline"
						onClick={() => setShowArchiveDialog(true)}
						className="text-amber-600 border-amber-600 hover:bg-amber-50"
					>
						<Archive className="mr-2 h-4 w-4" />
						Archive
					</Button>
				)}
			</div>

			{/* Company Info */}
			<Card>
				<CardHeader>
					<CardTitle>Company Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<p className="text-sm font-medium text-muted-foreground mb-1">
							Customer Type
						</p>
						<Badge variant="secondary">
							{CUSTOMER_TYPE_LABELS[currentCompany.customerType]}
						</Badge>
					</div>
					<Separator />
					{/* Industry/Sub-Industry - only show if set */}
					{currentCompany.sector &&
						currentCompany.subsector &&
						currentCompany.subsector !== "other" && (
							<>
								<div>
									<p className="text-sm font-medium text-muted-foreground mb-2">
										Industry
									</p>
									<div className="flex flex-wrap gap-2">
										<Badge variant="secondary" className="capitalize text-sm">
											{currentCompany.sector}
										</Badge>
										<Badge variant="outline" className="text-sm">
											{formatSubsector(currentCompany.subsector)}
										</Badge>
									</div>
								</div>
								<Separator />
							</>
						)}

					{currentCompany.notes && (
						<>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-2">
									Notes
								</p>
								<p className="text-sm whitespace-pre-wrap">
									{currentCompany.notes}
								</p>
							</div>
						</>
					)}

					{currentCompany.tags && currentCompany.tags.length > 0 && (
						<>
							<Separator />
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-2">
									Tags
								</p>
								<div className="flex flex-wrap gap-2">
									{currentCompany.tags.map((tag) => (
										<Badge key={tag} variant="secondary">
											{tag}
										</Badge>
									))}
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<CompanyContactsCard
				companyId={companyId}
				contacts={currentCompany.contacts ?? []}
				canManageContacts={canEditCompany(currentCompany) && !isArchived}
				onContactsUpdated={reloadCompanyData}
			/>

			{canCreateClientData &&
				!isArchived &&
				!showReviewSection &&
				!inlineRunId &&
				!voiceProcessing && (
					<>
						<InlineDropZone
							uploading={inlineUploading}
							onFileSelected={async (file) => {
								setInlineUploading(true);
								try {
									setInlineFilename(file.name);
									const result = await bulkImportAPI.upload(
										file,
										"company",
										companyId,
									);
									setInlineRunId(result.runId);
								} catch (error) {
									toast.error(
										error instanceof Error ? error.message : "Upload failed",
									);
									setInlineFilename(null);
								} finally {
									setInlineUploading(false);
								}
							}}
						/>
						<VoiceInterviewLauncher
							companyId={companyId}
							onUploaded={({ voiceInterviewId }) => {
								setVoiceProcessing({ voiceInterviewId });
							}}
						/>
					</>
				)}

			{/* Voice interview processing progress */}
			{voiceProcessing && !showReviewSection && (
				<VoiceProcessingProgress
					voiceInterviewId={voiceProcessing.voiceInterviewId}
					filename={voiceProcessing.filename}
					onReady={async ({ voiceInterviewId, bulkImportRunId }) => {
						const run = await bulkImportAPI.getRun(bulkImportRunId);
						setActiveImportRun(run);
						setActiveVoiceInterviewId(voiceInterviewId);
						setShowReviewSection(true);
						setVoiceProcessing(null);
					}}
					onDismiss={() => setVoiceProcessing(null)}
				/>
			)}

			{/* Inline import progress (drag & drop flow) */}
			{inlineRunId && inlineFilename && !showReviewSection && (
				<InlineImportProgress
					runId={inlineRunId}
					filename={inlineFilename}
					onComplete={(run) => {
						setInlineRunId(null);
						setInlineFilename(null);
						setActiveImportRun(run);
						setShowReviewSection(true);
					}}
					onFailed={(error) => {
						toast.error("Import failed", { description: error });
					}}
					onNoData={() => {
						toast.info("No data found in your file. Try another one.");
						setInlineRunId(null);
						setInlineFilename(null);
					}}
					onDismiss={() => {
						setInlineRunId(null);
						setInlineFilename(null);
					}}
				/>
			)}

			{/* Import Review Section — appears when items are ready */}
			{showReviewSection &&
				activeImportRun &&
				activeImportRun.sourceType === "voice_interview" &&
				activeVoiceInterviewId && (
					<VoiceReviewWorkspace
						run={activeImportRun}
						voiceInterviewId={activeVoiceInterviewId}
						onRunUpdated={setActiveImportRun}
						onDismiss={() => {
							closeReviewState({ clearVoiceProcessing: true });
						}}
						onDone={() => {
							closeReviewState({ clearVoiceProcessing: true });
							void reloadCompanyData().catch(() => {});
						}}
						companyLocations={locations.map((l) => ({
							id: l.id,
							name: l.name,
							city: l.city,
						}))}
					/>
				)}

			{showReviewSection &&
				activeImportRun &&
				(activeImportRun.sourceType !== "voice_interview" ||
					!activeVoiceInterviewId) && (
					<ImportReviewSection
						run={activeImportRun}
						onRunUpdated={setActiveImportRun}
						onFinalized={() => {
							persistDismissedRun(activeImportRun.id);
							closeReviewState();
							// Reload locations to show newly created items
							void reloadCompanyData().catch(() => {});
						}}
						onDismiss={() => {
							closeReviewState();
							if (activeImportRun) {
								persistDismissedRun(activeImportRun.id);
							}
						}}
						reviewMode="company"
						companyLocations={locations.map((l) => ({
							id: l.id,
							name: l.name,
							city: l.city,
						}))}
						onAssignOrphans={async (locationId, _locationName, itemIds) => {
							try {
								const result = await bulkImportAPI.importOrphanProjects(
									activeImportRun.id,
									locationId,
									itemIds,
								);
								toast.success(
									`${result.projectsCreated} waste stream${result.projectsCreated === 1 ? "" : "s"} imported successfully`,
								);
								persistDismissedRun(activeImportRun.id);
								closeReviewState();
								void reloadCompanyData().catch(() => {});
							} catch (error) {
								toast.error(
									error instanceof Error
										? error.message
										: "Failed to import waste streams",
								);
							}
						}}
					/>
				)}

			{/* Locations Section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-4">
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<MapPin className="h-6 w-6" />
						Locations
					</h2>
					<div className="flex items-center gap-4">
						<ArchivedFilterSelect
							value={locationsFilter}
							onChange={setLocationsFilter}
						/>
						{canCreateClientData && !isArchived && (
							<CreateLocationDialog
								companyId={companyId}
								onSuccess={() => {
									void reloadCompanyData().catch(() => {});
								}}
							/>
						)}
					</div>
				</div>

				{locations.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">
								{locationsFilter === "archived"
									? "No archived locations"
									: "No locations yet"}
							</h3>
							<p className="text-muted-foreground mb-4">
								{locationsFilter === "archived"
									? "No locations have been archived for this company"
									: canCreateClientData && !isArchived
										? "Add the first location for this company"
										: "No locations have been added to this company yet"}
							</p>
							{canCreateClientData &&
								!isArchived &&
								locationsFilter !== "archived" && (
									<CreateLocationDialog
										companyId={companyId}
										trigger={
											<Button>
												<Plus className="mr-2 h-4 w-4" />
												Add First Location
											</Button>
										}
										onSuccess={() => {
											void reloadCompanyData().catch(() => {});
										}}
									/>
								)}
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{locations.map((location) => (
							<Card
								key={location.id}
								className="group hover:shadow-lg hover:border-primary/50 transition-[box-shadow,border-color]"
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<button
											type="button"
											className="flex-1 cursor-pointer text-left"
											onClick={() =>
												router.push(
													`/companies/${companyId}/locations/${location.id}`,
												)
											}
										>
											<div className="flex items-center gap-2">
												<CardTitle className="text-lg group-hover:text-primary transition-colors">
													{location.name}
												</CardTitle>
												{location.archivedAt && (
													<Badge
														variant="outline"
														className="border-amber-500 text-amber-500 text-xs"
													>
														Archived
													</Badge>
												)}
											</div>
											<div className="flex flex-wrap items-center gap-2 mt-1">
												<p className="text-sm text-muted-foreground">
													{location.city}, {location.state}
													{location.zipCode ? ` ${location.zipCode}` : ""}
												</p>
												<Badge variant="secondary" className="text-xs">
													{ADDRESS_TYPE_LABELS[location.addressType]}
												</Badge>
											</div>
										</button>
										<div className="flex items-center gap-2">
											<Badge
												variant={
													location.projectCount > 0 ? "default" : "outline"
												}
												className="text-xs"
											>
												{location.projectCount}{" "}
												{location.projectCount === 1
													? "waste stream"
													: "waste streams"}
											</Badge>
											<DropdownMenu
												open={openMenuId === location.id}
												onOpenChange={(open) =>
													setOpenMenuId(open ? location.id : null)
												}
											>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														aria-label="Location options"
														onClick={(e) => e.stopPropagation()}
													>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{canDeleteLocation() && !location.archivedAt && (
														<DropdownMenuItem
															onClick={() => {
																setLocationToDelete(location);
																setDeleteDialogOpen(true);
															}}
															className="text-destructive focus:text-destructive"
														>
															<Trash2 className="mr-2 h-4 w-4" />
															Delete
														</DropdownMenuItem>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									{/* Address */}
									{location.address && (
										<div className="flex items-start gap-2 text-sm text-muted-foreground">
											<MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
											<p>{location.address}</p>
										</div>
									)}

									{/* Quick Actions */}
									<div className="flex gap-2 pt-2">
										<Button
											size="sm"
											variant="outline"
											className="flex-1"
											onClick={() =>
												router.push(
													`/companies/${companyId}/locations/${location.id}`,
												)
											}
										>
											View Details
										</Button>
										{!location.archivedAt && !isArchived && (
											<Button
												size="sm"
												className="flex-1"
												onClick={(e) => {
													e.stopPropagation();
													router.push(
														`/companies/${companyId}/locations/${location.id}?action=new-waste-stream`,
													);
												}}
											>
												<Plus className="h-4 w-4 mr-1" />
												New Waste Stream
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Delete Confirmation Dialog - always mounted, controlled by open prop */}
			<ConfirmDeleteDialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
					if (!open) setLocationToDelete(null);
				}}
				onConfirm={handleConfirmDelete}
				title="Delete Location"
				description="This will permanently delete all waste streams associated with this location. This action cannot be undone."
				itemName={locationToDelete?.name}
				loading={deleting}
			/>

			{/* Archive/Restore/Purge Dialogs */}
			<ConfirmArchiveDialog
				open={showArchiveDialog}
				onOpenChange={setShowArchiveDialog}
				onConfirm={handleArchive}
				entityType="company"
				entityName={currentCompany.name}
				loading={isArchiving}
			/>

			<ConfirmRestoreDialog
				open={showRestoreDialog}
				onOpenChange={setShowRestoreDialog}
				onConfirm={handleRestore}
				entityType="company"
				entityName={currentCompany.name}
				loading={isRestoring}
			/>

			<ConfirmPurgeDialog
				open={showPurgeDialog}
				onOpenChange={setShowPurgeDialog}
				onConfirm={handlePurge}
				entityType="company"
				entityName={currentCompany.name}
				loading={isPurging}
			/>

			{/* Edit Company Dialog - Reuse CreateCompanyDialog (DRY) */}
			{editCompanyDialogOpen && (
				<CreateCompanyDialog
					companyToEdit={{
						id: currentCompany.id,
						name: currentCompany.name,
						industry: currentCompany.industry,
						sector: currentCompany.sector,
						subsector: currentCompany.subsector,
						customerType: currentCompany.customerType,
						...(currentCompany.notes && { notes: currentCompany.notes }),
					}}
					onSuccess={async () => {
						setEditCompanyDialogOpen(false);
						// Reload company data after edit
						try {
							await loadCompany(companyId);
						} catch (error) {
							toast.error(
								error instanceof Error
									? error.message
									: "Failed to reload company",
							);
						}
					}}
				/>
			)}
		</section>
	);
}
