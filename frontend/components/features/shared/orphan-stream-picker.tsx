"use client";

/**
 * Orphan Stream Picker — shared component for assigning unlinked waste streams
 * to an existing location. Used by both bulk import and voice interview flows.
 */

import { ArrowRight, Loader2, MapPin, Package, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { BulkImportItem } from "@/lib/api/bulk-import";

interface OrphanStreamPickerProps {
	/** Items that have no parent location */
	orphanItems: BulkImportItem[];
	/** Label shown in the header (filename or "Voice interview") */
	sourceLabel: string;
	/** Available locations to assign to */
	locations: Array<{ id: string; name: string; city?: string | undefined }>;
	/** Called when user confirms assignment */
	onAssign: (
		locationId: string,
		locationName: string,
		itemIds: string[],
	) => Promise<void>;
	/** Called when user dismisses the picker (optional — omit to hide dismiss button) */
	onDismiss?: (() => void) | undefined;
	/** Disable all editing actions when run is locked */
	disabled?: boolean;
	/** Test seam: default selected location */
	initialSelectedLocationId?: string;
}

export function OrphanStreamPicker({
	orphanItems,
	sourceLabel,
	locations,
	onAssign,
	onDismiss,
	disabled = false,
	initialSelectedLocationId = "",
}: OrphanStreamPickerProps) {
	const [selectedLocationId, setSelectedLocationId] = useState<string>(
		initialSelectedLocationId,
	);
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

	const handleAssign = useCallback(async () => {
		if (!selectedLocationId || !selectedLocation) return;
		setSubmitting(true);
		try {
			const selectedIds = orphanItems
				.filter((i) => !excluded.has(i.id))
				.map((i) => i.id);
			await onAssign(selectedLocationId, selectedLocation.name, selectedIds);
		} finally {
			setSubmitting(false);
		}
	}, [selectedLocationId, selectedLocation, orphanItems, excluded, onAssign]);

	return (
		<Card className="border-warning/20 bg-warning/[0.02] animate-in fade-in slide-in-from-top-2 duration-300">
			<CardContent className="py-6 space-y-4">
				{/* Header */}
				<div className="flex items-start gap-3">
					<div className="p-2.5 rounded-full bg-warning/10 shrink-0">
						<Sparkles className="h-5 w-5 text-warning" />
					</div>
					<div>
						<h3 className="text-base font-semibold">
							Found <span className="text-warning">{orphanItems.length}</span>{" "}
							unassigned waste stream
							{orphanItems.length === 1 ? "" : "s"}
						</h3>
						<p className="text-sm text-muted-foreground mt-1">
							These streams from &ldquo;{sourceLabel}&rdquo; couldn&rsquo;t be
							linked to a location. Select where to import them:
						</p>
					</div>
				</div>

				{/* Location selector */}
				<div className="pl-11">
					<Select
						value={selectedLocationId}
						onValueChange={setSelectedLocationId}
						disabled={disabled || submitting}
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

				{/* Waste stream preview list */}
				{selectedLocationId && (
					<div className="pl-11 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium text-muted-foreground">
								Waste streams to import to &ldquo;
								{selectedLocation?.name}&rdquo;
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
								const isExcluded = excluded.has(item.id);

								const checkboxId = `orphan-${item.id}`;

								return (
									<div
										key={item.id}
										className={`flex w-full items-center gap-3 px-3 py-2.5 transition-colors ${
											isExcluded
												? "opacity-50 bg-muted/20"
												: "hover:bg-muted/50"
										}`}
									>
										<Checkbox
											id={checkboxId}
											checked={!isExcluded}
											onCheckedChange={() => toggleItem(item.id)}
											disabled={disabled || submitting}
										/>
										<label
											htmlFor={checkboxId}
											className={`flex-1 min-w-0 ${
												disabled || submitting
													? "cursor-not-allowed"
													: "cursor-pointer"
											}`}
										>
											<span
												className={`text-sm font-medium ${isExcluded ? "line-through" : ""}`}
											>
												{name}
											</span>
											{category && (
												<span className="text-xs text-muted-foreground ml-2">
													{category}
												</span>
											)}
										</label>
										<Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="pl-11 flex items-center gap-2">
					<Button
						disabled={
							disabled ||
							!selectedLocationId ||
							submitting ||
							includedCount === 0
						}
						onClick={() => void handleAssign()}
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
					{onDismiss && (
						<Button variant="ghost" size="sm" onClick={onDismiss}>
							Dismiss
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
