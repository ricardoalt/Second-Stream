"use client";

import { AudioLines, Check, Info, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type BulkImportItem,
	type BulkImportRun,
	bulkImportAPI,
} from "@/lib/api/bulk-import";
import { intakeAPI } from "@/lib/api/intake";
import type { VoiceInterviewTranscriptSegment } from "@/lib/api/voice-interviews";
import { voiceInterviewsApi } from "@/lib/api/voice-interviews";
import { routes } from "@/lib/routes";
import { EditItemDrawer } from "../bulk-import/edit-item-drawer";
import { ConfirmImportDialog } from "./confirm-import-dialog";
import { type LocationAction, LocationGroupCard } from "./location-group-card";
import { StreamCard } from "./stream-card";
import { TranscriptPanel } from "./transcript-panel";
import {
	categorizeVoiceConflict,
	getFinalizeDisabledReason,
	type MapBlockedReason,
	shouldBlockMapAction,
} from "./voice-review-guards";
import { VoiceSuccessScreen } from "./voice-success-screen";

interface VoiceReviewWorkspaceProps {
	run: BulkImportRun;
	voiceInterviewId: string;
	onRunUpdated: (run: BulkImportRun) => void;
	onDismiss: () => void;
	onDone: () => void;
	companyLocations?:
		| Array<{ id: string; name: string; city?: string | undefined }>
		| undefined;
}

interface VoiceGroup {
	groupId: string;
	items: BulkImportItem[];
}

export const VOICE_RUN_LOCKED_MESSAGE =
	"This run is no longer editable. Refresh or reopen review.";

export function isVoiceRunEditable(status: BulkImportRun["status"]): boolean {
	return status === "review_ready";
}

export function getActiveOrphanItems(
	items: BulkImportItem[],
): BulkImportItem[] {
	return items.filter(
		(i) =>
			i.itemType === "project" &&
			i.parentItemId == null &&
			i.status !== "rejected" &&
			i.createdProjectId == null &&
			i.reviewNotes?.startsWith(REVIEW_NOTE_MISSING_LOCATION),
	);
}

export function getNextSelectedResolvedGroupIds(params: {
	previous: Set<string>;
	resolvedGroupIds: string[];
	autoInitialize: boolean;
}): Set<string> {
	const { previous, resolvedGroupIds, autoInitialize } = params;
	if (autoInitialize) {
		return new Set(resolvedGroupIds);
	}
	const resolvedSet = new Set(resolvedGroupIds);
	const next = new Set<string>();
	for (const groupId of previous) {
		if (resolvedSet.has(groupId)) {
			next.add(groupId);
		}
	}
	return next;
}

export function getMapBlockedToast(reason: MapBlockedReason): string {
	if (reason === "ambiguous") {
		return "Multiple matches found. Choose Create new or resolve manually.";
	}
	return "No existing match found for this group.";
}

export async function applyVoiceGroupResolution(params: {
	items: BulkImportItem[];
	mode: LocationAction;
	patchItem: (
		item: BulkImportItem,
		action: "accept" | "reject",
		options?: { confirmCreateNew?: boolean },
	) => Promise<void>;
	onMapBlocked: (reason: MapBlockedReason) => void;
}): Promise<void> {
	const { items, mode, patchItem, onMapBlocked } = params;
	const pendingItems = items.filter((item) => item.status === "pending_review");
	if (pendingItems.length === 0) {
		return;
	}

	if (mode === "map") {
		const mapCheck = shouldBlockMapAction(items);
		if (mapCheck.blocked && mapCheck.reason) {
			onMapBlocked(mapCheck.reason);
			return;
		}
	}

	for (const item of pendingItems) {
		if (mode === "reject") {
			await patchItem(item, "reject");
			continue;
		}
		await patchItem(item, "accept", {
			confirmCreateNew: mode === "create",
		});
	}
}

/* ── Helpers ── */
/** Item was already imported in a previous finalize */
function _isAlreadyImported(item: BulkImportItem): boolean {
	return item.createdProjectId != null || item.createdLocationId != null;
}

function _isPending(item: BulkImportItem): boolean {
	return item.status === "pending_review";
}

function _isActionable(item: BulkImportItem): boolean {
	return item.status === "pending_review";
}

/**
 * Review-notes prefixes used by the backend.
 * Kept as constants so label logic doesn't depend on substring matching.
 */
const REVIEW_NOTE_MISSING_LOCATION = "Project row missing location context";
const REVIEW_NOTE_EXTERNAL_LOCATION =
	"Project row references external location";
const REVIEW_NOTE_INVALID_LOCATION =
	"Location items invalid for location entrypoint";

/** User-friendly status label mapping (3 primary states) */
function _statusLabel(status: string, reviewNotes?: string | null): string {
	if (reviewNotes?.startsWith(REVIEW_NOTE_MISSING_LOCATION)) {
		return "Needs location";
	}
	if (status === "invalid") {
		if (reviewNotes?.startsWith(REVIEW_NOTE_EXTERNAL_LOCATION))
			return "Wrong location";
		if (reviewNotes?.startsWith(REVIEW_NOTE_INVALID_LOCATION))
			return "Wrong location";
		return "Needs review";
	}
	switch (status) {
		case "pending_review":
			return "Needs review";
		case "accepted":
			return "Approved";
		case "amended":
			return "Approved";
		case "rejected":
			return "Skipped";
		default:
			return status;
	}
}

function _itemName(item: BulkImportItem): string {
	const raw = item.normalizedData.name;
	return typeof raw === "string" && raw.trim().length > 0
		? raw
		: item.itemType === "location"
			? "Location"
			: "Waste stream";
}

function _groupLocationName(group: VoiceGroup): string {
	// 1) Try the actual location item
	const loc = group.items.find((i) => i.itemType === "location");
	if (loc) return _itemName(loc);

	// 2) Try location_ref / stream_location_ref from the first project item
	const firstProject = group.items.find(
		(i) => i.itemType === "project" || i.itemType !== "location",
	);
	if (firstProject) {
		const locRef =
			firstProject.extractedData.stream_location_ref ??
			firstProject.extractedData.location_ref ??
			firstProject.normalizedData.location_ref;
		if (typeof locRef === "string" && locRef.trim().length > 0) {
			return locRef;
		}
	}

	// 3) Try first item name as last resort
	const firstItem = group.items[0];
	if (firstItem) {
		const name = _itemName(firstItem);
		if (name !== "Waste stream" && name !== "Location")
			return `Location — ${name}`;
	}

	// 4) Fallback: "Group N" instead of raw hash
	return "Location group";
}

function _evidenceNum(item: BulkImportItem, key: string): number | null {
	const val = item.extractedData[key];
	if (typeof val === "number") return val;
	if (typeof val === "string" && val.trim().length > 0) {
		const n = Number(val);
		if (Number.isFinite(n)) return n;
	}
	return null;
}

function _confidence(item: BulkImportItem): number | undefined {
	// Prefer top-level confidence field (set by the service)
	if (typeof item.confidence === "number") return item.confidence / 100;
	// Fallback to extracted data
	const c = item.extractedData.item_confidence;
	if (typeof c === "number") return c;
	return undefined;
}

/* ── Media query hook ── */
function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState(false);
	useEffect(() => {
		const mql = window.matchMedia("(min-width: 1024px)");
		setIsDesktop(mql.matches);
		const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);
	return isDesktop;
}

/* ── Main Component ── */
export function VoiceReviewWorkspace({
	run,
	voiceInterviewId,
	onRunUpdated,
	onDismiss,
	onDone,
	companyLocations,
}: VoiceReviewWorkspaceProps) {
	const router = useRouter();
	const isDesktop = useIsDesktop();

	const [loading, setLoading] = useState(true);
	const [editingItem, setEditingItem] = useState<BulkImportItem | null>(null);
	const [items, setItems] = useState<BulkImportItem[]>([]);
	const [transcriptText, setTranscriptText] = useState("");
	const [segments, setSegments] = useState<VoiceInterviewTranscriptSegment[]>(
		[],
	);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [selectedResolvedGroupIds, setSelectedResolvedGroupIds] = useState<
		Set<string>
	>(new Set());
	const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
	const [finalizing, setFinalizing] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
	const [seekToSec, setSeekToSec] = useState<number | null>(null);
	const [success, setSuccess] = useState<{
		streamsCreated: number;
		locationsCreated: number;
		pending: number;
	} | null>(null);
	const [successTargetProjectId, setSuccessTargetProjectId] = useState<
		string | null
	>(null);
	const [mobileTab, setMobileTab] = useState<string>("extracted");
	const [runStatus, setRunStatus] = useState<BulkImportRun["status"]>(
		run.status,
	);
	const [selectionRunId, setSelectionRunId] = useState(run.id);

	useEffect(() => {
		setRunStatus(run.status);
	}, [run.status]);

	useEffect(() => {
		if (selectionRunId === run.id) {
			return;
		}
		setSelectedResolvedGroupIds(new Set());
		setHasInitializedSelection(false);
		setItems([]);
		setSelectionRunId(run.id);
	}, [run.id, selectionRunId]);

	/* ── Load data ── */
	const loadItems = useCallback(async (): Promise<BulkImportItem[]> => {
		const first = await bulkImportAPI.listItems(run.id, 1);
		let allItems = first.items;
		if (first.pages > 1) {
			const rest = await Promise.all(
				Array.from({ length: first.pages - 1 }, (_, index) =>
					bulkImportAPI.listItems(run.id, index + 2),
				),
			);
			for (const page of rest) {
				allItems = allItems.concat(page.items);
			}
		}
		setItems(allItems);
		return allItems;
	}, [run.id]);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			try {
				const [transcript, audio] = await Promise.all([
					voiceInterviewsApi.getTranscript(voiceInterviewId),
					voiceInterviewsApi.getAudioUrl(voiceInterviewId),
				]);
				if (cancelled) return;
				setTranscriptText(transcript.transcriptText);
				setSegments(transcript.segments ?? []);
				setAudioUrl(audio.audioUrl);
				await loadItems();
			} catch (error) {
				if (!cancelled) {
					toast.error(
						error instanceof Error
							? error.message
							: "Could not load voice review",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, [voiceInterviewId, loadItems]);

	/* ── Derived state ── */
	const groups = useMemo<VoiceGroup[]>(() => {
		const byGroup = new Map<string, BulkImportItem[]>();
		for (const item of items) {
			if (!item.groupId) continue;
			const arr = byGroup.get(item.groupId);
			if (arr) {
				arr.push(item);
			} else {
				byGroup.set(item.groupId, [item]);
			}
		}
		return Array.from(byGroup.entries()).map(([groupId, groupedItems]) => ({
			groupId,
			items: groupedItems,
		}));
	}, [items]);

	/** Groups that are fully imported (all items have createdProject/LocationId) */
	const pendingGroups = useMemo(
		() => groups.filter((g) => !g.items.every(_isAlreadyImported)),
		[groups],
	);
	const importedGroups = useMemo(
		() => groups.filter((g) => g.items.every(_isAlreadyImported)),
		[groups],
	);

	/** Streams missing a location — candidates for orphan assignment */
	const orphanItems = useMemo(() => getActiveOrphanItems(items), [items]);

	/** IDs of orphan items — used to exclude orphan-only groups from actionable set */
	const orphanItemIds = useMemo(
		() => new Set(orphanItems.map((i) => i.id)),
		[orphanItems],
	);

	/**
	 * Groups that contain at least one non-location, non-orphan item.
	 * Orphan-only groups (all project items are orphans) are excluded —
	 * they render misleading LocationGroupCards with "Import 0 streams".
	 */
	const actionableGroups = useMemo(
		() =>
			pendingGroups.filter((g) =>
				g.items.some(
					(i) => i.itemType !== "location" && !orphanItemIds.has(i.id),
				),
			),
		[pendingGroups, orphanItemIds],
	);

	/** Location names detected in orphan-only groups (for mention card context) */
	const orphanGroupNames = useMemo(() => {
		const orphanOnlyGroups = pendingGroups.filter(
			(g) =>
				!g.items.some(
					(i) => i.itemType !== "location" && !orphanItemIds.has(i.id),
				),
		);
		return orphanOnlyGroups
			.map((g) => _groupLocationName(g))
			.filter((n) => n !== "Location group");
	}, [pendingGroups, orphanItemIds]);
	const knownLocationCount = companyLocations?.length ?? 0;

	const resolvedGroupIds = useMemo(
		() =>
			actionableGroups
				.filter((g) => {
					const visible = g.items.filter(
						(i) => i.itemType !== "location" && !orphanItemIds.has(i.id),
					);
					return visible.length > 0 && visible.every((i) => !_isPending(i));
				})
				.map((g) => g.groupId),
		[actionableGroups, orphanItemIds],
	);

	useEffect(() => {
		setSelectedResolvedGroupIds((previous) => {
			const next = getNextSelectedResolvedGroupIds({
				previous,
				resolvedGroupIds,
				autoInitialize: !hasInitializedSelection,
			});
			if (next.size !== previous.size) {
				return next;
			}
			for (const groupId of next) {
				if (!previous.has(groupId)) {
					return next;
				}
			}
			return previous;
		});
		if (!hasInitializedSelection) {
			setHasInitializedSelection(true);
		}
	}, [resolvedGroupIds, hasInitializedSelection]);

	const totalGroups = actionableGroups.length;

	/** Count of streams (non-location items) that will actually be imported from selected groups */
	const importableStreamCount = useMemo(() => {
		return actionableGroups
			.filter((g) => selectedResolvedGroupIds.has(g.groupId))
			.flatMap((g) => g.items)
			.filter(
				(i) =>
					i.itemType !== "location" &&
					(i.status === "accepted" || i.status === "amended"),
			).length;
	}, [actionableGroups, selectedResolvedGroupIds]);

	const selectedGroupCount = selectedResolvedGroupIds.size;
	const runEditable = isVoiceRunEditable(runStatus);

	/** Rejected/invalid items in selected groups that won't be imported */
	const skippedItemCount = useMemo(() => {
		return actionableGroups
			.filter((g) => selectedResolvedGroupIds.has(g.groupId))
			.flatMap((g) => g.items)
			.filter(
				(i) =>
					i.itemType !== "location" &&
					(i.status === "rejected" || i.status === "invalid"),
			).length;
	}, [actionableGroups, selectedResolvedGroupIds]);

	/** Total non-location items across all groups (for context banner) */
	const totalStreamCount = useMemo(
		() => items.filter((i) => i.itemType !== "location").length,
		[items],
	);

	/** How many non-location items have been approved so far */
	const approvedStreamCount = useMemo(
		() =>
			items.filter(
				(i) =>
					i.itemType !== "location" &&
					(i.status === "accepted" || i.status === "amended"),
			).length,
		[items],
	);

	/** How many items still need review (pending) */
	const pendingItemCount = useMemo(
		() =>
			items.filter(
				(i) => i.itemType !== "location" && i.status === "pending_review",
			).length,
		[items],
	);

	/* ── Actions ── */
	const setItemAction = useCallback(
		async (
			item: BulkImportItem,
			action: "accept" | "reject" | "amend" | "reset",
			options?: {
				confirmCreateNew?: boolean;
				normalizedData?: Record<string, unknown>;
			},
		) => {
			const updated = await bulkImportAPI.patchItem(item.id, action, options);
			setItems((prev) =>
				prev.map((entry) => (entry.id === updated.id ? updated : entry)),
			);
		},
		[],
	);

	const resolveGroup = useCallback(
		async (group: VoiceGroup, mode: LocationAction) => {
			await applyVoiceGroupResolution({
				items: group.items,
				mode,
				patchItem: setItemAction,
				onMapBlocked: (reason) => {
					toast.error(getMapBlockedToast(reason));
				},
			});
		},
		[setItemAction],
	);

	const finalizeSelected = useCallback(async () => {
		if (!runEditable) {
			toast.error(VOICE_RUN_LOCKED_MESSAGE);
			return;
		}
		if (totalGroups > 0 && selectedResolvedGroupIds.size === 0) {
			toast.error("Select at least one resolved group");
			return;
		}
		const selectedGroupIds = Array.from(selectedResolvedGroupIds.values());
		setFinalizing(true);
		try {
			// empty_extraction only valid when run truly has zero groups (not just zero actionable)
			const closeReason = groups.length === 0 ? "empty_extraction" : undefined;
			const response = await bulkImportAPI.finalize(run.id, {
				resolvedGroupIds: selectedGroupIds,
				idempotencyKey: crypto.randomUUID(),
				...(closeReason ? { closeReason } : {}),
			});

			const updatedRun = await bulkImportAPI.getRun(run.id);
			setRunStatus(updatedRun.status);
			onRunUpdated(updatedRun);
			const refreshedItems = await loadItems();

			if (updatedRun.status !== "completed") {
				const orphanCount = getActiveOrphanItems(refreshedItems).length;
				const orphanSuffix =
					orphanCount > 0
						? ` ${orphanCount} stream${orphanCount === 1 ? "" : "s"} still need a location.`
						: "";
				toast.success(
					`Resolved groups finalized. Unresolved groups remain.${orphanSuffix}`,
				);
				return;
			}

			const createdProjectIds = refreshedItems
				.filter(
					(item) =>
						item.itemType === "project" &&
						item.createdProjectId &&
						item.groupId &&
						selectedGroupIds.includes(item.groupId),
				)
				.map((item) => item.createdProjectId)
				.filter((id): id is string => typeof id === "string");

			let pendingSuggestions = 0;
			let targetProjectId: string | null = createdProjectIds[0] ?? null;
			for (const projectId of createdProjectIds) {
				const hydrate = await intakeAPI.hydrate(projectId);
				const projectPending = hydrate.suggestions.filter(
					(s) => s.status === "pending",
				).length;
				pendingSuggestions += projectPending;
				if (projectPending > 0 && targetProjectId === null) {
					targetProjectId = projectId;
				}
			}

			setSuccess({
				streamsCreated: response.summary.projectsCreated,
				locationsCreated: response.summary.locationsCreated,
				pending: pendingSuggestions,
			});
			setSuccessTargetProjectId(targetProjectId);
		} catch (error) {
			const conflict = categorizeVoiceConflict(error);
			if (conflict) {
				toast.error(conflict.userMessage, {
					description: conflict.description,
				});
				if (conflict.shouldRefresh) {
					try {
						const latestRun = await bulkImportAPI.getRun(run.id);
						setRunStatus(latestRun.status);
						onRunUpdated(latestRun);
						await loadItems();
					} catch {
						// best effort refresh
					}
				}
			} else {
				toast.error(error instanceof Error ? error.message : "Finalize failed");
			}
		} finally {
			setFinalizing(false);
		}
	}, [
		groups.length,
		loadItems,
		onRunUpdated,
		run.id,
		runEditable,
		selectedResolvedGroupIds,
		totalGroups,
	]);

	/* ── Success screen ── */
	if (success) {
		return (
			<VoiceSuccessScreen
				createdStreams={success.streamsCreated}
				createdLocations={success.locationsCreated}
				pendingSuggestions={success.pending}
				targetProjectId={successTargetProjectId}
				onReviewSuggestions={() => {
					if (successTargetProjectId) {
						window.location.href = `/project/${successTargetProjectId}?tab=technical`;
					}
				}}
				onClose={onDone}
			/>
		);
	}

	/* ── Loading ── */
	if (loading) {
		return (
			<div className="rounded-xl border bg-background">
				<div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
					<div className="h-5 w-40 bg-muted rounded animate-pulse" />
				</div>
				<div className="space-y-3 p-4">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="rounded-lg border p-4 space-y-3 animate-pulse"
						>
							<div className="flex items-center gap-2">
								<div className="h-6 w-6 rounded-full bg-muted" />
								<div className="h-4 w-48 bg-muted rounded" />
								<div className="ml-auto h-4 w-16 bg-muted rounded" />
							</div>
							<div className="space-y-2">
								<div className="h-14 bg-muted rounded" />
								<div className="h-14 bg-muted rounded" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	/* ── Shared content builders ── */
	const transcriptContent = (
		<TranscriptPanel
			segments={segments}
			transcriptText={transcriptText}
			audioUrl={audioUrl}
			seekToSec={seekToSec}
			onSeekHandled={() => setSeekToSec(null)}
		/>
	);

	const extractedContent = (
		<ScrollArea className="flex-1 min-h-0">
			{!runEditable && (
				<div className="mx-4 mt-4 mb-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
					{VOICE_RUN_LOCKED_MESSAGE}
				</div>
			)}
			{/* Context banner */}
			{totalStreamCount > 0 && (
				<div className="flex items-start gap-2.5 mx-4 mt-4 mb-1 rounded-lg border bg-muted/30 px-3 py-2.5">
					<Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
					<div className="space-y-1">
						<p className="text-sm text-muted-foreground">
							<span className="font-medium text-foreground">
								{totalStreamCount}
							</span>{" "}
							stream{totalStreamCount === 1 ? "" : "s"} extracted.{" "}
							{actionableGroups.length === 0 && orphanItems.length > 0 ? (
								<>
									All streams need a location — assign below to import.{" "}
									<span className="text-amber-400">
										{orphanItems.length} need location
									</span>
								</>
							) : pendingItemCount > 0 ? (
								<>
									Review each group, then import.{" "}
									<span className="text-emerald-400">
										{approvedStreamCount} approved
									</span>
									{orphanItems.length > 0 && (
										<>
											{" · "}
											<span className="text-amber-400">
												{orphanItems.length} need location
											</span>
										</>
									)}
								</>
							) : (
								<>
									All items reviewed.{" "}
									<span className="text-emerald-400">
										{approvedStreamCount} approved
									</span>
									{orphanItems.length > 0 && (
										<>
											{" · "}
											<span className="text-amber-400">
												{orphanItems.length} need location
											</span>
										</>
									)}
								</>
							)}
						</p>
					</div>
				</div>
			)}
			<div className="space-y-3 p-4">
				{pendingGroups.length === 0 &&
					importedGroups.length === 0 &&
					orphanItems.length === 0 && (
						<div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
							<p className="text-sm text-muted-foreground">
								No items were extracted from this interview.
							</p>
							<p className="text-xs text-muted-foreground/60">
								You can close this as finalized or retry extraction.
							</p>
						</div>
					)}
				{actionableGroups.map((group, index) => {
					const nonLocationItems = group.items.filter(
						(i) => i.itemType !== "location" && !orphanItemIds.has(i.id),
					);
					const resolved = nonLocationItems.every((i) => !_isPending(i));
					const empty =
						resolved &&
						nonLocationItems.every(
							(i) => i.status === "rejected" || i.status === "invalid",
						);
					const mapBlock = shouldBlockMapAction(group.items);
					return (
						<LocationGroupCard
							key={group.groupId}
							groupId={group.groupId}
							locationName={_groupLocationName(group)}
							streamCount={nonLocationItems.length}
							duplicateCandidates={
								group.items
									.find((i) => i.itemType === "location")
									?.duplicateCandidates?.map((c) => ({
										id: c.id,
										name: c.name,
									})) ?? undefined
							}
							canUseExistingMatch={!mapBlock.blocked}
							mapBlockedReason={mapBlock.reason}
							resolved={resolved}
							empty={empty}
							animationIndex={index}
							selected={selectedResolvedGroupIds.has(group.groupId)}
							onSelectedChange={(sel) => {
								setSelectedResolvedGroupIds((prev) => {
									const next = new Set(prev);
									if (sel) next.add(group.groupId);
									else next.delete(group.groupId);
									return next;
								});
							}}
							onResolve={(action) => void resolveGroup(group, action)}
						>
							{nonLocationItems.map((item) => {
								const start = _evidenceNum(item, "start_sec");
								const end = _evidenceNum(item, "end_sec");
								return (
									<StreamCard
										key={item.id}
										name={_itemName(item)}
										category={String(item.normalizedData.category ?? "")}
										status={item.status}
										statusLabel={_statusLabel(item.status, item.reviewNotes)}
										reviewNotes={item.reviewNotes ?? undefined}
										confidence={_confidence(item)}
										evidenceQuote={
											typeof item.extractedData.quote === "string"
												? item.extractedData.quote
												: undefined
										}
										evidenceStartSec={start}
										evidenceEndSec={end}
										onPlayEvidence={(sec) => setSeekToSec(sec)}
										isPending={_isPending(item)}
										itemType={item.itemType as "location" | "project"}
										onEdit={() => setEditingItem(item)}
										onAccept={() =>
											void setItemAction(item, "accept", {
												confirmCreateNew: false,
											})
										}
										onReject={() => {
											const name = _itemName(item);
											setItemAction(item, "reject")
												.then(() => {
													toast(`"${name}" rejected`, {
														action: {
															label: "Undo",
															onClick: () => void setItemAction(item, "reset"),
														},
														duration: 5000,
													});
												})
												.catch(() => toast.error(`Failed to reject "${name}"`));
										}}
									/>
								);
							})}
						</LocationGroupCard>
					);
				})}
			</div>

			{/* Orphan streams now route through Needs Confirmation only */}
			{orphanItems.length > 0 && (
				<div className="px-4 pb-4 space-y-2">
					<div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
						<p className="text-xs text-muted-foreground">
							Orphan streams can no longer be imported from voice review.
							Continue in Needs Confirmation to resolve location and confirm.
						</p>
						{knownLocationCount > 0 && (
							<p className="mt-1 text-[11px] text-muted-foreground/80">
								{knownLocationCount} known location
								{knownLocationCount === 1 ? "" : "s"} available for resolution.
							</p>
						)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-2"
							onClick={() => {
								onDismiss();
								router.push(routes.dashboard);
								toast("Open Needs Confirmation to continue review.");
							}}
						>
							Go to dashboard
						</Button>
					</div>
					{/* Mention card: location names heard in audio but not matched to known locations */}
					{orphanGroupNames.length > 0 && (
						<div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
							<AudioLines className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
							<p className="text-xs text-muted-foreground">
								Heard in audio:{" "}
								<span className="font-medium text-foreground">
									{orphanGroupNames.join(", ")}
								</span>
								{" — not matched to a known location"}
							</p>
						</div>
					)}
				</div>
			)}
			{/* Already imported groups (read-only, collapsed) */}
			{importedGroups.length > 0 && (
				<div className="px-4 pb-4">
					<details className="group">
						<summary className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-2">
							<Check className="h-3 w-3" />
							{importedGroups.length} group
							{importedGroups.length === 1 ? "" : "s"} already imported
						</summary>
						<div className="space-y-2 pt-1 opacity-50">
							{importedGroups.map((group) => (
								<div
									key={group.groupId}
									className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.02] p-3"
								>
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium">
											{_groupLocationName(group)}
										</span>
										<Badge
											variant="default"
											className="text-[10px] px-1.5 py-0 bg-emerald-600/80"
										>
											<Check className="h-2.5 w-2.5 mr-0.5" />
											Imported
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										{
											group.items.filter((i) => i.itemType !== "location")
												.length
										}{" "}
										stream
										{group.items.filter((i) => i.itemType !== "location")
											.length === 1
											? ""
											: "s"}
									</p>
								</div>
							))}
						</div>
					</details>
				</div>
			)}
		</ScrollArea>
	);

	const finalizeDisabledReason = getFinalizeDisabledReason({
		groupsCount: totalGroups,
		selectedResolvedCount: selectedGroupCount,
		importableStreamCount,
		finalizing,
		orphanCount: orphanItems.length,
		totalBackendGroups: groups.length,
	});
	const isFinalizeDisabled = finalizeDisabledReason !== null;
	const runLockedFinalizeDisabled = !runEditable;

	const finalizeTooltip: string | null = (() => {
		if (runLockedFinalizeDisabled) {
			return VOICE_RUN_LOCKED_MESSAGE;
		}
		switch (finalizeDisabledReason) {
			case "finalizing":
				return null;
			case "no_selection":
				return "Select at least one resolved group";
			case "no_importable_streams":
				return "Approve at least 1 stream to enable import";
			case "orphans_need_location":
				return "Assign locations to orphan streams first";
			case "no_actionable_streams":
				return "No importable streams in this extraction";
			default:
				return null;
		}
	})();

	const finalizeButtonLabel =
		finalizeDisabledReason === "orphans_need_location"
			? "Assign locations first"
			: totalGroups === 0
				? "Close as empty"
				: `Import ${importableStreamCount} stream${importableStreamCount === 1 ? "" : "s"} from ${selectedGroupCount} reviewed group${selectedGroupCount === 1 ? "" : "s"}`;

	const finalizeBar = (
		<div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
			<div className="flex items-center gap-2">
				<Badge
					variant="outline"
					className="text-xs border-emerald-500/30 text-emerald-400"
				>
					{selectedGroupCount}
				</Badge>
				<span className="text-sm text-muted-foreground">
					group{selectedGroupCount === 1 ? "" : "s"} selected
				</span>
			</div>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="inline-flex">
							<Button
								onClick={() => {
									if (!runEditable) {
										toast.error(VOICE_RUN_LOCKED_MESSAGE);
										return;
									}
									if (totalGroups === 0) {
										void finalizeSelected();
									} else {
										setConfirmOpen(true);
									}
								}}
								disabled={isFinalizeDisabled || runLockedFinalizeDisabled}
								className="bg-emerald-600 hover:bg-emerald-700 text-white"
							>
								{finalizing ? (
									<>
										<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
										Importing…
									</>
								) : (
									finalizeButtonLabel
								)}
							</Button>
						</span>
					</TooltipTrigger>
					{finalizeTooltip && (
						<TooltipContent>
							<p>{finalizeTooltip}</p>
						</TooltipContent>
					)}
				</Tooltip>
			</TooltipProvider>
		</div>
	);

	/**
	 * Hide finalize bar when there's nothing actionable to do:
	 * - All actionable groups gone + no orphans + already have imports (partial finalize done)
	 * - OR groups exist in backend but none are actionable (location-only groups, no streams)
	 */
	const runEffectivelyComplete =
		(actionableGroups.length === 0 &&
			orphanItems.length === 0 &&
			importedGroups.length > 0) ||
		finalizeDisabledReason === "no_actionable_streams";

	/* ── Close confirmation logic ── */
	const hasUsefulWork =
		pendingItemCount > 0 ||
		orphanItems.length > 0 ||
		(resolvedGroupIds.length > 0 && !runEffectivelyComplete);

	const closeConfirmDescription = (() => {
		const parts: string[] = [];
		if (resolvedGroupIds.length > 0 && !runEffectivelyComplete) {
			parts.push(
				`${resolvedGroupIds.length} reviewed group${resolvedGroupIds.length === 1 ? "" : "s"} not yet imported`,
			);
		}
		if (pendingItemCount > 0) {
			parts.push(
				`${pendingItemCount} stream${pendingItemCount === 1 ? "" : "s"} still need review`,
			);
		}
		if (orphanItems.length > 0) {
			parts.push(
				`${orphanItems.length} stream${orphanItems.length === 1 ? "" : "s"} need a location`,
			);
		}
		return parts.length > 0
			? `${parts.join(", ")}. Your individual stream decisions (accept/reject) are saved.`
			: "";
	})();
	const allReviewed = pendingItemCount === 0 && totalStreamCount > 0;

	const header = (
		<div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center rounded-full bg-emerald-500/10 p-1.5">
					<svg
						className="h-3.5 w-3.5 text-emerald-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<title>Voice review</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
						/>
					</svg>
				</div>
				<h3 className="text-sm font-semibold">Voice Review</h3>
				{/* Step indicator */}
				<div className="flex items-center gap-1.5 text-[11px]">
					<span
						className={
							allReviewed ? "text-emerald-400" : "text-foreground font-medium"
						}
					>
						{allReviewed ? (
							<Check className="h-3 w-3 inline mr-0.5 -mt-px" />
						) : (
							<span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground mr-1 -mt-px align-middle" />
						)}
						Review
					</span>
					<span className="text-muted-foreground/40">—</span>
					<span
						className={
							allReviewed
								? "text-foreground font-medium"
								: "text-muted-foreground/60"
						}
					>
						{allReviewed && (
							<span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground mr-1 -mt-px align-middle" />
						)}
						Import
					</span>
					{orphanItems.length > 0 && (
						<Badge
							variant="outline"
							className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-400 ml-1"
						>
							{orphanItems.length} need location
						</Badge>
					)}
				</div>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				onClick={() => {
					if (hasUsefulWork) {
						setCloseConfirmOpen(true);
					} else {
						onDismiss();
					}
				}}
				aria-label="Close voice review"
				title="Close voice review"
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	);

	/* ── Edit Item Drawer ── */
	const editDrawer = (
		<EditItemDrawer
			item={editingItem}
			open={editingItem !== null}
			onOpenChange={(open) => {
				if (!open) setEditingItem(null);
			}}
			onSaved={(updated) => {
				setItems((prev) =>
					prev.map((entry) => (entry.id === updated.id ? updated : entry)),
				);
			}}
		/>
	);

	const confirmDialog = (
		<ConfirmImportDialog
			open={confirmOpen}
			onOpenChange={setConfirmOpen}
			onConfirm={async () => {
				setConfirmOpen(false);
				await finalizeSelected();
			}}
			summary={{
				importableStreams: importableStreamCount,
				groupCount: selectedGroupCount,
				skippedItems: skippedItemCount,
				orphanCount: orphanItems.length,
			}}
			loading={finalizing}
		/>
	);

	const closeConfirmDialog = (
		<AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Leave voice review?</AlertDialogTitle>
					<AlertDialogDescription>
						{closeConfirmDescription}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onDismiss}>
						Leave without importing
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);

	/* ── Desktop: Split Panel ── */
	if (isDesktop) {
		return (
			<div className="rounded-xl border overflow-hidden bg-background">
				{header}
				<div style={{ height: "calc(100vh - 280px)", minHeight: 480 }}>
					<ResizablePanelGroup direction="horizontal">
						<ResizablePanel defaultSize={40} minSize={25}>
							{transcriptContent}
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={60} minSize={35}>
							<div className="flex flex-col h-full">
								<div className="px-4 py-2 border-b border-border/30">
									<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Extracted Data
									</p>
								</div>
								{extractedContent}
								{!runEffectivelyComplete && (
									<div className="border-t border-border/50 p-3">
										{finalizeBar}
									</div>
								)}
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</div>
				{editDrawer}
				{confirmDialog}
				{closeConfirmDialog}
			</div>
		);
	}

	/* ── Mobile: Tabs ── */
	return (
		<div className="rounded-xl border overflow-hidden bg-background">
			{header}
			<Tabs value={mobileTab} onValueChange={setMobileTab} className="w-full">
				<div className="px-4 pt-2">
					<TabsList className="w-full">
						<TabsTrigger value="extracted" className="flex-1">
							Extracted
						</TabsTrigger>
						<TabsTrigger value="transcript" className="flex-1">
							Transcript
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent
					value="extracted"
					className="mt-0"
					style={{ minHeight: 300 }}
				>
					{extractedContent}
					{!runEffectivelyComplete && (
						<div className="p-3 border-t border-border/50">{finalizeBar}</div>
					)}
				</TabsContent>
				<TabsContent
					value="transcript"
					className="mt-0"
					style={{ minHeight: 300 }}
				>
					{transcriptContent}
				</TabsContent>
			</Tabs>
			{editDrawer}
			{confirmDialog}
			{closeConfirmDialog}
		</div>
	);
}
