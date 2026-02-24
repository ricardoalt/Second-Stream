"use client";

import { Check, Loader2, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	type BulkImportItem,
	type BulkImportRun,
	bulkImportAPI,
} from "@/lib/api/bulk-import";
import { intakeAPI } from "@/lib/api/intake";
import { voiceInterviewsApi } from "@/lib/api/voice-interviews";
import { shouldDisableFinalizeAction } from "./voice-review-guards";

interface VoiceReviewWorkspaceProps {
	run: BulkImportRun;
	voiceInterviewId: string;
	onRunUpdated: (run: BulkImportRun) => void;
	onDismiss: () => void;
	onDone: () => void;
}

interface VoiceGroup {
	groupId: string;
	items: BulkImportItem[];
}

function _isPending(item: BulkImportItem): boolean {
	return item.status === "pending_review";
}

function _itemLabel(item: BulkImportItem): string {
	const raw = item.normalizedData.name;
	if (typeof raw === "string" && raw.trim().length > 0) {
		return raw;
	}
	return item.itemType === "location" ? "Location" : "Waste stream";
}

function _evidenceStart(item: BulkImportItem): number | null {
	const start = item.extractedData.start_sec;
	if (typeof start === "number") {
		return start;
	}
	if (typeof start === "string" && start.trim().length > 0) {
		const parsed = Number(start);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return null;
}

function _evidenceEnd(item: BulkImportItem): number | null {
	const end = item.extractedData.end_sec;
	if (typeof end === "number") {
		return end;
	}
	if (typeof end === "string" && end.trim().length > 0) {
		const parsed = Number(end);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return null;
}

function _editableDraft(item: BulkImportItem): Record<string, unknown> {
	if (item.itemType === "location") {
		return {
			name: item.normalizedData.name ?? "",
			city: item.normalizedData.city ?? "",
			state: item.normalizedData.state ?? "",
			address: item.normalizedData.address ?? "",
		};
	}
	return {
		name: item.normalizedData.name ?? "",
		category: item.normalizedData.category ?? "",
		project_type: item.normalizedData.project_type ?? "Assessment",
		description: item.normalizedData.description ?? "",
	};
}

export function VoiceReviewWorkspace({
	run,
	voiceInterviewId,
	onRunUpdated,
	onDismiss,
	onDone,
}: VoiceReviewWorkspaceProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState<BulkImportItem[]>([]);
	const [transcriptText, setTranscriptText] = useState("");
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [selectedResolvedGroupIds, setSelectedResolvedGroupIds] = useState<
		Set<string>
	>(new Set());
	const [finalizing, setFinalizing] = useState(false);
	const [draftByItemId, setDraftByItemId] = useState<
		Record<string, Record<string, unknown>>
	>({});
	const [success, setSuccess] = useState<{
		created: number;
		pending: number;
	} | null>(null);
	const [successTargetProjectId, setSuccessTargetProjectId] = useState<
		string | null
	>(null);

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
		setDraftByItemId((prev) => {
			const next = { ...prev };
			for (const item of allItems) {
				if (next[item.id]) {
					continue;
				}
				next[item.id] = _editableDraft(item);
			}
			return next;
		});
		return allItems;
	}, [run.id]);

	const loadWorkspace = useCallback(async () => {
		setLoading(true);
		try {
			const [transcript, audio] = await Promise.all([
				voiceInterviewsApi.getTranscript(voiceInterviewId),
				voiceInterviewsApi.getAudioUrl(voiceInterviewId),
			]);
			setTranscriptText(transcript.transcriptText);
			setAudioUrl(audio.audioUrl);
			await loadItems();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not load voice review",
			);
		} finally {
			setLoading(false);
		}
	}, [voiceInterviewId, loadItems]);

	useEffect(() => {
		void loadWorkspace();
	}, [loadWorkspace]);

	const groups = useMemo<VoiceGroup[]>(() => {
		const byGroup = new Map<string, BulkImportItem[]>();
		for (const item of items) {
			if (!item.groupId) {
				continue;
			}
			const current = byGroup.get(item.groupId);
			if (current) {
				current.push(item);
				continue;
			}
			byGroup.set(item.groupId, [item]);
		}
		return Array.from(byGroup.entries()).map(([groupId, groupedItems]) => ({
			groupId,
			items: groupedItems,
		}));
	}, [items]);

	const resolvedGroupIds = useMemo(() => {
		return groups
			.filter((group) => group.items.every((item) => !_isPending(item)))
			.map((group) => group.groupId);
	}, [groups]);

	useEffect(() => {
		setSelectedResolvedGroupIds(new Set(resolvedGroupIds));
	}, [resolvedGroupIds]);

	const setItemAction = useCallback(
		async (
			item: BulkImportItem,
			action: "accept" | "reject" | "amend",
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
		async (group: VoiceGroup, mode: "map" | "create" | "reject") => {
			const pendingItems = group.items.filter(
				(item) => item.status === "pending_review",
			);
			if (pendingItems.length === 0) {
				return;
			}
			for (const item of pendingItems) {
				if (mode === "reject") {
					await setItemAction(item, "reject");
					continue;
				}
				await setItemAction(item, "accept", {
					confirmCreateNew: mode === "create",
				});
			}
		},
		[setItemAction],
	);

	const playAt = useCallback((seconds: number) => {
		const player = audioRef.current;
		if (!player) {
			return;
		}
		player.currentTime = Math.max(0, seconds);
		void player.play();
	}, []);

	const finalizeSelected = useCallback(async () => {
		if (groups.length > 0 && selectedResolvedGroupIds.size === 0) {
			toast.error("Select at least one resolved group");
			return;
		}
		const selectedGroupIds = Array.from(selectedResolvedGroupIds.values());
		setFinalizing(true);
		try {
			const closeReason = groups.length === 0 ? "empty_extraction" : undefined;
			const response = await bulkImportAPI.finalize(run.id, {
				resolvedGroupIds: selectedGroupIds,
				idempotencyKey: crypto.randomUUID(),
				...(closeReason ? { closeReason } : {}),
			});

			const updatedRun = await bulkImportAPI.getRun(run.id);
			onRunUpdated(updatedRun);
			const refreshedItems = await loadItems();

			if (updatedRun.status !== "completed") {
				toast.success("Resolved groups finalized. Unresolved groups remain.");
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
					(suggestion) => suggestion.status === "pending",
				).length;
				pendingSuggestions += projectPending;
				if (projectPending > 0 && targetProjectId === null) {
					targetProjectId = projectId;
				}
			}

			setSuccess({
				created: response.summary.projectsCreated,
				pending: pendingSuggestions,
			});
			setSuccessTargetProjectId(targetProjectId);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Finalize failed");
		} finally {
			setFinalizing(false);
		}
	}, [
		groups.length,
		loadItems,
		onRunUpdated,
		run.id,
		selectedResolvedGroupIds,
	]);

	if (success) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Voice interview finalized</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Created {success.created} waste stream
						{success.created === 1 ? "" : "s"}.
					</p>
					<p className="text-sm text-muted-foreground">
						Pending questionnaire suggestions: {success.pending}.
					</p>
					<div className="flex gap-2">
						<Button
							disabled={!successTargetProjectId}
							onClick={() => {
								if (!successTargetProjectId) {
									return;
								}
								window.location.href = `/project/${successTargetProjectId}?tab=technical`;
							}}
						>
							Review suggestions now
						</Button>
						<Button variant="outline" onClick={onDone}>
							Close
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[240px]">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Voice review workspace</h3>
				<Button variant="ghost" size="icon" onClick={onDismiss}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<Tabs defaultValue="extracted" className="w-full">
				<TabsList>
					<TabsTrigger value="extracted">Extracted</TabsTrigger>
					<TabsTrigger value="transcript">Transcript</TabsTrigger>
				</TabsList>
				<TabsContent value="extracted" className="space-y-3">
					{groups.map((group) => {
						const resolved = group.items.every((item) => !_isPending(item));
						return (
							<Card key={group.groupId}>
								<CardHeader className="pb-2 space-y-2">
									<div className="flex items-center justify-between">
										<CardTitle className="text-base">{group.groupId}</CardTitle>
										<div className="flex items-center gap-2">
											<Badge variant={resolved ? "default" : "secondary"}>
												{resolved ? "resolved" : "pending"}
											</Badge>
											{resolved && (
												<Checkbox
													checked={selectedResolvedGroupIds.has(group.groupId)}
													onCheckedChange={(checked) => {
														setSelectedResolvedGroupIds((prev) => {
															const next = new Set(prev);
															if (checked) {
																next.add(group.groupId);
															} else {
																next.delete(group.groupId);
															}
															return next;
														});
													}}
												/>
											)}
										</div>
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												void resolveGroup(group, "map");
											}}
										>
											Map existing
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												void resolveGroup(group, "create");
											}}
										>
											Create on finalize
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												void resolveGroup(group, "reject");
											}}
										>
											Reject group
										</Button>
									</div>
								</CardHeader>
								<CardContent className="space-y-2">
									{group.items.map((item) => {
										const start = _evidenceStart(item);
										const end = _evidenceEnd(item);
										const hasPlayableEvidence =
											start !== null &&
											end !== null &&
											end >= start &&
											!!audioUrl;
										const itemDraft =
											draftByItemId[item.id] ?? _editableDraft(item);
										return (
											<div
												key={item.id}
												className="rounded-md border p-2 space-y-2"
											>
												<div className="flex items-center justify-between gap-2">
													<div>
														<p className="text-sm font-medium">
															{_itemLabel(item)}
														</p>
														<p className="text-xs text-muted-foreground">
															{item.status}
														</p>
													</div>
													<div className="flex items-center gap-2">
														{hasPlayableEvidence ? (
															<Button
																variant="outline"
																size="sm"
																onClick={() => {
																	if (start !== null) {
																		playAt(start);
																	}
																}}
															>
																<Play className="h-3 w-3 mr-1" />
																Play evidence
															</Button>
														) : (
															<p className="text-xs text-muted-foreground">
																Evidence unavailable
															</p>
														)}
														{item.status === "pending_review" && (
															<>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		void setItemAction(item, "reject");
																	}}
																>
																	Reject
																</Button>
																<Button
																	size="sm"
																	onClick={() => {
																		void setItemAction(item, "accept", {
																			confirmCreateNew: false,
																		});
																	}}
																>
																	<Check className="h-3 w-3 mr-1" />
																	Accept
																</Button>
															</>
														)}
													</div>
												</div>
												{item.status === "pending_review" && (
													<div className="grid grid-cols-2 gap-2">
														<Input
															placeholder="Name"
															value={String(itemDraft.name ?? "")}
															onChange={(event) => {
																setDraftByItemId((prev) => ({
																	...prev,
																	[item.id]: {
																		...itemDraft,
																		name: event.target.value,
																	},
																}));
															}}
														/>
														{item.itemType === "location" ? (
															<>
																<Input
																	placeholder="City"
																	value={String(itemDraft.city ?? "")}
																	onChange={(event) => {
																		setDraftByItemId((prev) => ({
																			...prev,
																			[item.id]: {
																				...itemDraft,
																				city: event.target.value,
																			},
																		}));
																	}}
																/>
																<Input
																	placeholder="State"
																	value={String(itemDraft.state ?? "")}
																	onChange={(event) => {
																		setDraftByItemId((prev) => ({
																			...prev,
																			[item.id]: {
																				...itemDraft,
																				state: event.target.value,
																			},
																		}));
																	}}
																/>
															</>
														) : (
															<Input
																placeholder="Category"
																value={String(itemDraft.category ?? "")}
																onChange={(event) => {
																	setDraftByItemId((prev) => ({
																		...prev,
																		[item.id]: {
																			...itemDraft,
																			category: event.target.value,
																		},
																	}));
																}}
															/>
														)}
														<Button
															className="col-span-2"
															variant="outline"
															onClick={() => {
																void setItemAction(item, "amend", {
																	normalizedData: itemDraft,
																});
															}}
														>
															Save edits
														</Button>
													</div>
												)}
											</div>
										);
									})}
								</CardContent>
							</Card>
						);
					})}
				</TabsContent>
				<TabsContent value="transcript">
					<Card>
						<CardContent className="pt-4">
							<p className="text-sm whitespace-pre-wrap">
								{transcriptText || "Transcript unavailable"}
							</p>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{audioUrl && (
				/* biome-ignore lint/a11y/useMediaCaption: audio transcript shown in transcript tab */
				<audio ref={audioRef} src={audioUrl} controls className="w-full" />
			)}

			<div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
				<p className="text-sm text-muted-foreground">
					{selectedResolvedGroupIds.size} resolved group
					{selectedResolvedGroupIds.size === 1 ? "" : "s"} selected
				</p>
				<Button
					onClick={() => void finalizeSelected()}
					disabled={shouldDisableFinalizeAction({
						groupsCount: groups.length,
						selectedResolvedCount: selectedResolvedGroupIds.size,
						finalizing,
					})}
				>
					{finalizing ? (
						<>
							<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
							Finalizing...
						</>
					) : (
						"Finalize resolved groups"
					)}
				</Button>
			</div>
		</div>
	);
}
