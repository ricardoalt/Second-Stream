"use client";

/**
 * Import Review Section — "Suggestion Cards" approach.
 *
 * Displays AI-extracted locations as cards that mirror the existing
 * Location cards on the Company page. Decisions happen at the
 * LOCATION level (Add / Skip / Edit), not per-item.
 *
 * Waste streams inside each location can be individually selected
 * via an expandable checkbox list (progressive disclosure).
 *
 * UI/UX improvements:
 * - Staggered card entrance animations (#2)
 * - Undo toast after Skip (#5)
 * - Better empty state with guidance (#6)
 * - Skeleton loading cards (#7)
 * - Success celebration animation (#8)
 * - Animated counter on Confirm button (#9)

 */

import {
	AlertTriangle,
	ArrowRight,
	Check,
	ChevronDown,
	ChevronUp,
	Edit3,
	FileQuestion,
	Loader2,
	MapPin,
	Package,
	SkipForward,
	Sparkles,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BulkImportItem, BulkImportRun } from "@/lib/api/bulk-import";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import { EditItemDrawer } from "./edit-item-drawer";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface LocationGroup {
	location: BulkImportItem;
	projects: BulkImportItem[];
	isSynthetic?: boolean;
}

type CardState = "pending" | "added" | "skipped";

interface ImportReviewSectionProps {
	run: BulkImportRun;
	onRunUpdated: (run: BulkImportRun) => void;
	onFinalized: () => void;
	onDismiss: () => void;
	reviewMode?: "company" | "location";
	locationContext?: { id: string; name: string } | undefined;
	/** Company locations for orphan-project picker (company mode only) */
	companyLocations?:
		| Array<{ id: string; name: string; city?: string | undefined }>
		| undefined;
	/** Called when user assigns orphan waste streams to a location */
	onAssignOrphans?: (
		locationId: string,
		locationName: string,
		itemIds: string[],
	) => Promise<void>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROUP BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildReviewGroups(
	items: BulkImportItem[],
	mode: "company" | "location",
	locationContext?: { id: string; name: string },
): LocationGroup[] {
	const locs = items.filter((i) => i.itemType === "location");
	const projs = items.filter((i) => i.itemType === "project");

	const buildSyntheticGroup = (
		projects: BulkImportItem[],
		context: { id: string; name: string },
	): LocationGroup | null => {
		const firstProj = projects[0];
		if (!firstProj) {
			return null;
		}
		const synthetic: BulkImportItem = {
			id: `synthetic-${context.id}`,
			runId: firstProj.runId,
			itemType: "location",
			status: "pending_review",
			needsReview: false,
			confidence: null,
			extractedData: {},
			normalizedData: { name: context.name },
			userAmendments: null,
			reviewNotes: null,
			duplicateCandidates: null,
			confirmCreateNew: false,
			parentItemId: null,
			createdLocationId: context.id,
			createdProjectId: null,
			groupId: null,
			createdAt: firstProj.createdAt,
			updatedAt: firstProj.updatedAt,
		};
		return { location: synthetic, projects, isSynthetic: true };
	};

	if (mode === "company") {
		return locs.map((loc) => ({
			location: loc,
			projects: projs.filter((p) => p.parentItemId === loc.id),
		}));
	}

	// Location mode: prefer real location item if backend returned one
	if (locs.length > 0) {
		const loc = locs[0];
		if (!loc) {
			return [];
		}
		const directProjects = projs.filter((p) => p.parentItemId === loc.id);
		if (directProjects.length > 0) {
			return [{ location: loc, projects: directProjects }];
		}
		if (projs.length > 0 && locationContext) {
			const fallback = buildSyntheticGroup(projs, locationContext);
			return fallback ? [fallback] : [];
		}
		return [{ location: loc, projects: [] }];
	}

	// Fallback: only projects, no location item → synthetic shell
	if (projs.length > 0 && locationContext) {
		const fallback = buildSyntheticGroup(projs, locationContext);
		return fallback ? [fallback] : [];
	}

	return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANIMATED COUNT (#9)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AnimatedCount({ value }: { value: number }) {
	return (
		<span
			key={value}
			className="inline-block animate-in zoom-in-50 duration-200"
		>
			{value}
		</span>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SKELETON CARD (#7)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SkeletonCard() {
	return (
		<Card className="border-muted animate-pulse">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<div className="h-5 w-36 bg-muted rounded" />
					<div className="h-4 w-12 bg-muted rounded" />
				</div>
				<div className="h-4 w-24 bg-muted rounded mt-1" />
			</CardHeader>
			<CardContent className="space-y-3 pt-0">
				<div className="h-4 w-48 bg-muted rounded" />
				<div className="flex flex-wrap gap-1.5">
					<div className="h-5 w-28 bg-muted rounded-md" />
					<div className="h-5 w-24 bg-muted rounded-md" />
					<div className="h-5 w-32 bg-muted rounded-md" />
				</div>
				<div className="flex gap-2 pt-1">
					<div className="h-8 flex-1 bg-muted rounded-md" />
					<div className="h-8 flex-1 bg-muted rounded-md" />
					<div className="h-8 flex-1 bg-muted rounded-md" />
				</div>
			</CardContent>
		</Card>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUCCESS ANIMATION (#8)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SuccessAnimation({
	count,
	onDone,
}: {
	count: number;
	onDone: () => void;
}) {
	useEffect(() => {
		const timer = setTimeout(onDone, 1800);
		return () => clearTimeout(timer);
	}, [onDone]);

	return (
		<div className="flex flex-col items-center justify-center py-12 animate-in zoom-in-50 fade-in duration-500">
			{/* Animated checkmark circle */}
			<div className="relative">
				<svg className="h-20 w-20" viewBox="0 0 80 80">
					<title>Import success</title>
					{/* Background circle */}
					<circle
						cx="40"
						cy="40"
						r="36"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						className="text-emerald-200 dark:text-emerald-900"
					/>
					{/* Animated circle */}
					<circle
						cx="40"
						cy="40"
						r="36"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						strokeLinecap="round"
						className="text-emerald-500"
						style={{
							strokeDasharray: "226",
							strokeDashoffset: "226",
							animation: "draw-circle 0.6s ease-out forwards",
						}}
					/>
					{/* Animated checkmark */}
					<path
						d="M24 42 L35 53 L56 30"
						fill="none"
						stroke="currentColor"
						strokeWidth="3.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-emerald-500"
						style={{
							strokeDasharray: "50",
							strokeDashoffset: "50",
							animation: "draw-check 0.4s ease-out 0.5s forwards",
						}}
					/>
				</svg>
			</div>
			<p
				className="mt-4 text-lg font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300"
				style={{ animationDelay: "0.7s", animationFillMode: "backwards" }}
			>
				{count} {count === 1 ? "location" : "locations"} imported!
			</p>

			{/* Keyframe styles */}
			<style jsx>{`
				@keyframes draw-circle {
					to { stroke-dashoffset: 0; }
				}
				@keyframes draw-check {
					to { stroke-dashoffset: 0; }
				}
			`}</style>
		</div>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ORPHAN LOCATION PICKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OrphanLocationPicker({
	orphanItems,
	filename,
	locations,
	onAssignOrphans,
	onDismiss,
}: {
	orphanItems: BulkImportItem[];
	filename: string;
	locations: Array<{ id: string; name: string; city?: string | undefined }>;
	onAssignOrphans: (
		locationId: string,
		locationName: string,
		itemIds: string[],
	) => Promise<void>;
	onDismiss: () => void;
}) {
	const [selectedLocationId, setSelectedLocationId] = useState<string>("");
	const [submitting, setSubmitting] = useState(false);
	const [excluded, setExcluded] = useState<Set<string>>(new Set());
	const selectedLocation = locations.find((l) => l.id === selectedLocationId);

	const toggleItem = useCallback((id: string) => {
		setExcluded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const includedCount = orphanItems.length - excluded.size;

	return (
		<Card className="border-primary/20 bg-primary/[0.02] animate-in fade-in slide-in-from-top-2 duration-300">
			<CardContent className="py-6 space-y-4">
				{/* Header */}
				<div className="flex items-start gap-3">
					<div className="p-2.5 rounded-full bg-primary/10 shrink-0">
						<Sparkles className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h3 className="text-base font-semibold">
							Found <span className="text-primary">{orphanItems.length}</span>{" "}
							waste stream{orphanItems.length === 1 ? "" : "s"} in &ldquo;
							{filename}&rdquo;
						</h3>
						<p className="text-sm text-muted-foreground mt-1">
							We detected waste stream data but couldn&rsquo;t identify a
							location. Select where to import them:
						</p>
					</div>
				</div>

				{/* Location selector */}
				<div className="pl-11">
					<Select
						value={selectedLocationId}
						onValueChange={setSelectedLocationId}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Choose a location…" />
						</SelectTrigger>
						<SelectContent>
							{locations.map((loc) => (
								<SelectItem key={loc.id} value={loc.id}>
									<span className="flex items-center gap-2">
										<MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										{loc.name}
										{loc.city && (
											<span className="text-muted-foreground">
												— {loc.city}
											</span>
										)}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Waste stream preview list — appears after location selection */}
				{selectedLocationId && (
					<div className="pl-11 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium text-muted-foreground">
								Waste streams to import to &ldquo;{selectedLocation?.name}
								&rdquo;
							</p>
							<Badge variant="secondary" className="text-xs">
								{includedCount} of {orphanItems.length} selected
							</Badge>
						</div>

						<div className="rounded-lg border divide-y max-h-[280px] overflow-y-auto">
							{orphanItems.map((item) => {
								const nd = item.normalizedData as Record<string, string>;
								const name = nd.name || "Unnamed stream";
								const category = nd.category;
								const volume = nd.estimated_volume;
								const isExcluded = excluded.has(item.id);

								return (
									// <label> can't associate with a <button> (Checkbox renders button); use button row
									<button
										key={item.id}
										type="button"
										onClick={() => toggleItem(item.id)}
										className={`flex w-full items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 text-left ${
											isExcluded ? "opacity-50 bg-muted/20" : ""
										}`}
									>
										<Checkbox
											checked={!isExcluded}
											onCheckedChange={() => toggleItem(item.id)}
											tabIndex={-1}
										/>
										<div className="flex-1 min-w-0">
											<span
												className={`text-sm font-medium ${isExcluded ? "line-through" : ""}`}
											>
												{name}
											</span>
											{(category || volume) && (
												<span className="text-xs text-muted-foreground ml-2">
													{[category, volume].filter(Boolean).join(" · ")}
												</span>
											)}
										</div>
										<Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="pl-11 flex items-center gap-2">
					<Button
						disabled={!selectedLocationId || submitting || includedCount === 0}
						onClick={async () => {
							if (selectedLocationId && selectedLocation) {
								setSubmitting(true);
								try {
									const selectedIds = orphanItems
										.filter((i) => !excluded.has(i.id))
										.map((i) => i.id);
									await onAssignOrphans(
										selectedLocationId,
										selectedLocation.name,
										selectedIds,
									);
								} finally {
									setSubmitting(false);
								}
							}
						}}
					>
						{submitting ? (
							<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
						) : (
							<ArrowRight className="h-4 w-4 mr-1.5" />
						)}
						{submitting
							? "Importing…"
							: `Import ${includedCount} stream${includedCount === 1 ? "" : "s"} to "${selectedLocation?.name ?? "…"}"`}
					</Button>
					<Button variant="ghost" size="sm" onClick={onDismiss}>
						Dismiss
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ImportReviewSection({
	run,
	onRunUpdated,
	onFinalized,
	onDismiss,
	reviewMode = "company",
	locationContext,
	companyLocations,
	onAssignOrphans,
}: ImportReviewSectionProps) {
	const [items, setItems] = useState<BulkImportItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
	const [editingItem, setEditingItem] = useState<BulkImportItem | null>(null);
	const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
	const [finalizing, setFinalizing] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [successCount, setSuccessCount] = useState(0);
	const [selectedProjects, setSelectedProjects] = useState<
		Record<string, Set<string>>
	>({});
	const [duplicateConfirmByLocation, setDuplicateConfirmByLocation] = useState<
		Record<string, boolean>
	>({});

	// Load all items (paginated — backend max 100 per page)
	const loadItems = useCallback(async () => {
		setLoading(true);
		try {
			const first = await bulkImportAPI.listItems(run.id, 1);
			let allItems = first.items;

			if (first.pages > 1) {
				const rest = await Promise.all(
					Array.from({ length: first.pages - 1 }, (_, i) =>
						bulkImportAPI.listItems(run.id, i + 2),
					),
				);
				for (const page of rest) {
					allItems = allItems.concat(page.items);
				}
			}

			setItems(allItems);

			const states: Record<string, CardState> = {};
			const selected: Record<string, Set<string>> = {};
			const duplicateConfirm: Record<string, boolean> = {};
			const locItems = allItems.filter((i) => i.itemType === "location");
			const projItems = allItems.filter((i) => i.itemType === "project");

			for (const loc of locItems) {
				if (loc.status === "accepted" || loc.status === "amended") {
					states[loc.id] = "added";
				} else if (loc.status === "rejected") {
					states[loc.id] = "skipped";
				} else {
					states[loc.id] = "pending";
				}
				const childIds = projItems
					.filter((p) => p.parentItemId === loc.id && p.status !== "invalid")
					.map((p) => p.id);
				selected[loc.id] = new Set(childIds);
				duplicateConfirm[loc.id] = Boolean(loc.confirmCreateNew);
			}

			// Initialize synthetic groups (location mode fallback)
			const builtGroups = buildReviewGroups(
				allItems,
				reviewMode,
				locationContext,
			);
			for (const group of builtGroups) {
				if (group.isSynthetic) {
					const locId = group.location.id;
					states[locId] = "pending";
					const validIds = group.projects
						.filter((p) => p.status !== "invalid")
						.map((p) => p.id);
					selected[locId] = new Set(validIds);
					duplicateConfirm[locId] = false;
				}
			}

			setCardStates(states);
			setSelectedProjects(selected);
			setDuplicateConfirmByLocation(duplicateConfirm);
		} catch {
			toast.error("Failed to load import data");
		} finally {
			setLoading(false);
		}
	}, [run.id, reviewMode, locationContext]);

	useEffect(() => {
		void loadItems();
	}, [loadItems]);

	// Group items
	const groups = useMemo(
		() => buildReviewGroups(items, reviewMode, locationContext),
		[items, reviewMode, locationContext],
	);

	// Counts
	const addedCount = Object.values(cardStates).filter(
		(s) => s === "added",
	).length;
	const pendingCount = Object.values(cardStates).filter(
		(s) => s === "pending",
	).length;
	const totalCount = groups.length;
	const allDecided = pendingCount === 0 && totalCount > 0;
	const canFinalize = addedCount > 0 && allDecided;

	// ── Actions ──────────────────────────────────────────

	const handleAdd = useCallback(
		async (group: LocationGroup) => {
			const locId = group.location.id;
			const selected = selectedProjects[locId] ?? new Set<string>();

			if (
				group.location.duplicateCandidates &&
				group.location.duplicateCandidates.length > 0 &&
				!duplicateConfirmByLocation[locId]
			) {
				toast.error(
					"Please confirm you want to add this as a new location first.",
				);
				return;
			}

			setActionLoadingId(locId);
			try {
				const confirmCreateNew = duplicateConfirmByLocation[locId];
				const options =
					confirmCreateNew === undefined ? undefined : { confirmCreateNew };
				// Skip patching synthetic location (it's a frontend-only shell)
				let updatedLoc = group.location;
				if (!group.isSynthetic) {
					updatedLoc = await bulkImportAPI.patchItem(locId, "accept", options);
				}
				const updatedProjects: BulkImportItem[] = [];
				for (const proj of group.projects) {
					if (proj.status === "invalid") continue;
					const action = selected.has(proj.id) ? "accept" : "reject";
					const up = await bulkImportAPI.patchItem(proj.id, action);
					updatedProjects.push(up);
				}
				setItems((prev) =>
					prev.map((i) => {
						if (i.id === updatedLoc.id) return updatedLoc;
						const proj = updatedProjects.find((p) => p.id === i.id);
						return proj ?? i;
					}),
				);
				setCardStates((prev) => ({ ...prev, [locId]: "added" }));
				setDuplicateConfirmByLocation((prev) => ({
					...prev,
					[locId]: Boolean(updatedLoc.confirmCreateNew),
				}));

				const updatedRun = await bulkImportAPI.getRun(run.id);
				onRunUpdated(updatedRun);
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to add location",
				);
			} finally {
				setActionLoadingId(null);
			}
		},
		[run.id, onRunUpdated, selectedProjects, duplicateConfirmByLocation],
	);

	const handleUndo = useCallback(
		async (group: LocationGroup) => {
			const locId = group.location.id;
			setActionLoadingId(locId);
			try {
				if (!group.isSynthetic) {
					await bulkImportAPI.patchItem(locId, "reset");
				}
				for (const proj of group.projects) {
					if (proj.status !== "invalid") {
						await bulkImportAPI.patchItem(proj.id, "reset");
					}
				}
				setCardStates((prev) => ({ ...prev, [locId]: "pending" }));

				const validIds = group.projects
					.filter((p) => p.status !== "invalid")
					.map((p) => p.id);
				setSelectedProjects((prev) => ({
					...prev,
					[locId]: new Set(validIds),
				}));
				setDuplicateConfirmByLocation((prev) => ({ ...prev, [locId]: false }));

				const updatedRun = await bulkImportAPI.getRun(run.id);
				onRunUpdated(updatedRun);
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to undo");
			} finally {
				setActionLoadingId(null);
			}
		},
		[run.id, onRunUpdated],
	);

	// (#5) Undo toast after Skip
	const handleSkip = useCallback(
		async (group: LocationGroup) => {
			const locId = group.location.id;
			setActionLoadingId(locId);
			try {
				if (!group.isSynthetic) {
					await bulkImportAPI.patchItem(locId, "reject");
				} else {
					// For synthetic: reject all child projects
					for (const proj of group.projects) {
						if (proj.status !== "invalid") {
							await bulkImportAPI.patchItem(proj.id, "reject");
						}
					}
				}
				setCardStates((prev) => ({ ...prev, [locId]: "skipped" }));

				const updatedRun = await bulkImportAPI.getRun(run.id);
				onRunUpdated(updatedRun);

				const locName = String(
					group.location.normalizedData.name ?? "Location",
				);
				toast(`"${locName}" skipped`, {
					action: {
						label: "Undo",
						onClick: () => {
							void handleUndo(group);
						},
					},
					duration: 5000,
				});
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to skip location",
				);
			} finally {
				setActionLoadingId(null);
			}
		},
		[run.id, onRunUpdated, handleUndo],
	);

	const handleConfirmDuplicate = useCallback(
		(locationId: string, checked: boolean) => {
			setDuplicateConfirmByLocation((prev) => ({
				...prev,
				[locationId]: checked,
			}));
		},
		[],
	);

	const handleAddAll = useCallback(async () => {
		const pendingGroups = groups.filter(
			(g) => cardStates[g.location.id] === "pending",
		);
		for (const group of pendingGroups) {
			if (
				group.location.duplicateCandidates &&
				group.location.duplicateCandidates.length > 0 &&
				!duplicateConfirmByLocation[group.location.id]
			)
				continue;
			await handleAdd(group);
		}
	}, [groups, cardStates, handleAdd, duplicateConfirmByLocation]);

	const toggleProject = useCallback((locationId: string, projectId: string) => {
		setSelectedProjects((prev) => {
			const current = new Set(prev[locationId] ?? []);
			if (current.has(projectId)) {
				current.delete(projectId);
			} else {
				current.add(projectId);
			}
			return { ...prev, [locationId]: current };
		});
	}, []);

	const handleItemSaved = useCallback((updated: BulkImportItem) => {
		setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
		if (updated.itemType === "location") {
			setCardStates((prev) => ({ ...prev, [updated.id]: "added" }));
		}
	}, []);

	// (#8) Success celebration before finalize callback
	const handleFinalize = useCallback(async () => {
		setFinalizing(true);
		try {
			const result = await bulkImportAPI.finalize(run.id);
			const createdCount =
				reviewMode === "location"
					? result.summary.projectsCreated
					: result.summary.locationsCreated;
			setSuccessCount(createdCount);
			setShowSuccess(true);
			// onFinalized will be called after animation completes
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Import failed");
			setFinalizing(false);
		}
	}, [run.id, reviewMode]);

	const handleSuccessDone = useCallback(() => {
		const label = reviewMode === "location" ? "waste stream" : "location";
		const plural = successCount === 1 ? label : `${label}s`;
		toast.success("Import complete!", {
			description: `${successCount} ${plural} added successfully.`,
		});
		onFinalized();
	}, [successCount, onFinalized, reviewMode]);

	// ── Render ───────────────────────────────────────────

	// (#8) Success celebration
	if (showSuccess) {
		return <SuccessAnimation count={successCount} onDone={handleSuccessDone} />;
	}

	// (#7) Skeleton loading
	if (loading) {
		return (
			<div className="space-y-4 animate-in fade-in duration-300">
				<div className="flex items-center gap-2">
					<div className="h-5 w-5 bg-muted rounded animate-pulse" />
					<div className="h-6 w-64 bg-muted rounded animate-pulse" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<SkeletonCard />
					<SkeletonCard />
				</div>
			</div>
		);
	}

	// Orphan projects: waste streams found but no location context (visible in any mode)
	const orphanProjects = items.filter(
		(i) => i.itemType === "project" && !i.createdProjectId && !i.parentItemId,
	);
	const hasOrphanProjects =
		reviewMode === "company" && orphanProjects.length > 0;
	// Both props must be present for the orphan picker to render; narrow here to avoid `!` later.
	const orphanPickerProps =
		hasOrphanProjects &&
		companyLocations &&
		companyLocations.length > 0 &&
		onAssignOrphans
			? { locations: companyLocations, onAssignOrphans }
			: null;
	const showOrphanPicker = orphanPickerProps !== null;

	// (#6) Empty state (no groups AND no orphans)
	if (groups.length === 0 && !showOrphanPicker) {
		return (
			<Card className="border-dashed border-muted-foreground/30">
				<CardContent className="py-10 text-center space-y-4">
					<div className="mx-auto p-3 rounded-full bg-muted w-fit">
						<FileQuestion className="h-8 w-8 text-muted-foreground" />
					</div>
					<div>
						<h3 className="text-base font-semibold">
							{hasOrphanProjects
								? "Waste streams found, but no locations available"
								: "No locations found in your file"}
						</h3>
						<p className="text-sm text-muted-foreground mt-1">
							{hasOrphanProjects
								? "Create a location first, then import your file from that location page."
								: "Make sure your document contains location names, addresses, or waste stream details."}
						</p>
					</div>
					{!hasOrphanProjects && (
						<div className="flex items-center justify-center gap-2 flex-wrap">
							{["XLSX", "PDF", "DOCX"].map((f) => (
								<span
									key={f}
									className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground"
								>
									.{f.toLowerCase()}
								</span>
							))}
						</div>
					)}
					<Button variant="outline" size="sm" onClick={onDismiss}>
						{hasOrphanProjects ? "Dismiss" : "Try Another File"}
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Pure orphan case: only orphans, no location groups
	if (groups.length === 0 && orphanPickerProps) {
		return (
			<OrphanLocationPicker
				orphanItems={orphanProjects}
				filename={run.sourceFilename}
				locations={orphanPickerProps.locations}
				onAssignOrphans={orphanPickerProps.onAssignOrphans}
				onDismiss={onDismiss}
			/>
		);
	}

	return (
		<div className="space-y-4 animate-in fade-in duration-300">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Sparkles className="h-5 w-5 text-primary" />
					<h3 className="text-lg font-semibold">
						{reviewMode === "location" ? (
							<>
								We found {groups.reduce((sum, g) => sum + g.projects.length, 0)}{" "}
								waste stream
								{groups.reduce((sum, g) => sum + g.projects.length, 0) === 1
									? ""
									: "s"}{" "}
								in{" "}
								<span className="text-primary">
									&ldquo;{run.sourceFilename}&rdquo;
								</span>
							</>
						) : (
							<>
								We found {totalCount}{" "}
								{totalCount === 1 ? "location" : "locations"} in{" "}
								<span className="text-primary">
									&ldquo;{run.sourceFilename}&rdquo;
								</span>
							</>
						)}
					</h3>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onClick={onDismiss}
				>
					<X className="h-4 w-4" />
				</Button>
			</div>

			{/* Suggestion Cards (#2 staggered animation) */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{groups.map((group, index) => (
					<SuggestionCard
						key={group.location.id}
						group={group}
						index={index}
						state={cardStates[group.location.id] ?? "pending"}
						selectedIds={selectedProjects[group.location.id] ?? new Set()}
						onToggleProject={(projId) =>
							toggleProject(group.location.id, projId)
						}
						onAdd={() => handleAdd(group)}
						onSkip={() => handleSkip(group)}
						onUndo={() => handleUndo(group)}
						onEdit={() => {
							if (!group.isSynthetic) {
								setEditingItem(group.location);
							}
						}}
						onConfirmDuplicate={handleConfirmDuplicate}
						duplicateConfirmed={Boolean(
							duplicateConfirmByLocation[group.location.id],
						)}
						isLoading={actionLoadingId === group.location.id}
					/>
				))}
			</div>

			{/* Unassigned waste streams (orphans alongside location groups) */}
			{orphanPickerProps && (
				<OrphanLocationPicker
					orphanItems={orphanProjects}
					filename={run.sourceFilename}
					locations={orphanPickerProps.locations}
					onAssignOrphans={orphanPickerProps.onAssignOrphans}
					onDismiss={onDismiss}
				/>
			)}

			{/* Bottom bar */}
			<div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
				<div className="flex items-center gap-3">
					<p className="text-sm text-muted-foreground">
						{allDecided ? (
							<>
								<strong>
									<AnimatedCount value={addedCount} />
								</strong>{" "}
								{reviewMode === "location"
									? addedCount === 1
										? "group"
										: "groups"
									: addedCount === 1
										? "location"
										: "locations"}{" "}
								ready to add
							</>
						) : (
							<>
								<strong>
									<AnimatedCount value={pendingCount} />
								</strong>{" "}
								of {totalCount} still to review
							</>
						)}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{pendingCount > 0 && (
						<Button variant="outline" size="sm" onClick={handleAddAll}>
							<Check className="h-3.5 w-3.5 mr-1.5" />
							Add All
						</Button>
					)}
					<Button
						size="sm"
						disabled={!canFinalize || finalizing}
						onClick={handleFinalize}
					>
						{finalizing ? (
							<>
								<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
								Creating...
							</>
						) : (
							<>
								<Check className="h-3.5 w-3.5 mr-1.5" />
								Confirm Import
								{addedCount > 0 && (
									<>
										{" "}
										(<AnimatedCount value={addedCount} />)
									</>
								)}
							</>
						)}
					</Button>
				</div>
			</div>

			{/* Edit Drawer */}
			<EditItemDrawer
				item={editingItem}
				open={!!editingItem}
				onOpenChange={(open) => {
					if (!open) setEditingItem(null);
				}}
				onSaved={handleItemSaved}
			/>
		</div>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUGGESTION CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SuggestionCard({
	group,
	index,
	state,
	selectedIds,
	onToggleProject,
	onAdd,
	onSkip,
	onUndo,
	onEdit,
	onConfirmDuplicate,
	duplicateConfirmed,
	isLoading,
}: {
	group: LocationGroup;
	index: number;
	state: CardState;
	selectedIds: Set<string>;
	onToggleProject: (projectId: string) => void;
	onAdd: () => void;
	onSkip: () => void;
	onUndo: () => void;
	onEdit: () => void;
	onConfirmDuplicate: (locationId: string, checked: boolean) => void;
	duplicateConfirmed: boolean;
	isLoading: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const { location, projects } = group;
	const name = String(location.normalizedData.name ?? "Unknown Location");
	const city = String(location.normalizedData.city ?? "");
	const stateStr = String(location.normalizedData.state ?? "");
	const address = String(location.normalizedData.address ?? "");

	const hasDuplicates =
		location.duplicateCandidates && location.duplicateCandidates.length > 0;
	const validProjects = projects.filter((p) => p.status !== "invalid");
	const selectedCount = validProjects.filter((p) =>
		selectedIds.has(p.id),
	).length;
	const allSelected = selectedCount === validProjects.length;

	const isAdded = state === "added";
	const isSkipped = state === "skipped";
	const isPending = state === "pending";
	const isSynthetic = Boolean(group.isSynthetic);
	const editButton = (
		<Button
			variant="outline"
			size="sm"
			className="flex-1"
			onClick={onEdit}
			disabled={isSynthetic}
		>
			<Edit3 className="h-3.5 w-3.5 mr-1.5" />
			Edit
		</Button>
	);

	return (
		<Card
			className={`
				transition-all duration-200 relative overflow-hidden
				animate-in fade-in slide-in-from-right-4
				${isPending ? "border-primary/40 bg-primary/[0.02] hover:shadow-md hover:border-primary/60" : ""}
				${isAdded ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" : ""}
				${isSkipped ? "border-muted bg-muted/20 opacity-60" : ""}

			`}
			style={{
				animationDelay: `${index * 80}ms`,
				animationFillMode: "backwards",
				animationDuration: "400ms",
			}}
		>
			{/* Status ribbon */}
			{!isPending && (
				<div
					className={`absolute top-0 left-0 right-0 h-1 ${
						isAdded ? "bg-emerald-500" : "bg-muted-foreground/30"
					}`}
				/>
			)}

			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<CardTitle className="text-base">{name}</CardTitle>
							{isPending && (
								<Badge
									variant="outline"
									className="text-[10px] border-primary/40 text-primary bg-primary/5"
								>
									<Sparkles className="h-2.5 w-2.5 mr-1" />
									NEW
								</Badge>
							)}
							{isAdded && (
								<Badge
									variant="outline"
									className="text-[10px] border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
								>
									<Check className="h-2.5 w-2.5 mr-1" />
									Added
								</Badge>
							)}
							{isSkipped && (
								<Badge
									variant="outline"
									className="text-[10px] border-muted-foreground/30 text-muted-foreground"
								>
									<SkipForward className="h-2.5 w-2.5 mr-1" />
									Skipped
								</Badge>
							)}
						</div>
						{(city || stateStr) && (
							<p className="text-sm text-muted-foreground mt-0.5">
								{[city, stateStr].filter(Boolean).join(", ")}
							</p>
						)}
					</div>

					{isLoading && (
						<Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0 mt-1" />
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-3 pt-0">
				{/* Address */}
				{address && (
					<div className="flex items-start gap-2 text-sm text-muted-foreground">
						<MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
						<span>{address}</span>
					</div>
				)}

				{/* Waste streams — progressive disclosure */}
				{validProjects.length > 0 && (
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<p className="text-xs font-medium text-muted-foreground">
								{allSelected
									? `${validProjects.length} waste ${validProjects.length === 1 ? "stream" : "streams"} found`
									: `${selectedCount} of ${validProjects.length} waste streams selected`}
							</p>
							{isPending && validProjects.length > 1 && (
								<button
									type="button"
									className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
									onClick={() => setExpanded(!expanded)}
								>
									{expanded ? "Hide" : "Review items"}
									{expanded ? (
										<ChevronUp className="h-3 w-3" />
									) : (
										<ChevronDown className="h-3 w-3" />
									)}
								</button>
							)}
						</div>

						{/* Collapsed: pills */}
						{!expanded && (
							<div className="flex flex-wrap gap-1.5">
								{validProjects.map((proj) => {
									const isSelected = selectedIds.has(proj.id);
									return (
										<span
											key={proj.id}
											className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border transition-opacity ${
												isSelected
													? "bg-muted"
													: "bg-muted/40 opacity-50 line-through"
											}`}
										>
											<Package className="h-3 w-3 text-muted-foreground" />
											{String(proj.normalizedData.name ?? "Unnamed")}
										</span>
									);
								})}
							</div>
						)}

						{/* Expanded: checkbox list */}
						{expanded && (
							<div className="rounded-lg border bg-muted/30 p-2 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
								{validProjects.map((proj) => {
									const isSelected = selectedIds.has(proj.id);
									return (
										<label
											key={proj.id}
											htmlFor={`ws-${proj.id}`}
											className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
										>
											<Checkbox
												id={`ws-${proj.id}`}
												checked={isSelected}
												onCheckedChange={() => onToggleProject(proj.id)}
											/>
											<Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
											<span
												className={`text-sm ${isSelected ? "" : "text-muted-foreground line-through"}`}
											>
												{String(proj.normalizedData.name ?? "Unnamed")}
											</span>
										</label>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* Duplicate warning */}
				{hasDuplicates && isPending && (
					<DuplicateWarning
						location={location}
						checked={duplicateConfirmed}
						onConfirm={onConfirmDuplicate}
						isLoading={isLoading}
					/>
				)}

				{/* Actions */}
				{!isLoading && (
					<div className="flex gap-2 pt-1">
						{isPending && (
							<>
								<Button
									variant="outline"
									size="sm"
									className="flex-1 text-muted-foreground"
									onClick={onSkip}
								>
									<SkipForward className="h-3.5 w-3.5 mr-1.5" />
									Skip
								</Button>
								{isSynthetic ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="flex-1">{editButton}</span>
										</TooltipTrigger>
										<TooltipContent>
											Edit individual waste streams not location shell
										</TooltipContent>
									</Tooltip>
								) : (
									editButton
								)}
								<Button
									size="sm"
									className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
									onClick={onAdd}
									disabled={selectedCount === 0}
								>
									<Check className="h-3.5 w-3.5 mr-1.5" />
									Add
									{!allSelected && selectedCount > 0
										? ` (${selectedCount})`
										: ""}
								</Button>
							</>
						)}
						{(isAdded || isSkipped) && (
							<Button
								variant="ghost"
								size="sm"
								className="text-xs text-muted-foreground"
								onClick={onUndo}
							>
								Undo
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DUPLICATE WARNING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DuplicateWarning({
	location,
	checked,
	onConfirm,
	isLoading,
}: {
	location: BulkImportItem;
	checked: boolean;
	onConfirm: (locationId: string, checked: boolean) => void;
	isLoading: boolean;
}) {
	const candidates = location.duplicateCandidates;
	if (!candidates || candidates.length === 0) return null;
	const first = candidates[0];
	if (!first) return null;

	return (
		<div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/20 dark:border-amber-800">
			<div className="flex items-start gap-2">
				<AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
				<div className="flex-1 space-y-2">
					<p className="text-sm text-amber-800 dark:text-amber-300">
						Similar to <strong>&ldquo;{first.name}&rdquo;</strong> already in
						your system.
						{first.reason && (
							<span className="block text-xs text-amber-600 dark:text-amber-400 mt-0.5">
								{first.reason}
							</span>
						)}
					</p>
					<div className="flex items-center gap-2">
						<Checkbox
							id={`dup-${location.id}`}
							checked={checked}
							disabled={isLoading}
							onCheckedChange={(checked) => {
								onConfirm(location.id, Boolean(checked));
							}}
						/>
						<label
							htmlFor={`dup-${location.id}`}
							className="text-sm text-amber-700 dark:text-amber-400 cursor-pointer"
						>
							I want to add this as a separate location
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}
