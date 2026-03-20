"use client";

import {
	AlertCircle,
	CheckCircle2,
	Clock,
	FileText,
	Loader2,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FileUploader } from "@/components/shared/common/file-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEBOUNCE } from "@/lib/constants/timings";
import {
	useWorkspaceActions,
	useWorkspaceBaseFields,
	useWorkspaceCustomFields,
	useWorkspaceDerived,
	useWorkspaceEvidence,
	useWorkspaceStore,
} from "@/lib/stores/workspace-store";
import type { BaseFieldId, WorkspaceEvidenceItem } from "@/lib/types/workspace";

interface WorkspaceCanvasProps {
	projectId: string;
}

const STATUS_POLL_INTERVAL_MS = 5000;

// ============================================================================
// Save status indicator (reuses pattern from technical-data-sheet.tsx)
// ============================================================================

function SaveStatusBadge({ status }: { status: string }) {
	switch (status) {
		case "saving":
			return (
				<Badge variant="outline" className="text-xs gap-1">
					<Loader2 className="h-3 w-3 animate-spin" />
					Saving...
				</Badge>
			);
		case "saved":
			return (
				<Badge
					variant="outline"
					className="text-xs gap-1 text-green-600 border-green-200"
				>
					<CheckCircle2 className="h-3 w-3" />
					Saved
				</Badge>
			);
		case "error":
			return (
				<Badge variant="destructive" className="text-xs gap-1">
					<AlertCircle className="h-3 w-3" />
					Error saving
				</Badge>
			);
		default:
			return null;
	}
}

// ============================================================================
// Evidence item row
// ============================================================================

function EvidenceItemRow({ item }: { item: WorkspaceEvidenceItem }) {
	const statusIcon = (() => {
		switch (item.processingStatus) {
			case "completed":
				return (
					<CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
				);
			case "processing":
			case "queued":
				return (
					<Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
				);
			case "failed":
				return (
					<AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
				);
		}
	})();

	return (
		<div className="flex items-start gap-3 py-2 border-b last:border-b-0">
			{statusIcon}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{item.filename}</p>
				<p className="text-xs text-muted-foreground capitalize">
					{item.category} &bull; {item.processingStatus}
				</p>
				{item.summary && (
					<p className="text-xs text-muted-foreground mt-1">{item.summary}</p>
				)}
				{item.processingError && (
					<p className="text-xs text-destructive mt-1">
						{item.processingError}
					</p>
				)}
			</div>
		</div>
	);
}

// ============================================================================
// Main Canvas
// ============================================================================

export function WorkspaceCanvas({ projectId }: WorkspaceCanvasProps) {
	const baseFields = useWorkspaceBaseFields();
	const customFields = useWorkspaceCustomFields();
	const evidenceItems = useWorkspaceEvidence();
	const derived = useWorkspaceDerived();
	const contextNote = useWorkspaceStore((s) => s.contextNote);
	const baseFieldsSaveStatus = useWorkspaceStore((s) => s.baseFieldsSaveStatus);
	const contextNoteSaveStatus = useWorkspaceStore(
		(s) => s.contextNoteSaveStatus,
	);
	const customFieldsSaveStatus = useWorkspaceStore(
		(s) => s.customFieldsSaveStatus,
	);
	const baseFieldsDirty = useWorkspaceStore((s) => s.baseFieldsDirty);
	const contextNoteDirty = useWorkspaceStore((s) => s.contextNoteDirty);
	const customFieldsDirty = useWorkspaceStore((s) => s.customFieldsDirty);
	const refreshing = useWorkspaceStore((s) => s.refreshing);
	const proposalBatch = useWorkspaceStore((s) => s.proposalBatch);
	const uploadSessionFileIds = useWorkspaceStore((s) => s.uploadSessionFileIds);
	const autoAnalysisGuard = useWorkspaceStore((s) => s.autoAnalysisGuard);
	const newReadyEvidenceSinceAnalysis = useWorkspaceStore(
		(s) => s.newReadyEvidenceSinceAnalysis,
	);
	const newReadyEvidenceCountSinceAnalysis = useWorkspaceStore(
		(s) => s.newReadyEvidenceCountSinceAnalysis,
	);
	const backgroundHydrateError = useWorkspaceStore(
		(s) => s.backgroundHydrateError,
	);
	const {
		updateBaseField,
		saveBaseFields,
		updateContextNote,
		saveContextNote,
		updateCustomField,
		saveCustomFields,
		runAnalysis,
		reopenProposalBatchModal,
		hydrate,
		registerUploadedFile,
		clearUploadSession,
		clearUploadSessionSubset,
		clearBackgroundHydrateError,
	} = useWorkspaceActions();

	// Debounced base fields save
	const baseFieldsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleBaseFieldChange = useCallback(
		(fieldId: BaseFieldId, value: string) => {
			updateBaseField(fieldId, value);
			if (baseFieldsTimerRef.current) {
				clearTimeout(baseFieldsTimerRef.current);
			}
			baseFieldsTimerRef.current = setTimeout(() => {
				saveBaseFields(projectId);
			}, DEBOUNCE.AUTO_SAVE);
		},
		[updateBaseField, saveBaseFields, projectId],
	);

	// Debounced context note save
	const contextNoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const customFieldsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const handleContextNoteChange = useCallback(
		(text: string) => {
			updateContextNote(text);
			if (contextNoteTimerRef.current) {
				clearTimeout(contextNoteTimerRef.current);
			}
			contextNoteTimerRef.current = setTimeout(() => {
				saveContextNote(projectId);
			}, DEBOUNCE.AUTO_SAVE);
		},
		[updateContextNote, saveContextNote, projectId],
	);

	// Cleanup timers on unmount
	useEffect(() => {
		return () => {
			if (baseFieldsTimerRef.current) clearTimeout(baseFieldsTimerRef.current);
			if (contextNoteTimerRef.current)
				clearTimeout(contextNoteTimerRef.current);
			if (customFieldsTimerRef.current)
				clearTimeout(customFieldsTimerRef.current);
		};
	}, []);

	const handleCustomFieldLabelChange = useCallback(
		(fieldId: string, value: string) => {
			updateCustomField(fieldId, { label: value });
			if (customFieldsTimerRef.current) {
				clearTimeout(customFieldsTimerRef.current);
			}
			customFieldsTimerRef.current = setTimeout(() => {
				saveCustomFields(projectId);
			}, DEBOUNCE.AUTO_SAVE);
		},
		[projectId, saveCustomFields, updateCustomField],
	);

	const handleCustomFieldAnswerChange = useCallback(
		(fieldId: string, value: string) => {
			updateCustomField(fieldId, { answer: value });
			if (customFieldsTimerRef.current) {
				clearTimeout(customFieldsTimerRef.current);
			}
			customFieldsTimerRef.current = setTimeout(() => {
				saveCustomFields(projectId);
			}, DEBOUNCE.AUTO_SAVE);
		},
		[projectId, saveCustomFields, updateCustomField],
	);

	const completedEvidenceCount = evidenceItems.filter(
		(item) => item.processingStatus === "completed",
	).length;
	const readyEvidenceCount = completedEvidenceCount;
	const processingEvidenceCount = evidenceItems.filter(
		(item) =>
			item.processingStatus === "queued" ||
			item.processingStatus === "processing",
	).length;
	const totalEvidenceCount = evidenceItems.length;
	const hasAnalyzed = derived.lastRefreshedAt !== null;
	const hasNewReadyFiles = hasAnalyzed && newReadyEvidenceSinceAnalysis;
	const newReadyEvidenceCount = hasNewReadyFiles
		? newReadyEvidenceCountSinceAnalysis
		: 0;
	const analysisLabel = (() => {
		if (proposalBatch !== null) {
			return "Review AI updates";
		}
		if (hasNewReadyFiles) {
			return `Re-analyze with ${newReadyEvidenceCount} new file${newReadyEvidenceCount === 1 ? "" : "s"}`;
		}
		return "Analyze ready files";
	})();
	const evidenceReadinessMessage = (() => {
		if (totalEvidenceCount === 0) {
			return "Upload files to start building this waste stream";
		}
		if (processingEvidenceCount > 0 && readyEvidenceCount === 0) {
			const noun = processingEvidenceCount === 1 ? "file" : "files";
			return `${processingEvidenceCount} ${noun} processing`;
		}
		if (!hasAnalyzed) {
			const noun = readyEvidenceCount === 1 ? "file" : "files";
			return `${readyEvidenceCount} ${noun} ready for analysis`;
		}
		if (hasNewReadyFiles) {
			const noun = newReadyEvidenceCount === 1 ? "file" : "files";
			return `${newReadyEvidenceCount} new ${noun} ready for analysis`;
		}
		return "Analysis up to date";
	})();
	const passiveAnalysisHint = (() => {
		if (processingEvidenceCount > 0 && readyEvidenceCount > 0) {
			return "Some files are still processing. Analyze ready files now, then re-run when remaining files complete.";
		}
		if (processingEvidenceCount > 0) {
			return "Files are processing. Analysis unlocks as soon as files become ready.";
		}
		if (hasNewReadyFiles) {
			return "New evidence available since last analysis.";
		}
		if (proposalBatch !== null) {
			return "AI updates are ready for review.";
		}
		if (hasAnalyzed) {
			return "No new ready files since last analysis.";
		}
		return "Upload evidence, then analyze ready files in one batch.";
	})();

	const handleRunAnalysis = useCallback(async () => {
		if (proposalBatch !== null) {
			reopenProposalBatchModal();
			return;
		}
		if (readyEvidenceCount === 0) return;
		try {
			await runAnalysis(projectId);
			if (useWorkspaceStore.getState().proposalBatch === null) {
				toast.info(
					"Analysis complete. No new fields were proposed from the current evidence.",
				);
			}
		} catch {
			toast.error("Failed to run analysis");
		}
	}, [
		projectId,
		proposalBatch,
		readyEvidenceCount,
		reopenProposalBatchModal,
		runAnalysis,
	]);

	// Mirror dirty state into a ref so the interval callback can read the latest
	// value without needing to be recreated on every keystroke.
	const isDirtyRef = useRef(false);
	useEffect(() => {
		isDirtyRef.current =
			baseFieldsDirty || contextNoteDirty || customFieldsDirty;
	}, [baseFieldsDirty, contextNoteDirty, customFieldsDirty]);

	// Pending hydrate — set when an upload completes while dirty.
	// Runs once dirty clears so the new evidence item becomes visible.
	const pendingHydrateRef = useRef(false);
	useEffect(() => {
		const nowDirty = baseFieldsDirty || contextNoteDirty || customFieldsDirty;
		if (!nowDirty && pendingHydrateRef.current) {
			pendingHydrateRef.current = false;
			hydrate(projectId);
		}
	}, [
		baseFieldsDirty,
		contextNoteDirty,
		customFieldsDirty,
		hydrate,
		projectId,
	]);

	// Poll for processing evidence items — skip hydrate while local edits are dirty
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	useEffect(() => {
		const hasProcessing = evidenceItems.some(
			(item) =>
				item.processingStatus === "queued" ||
				item.processingStatus === "processing",
		);

		if (hasProcessing && !pollRef.current) {
			pollRef.current = setInterval(() => {
				if (!isDirtyRef.current) {
					hydrate(projectId);
				}
			}, STATUS_POLL_INTERVAL_MS);
		}

		if (!hasProcessing && pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}

		return () => {
			if (pollRef.current) {
				clearInterval(pollRef.current);
				pollRef.current = null;
			}
		};
	}, [evidenceItems, hydrate, projectId]);

	// Auto-analysis: when all session files are terminal, run analysis automatically
	useEffect(() => {
		if (autoAnalysisGuard !== "waiting" || uploadSessionFileIds.length === 0) {
			return;
		}
		if (refreshing) return;
		if (proposalBatch !== null) {
			// Batch pending — keep session queued, re-evaluate after confirm/dismiss
			return;
		}

		const isDirty = baseFieldsDirty || contextNoteDirty || customFieldsDirty;

		// Match session file IDs against hydrated evidence items
		const sessionItems = evidenceItems.filter((item) =>
			uploadSessionFileIds.includes(item.id),
		);

		// Not all files visible in evidence list yet — wait for next hydrate
		if (sessionItems.length < uploadSessionFileIds.length) return;

		// Not all terminal yet — wait for next hydrate
		const allTerminal = sessionItems.every(
			(item) =>
				item.processingStatus === "completed" ||
				item.processingStatus === "failed",
		);
		if (!allTerminal) return;

		// Dirty workspace — wait until save completes and dirty clears
		if (isDirty) return;

		const completedItems = sessionItems.filter(
			(item) => item.processingStatus === "completed",
		);

		if (completedItems.length === 0) {
			// All files failed to process
			toast.error("Uploaded files could not be processed");
			clearUploadSession();
			return;
		}

		// At least one file completed — run analysis.
		// Snapshot session now; files uploaded during the async call are preserved.
		const sessionIdsAtAnalysisStart = [...uploadSessionFileIds];
		// Mark guard as "ran" before the async call to prevent re-entry.
		useWorkspaceStore.setState({ autoAnalysisGuard: "ran" });

		runAnalysis(projectId)
			.then(() => {
				if (useWorkspaceStore.getState().proposalBatch === null) {
					toast.info(
						"Analysis complete. No new fields were proposed from the current evidence.",
					);
				}
				clearUploadSessionSubset(sessionIdsAtAnalysisStart);
			})
			.catch(() => {
				toast.error("Auto-analysis failed");
				// Leave session IDs queued and guard at "ran" — prevents re-entry storm.
				// Next upload (registerUploadedFile) or manual analyze re-arms the cycle.
			});
	}, [
		autoAnalysisGuard,
		uploadSessionFileIds,
		evidenceItems,
		refreshing,
		proposalBatch,
		baseFieldsDirty,
		contextNoteDirty,
		customFieldsDirty,
		projectId,
		runAnalysis,
		clearUploadSession,
		clearUploadSessionSubset,
	]);

	// Surface non-blocking background hydrate errors (e.g. retry budget exhausted)
	useEffect(() => {
		if (!backgroundHydrateError) return;
		toast.warning(backgroundHydrateError);
		clearBackgroundHydrateError();
	}, [backgroundHydrateError, clearBackgroundHydrateError]);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
			{/* Left column: unified fields */}
			<div className="lg:col-span-3 space-y-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
						<CardTitle className="text-base">Fields</CardTitle>
						<SaveStatusBadge status={baseFieldsSaveStatus} />
					</CardHeader>
					<CardContent className="space-y-5">
						{(Array.isArray(baseFields) ? baseFields : []).map((field) => (
							<div key={field.fieldId} className="space-y-1.5">
								<div className="flex items-center gap-2">
									<Label htmlFor={`bf-${field.fieldId}`} className="text-sm">
										{field.label}
									</Label>
									<Badge variant="outline" className="text-[10px]">
										Core
									</Badge>
									{field.required && (
										<span className="text-destructive ml-0.5">*</span>
									)}
								</div>
								<Input
									id={`bf-${field.fieldId}`}
									value={field.value}
									onChange={(e) =>
										handleBaseFieldChange(field.fieldId, e.target.value)
									}
									placeholder={`Enter ${field.label.toLowerCase()}`}
								/>
							</div>
						))}

						{customFields.length > 0 && (
							<div className="pt-2 border-t space-y-4">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium text-muted-foreground">
										AI-added fields
									</p>
									<SaveStatusBadge status={customFieldsSaveStatus} />
								</div>
								{customFields.map((field) => (
									<div key={field.id} className="border rounded-lg p-3">
										<div className="space-y-1.5">
											<div className="flex items-center gap-2">
												<Label
													htmlFor={`cf-label-${field.id}`}
													className="text-sm"
												>
													Field label
												</Label>
												<Badge variant="secondary" className="text-[10px]">
													AI-added
												</Badge>
											</div>
											<Input
												id={`cf-label-${field.id}`}
												value={field.label}
												onChange={(e) =>
													handleCustomFieldLabelChange(field.id, e.target.value)
												}
												placeholder="Field label"
											/>
										</div>
										<div className="space-y-1.5 mt-3">
											<Label
												htmlFor={`cf-answer-${field.id}`}
												className="text-sm"
											>
												Answer
											</Label>
											<Textarea
												id={`cf-answer-${field.id}`}
												value={field.answer}
												onChange={(e) =>
													handleCustomFieldAnswerChange(
														field.id,
														e.target.value,
													)
												}
												placeholder="Field answer"
												className="min-h-[80px] resize-y"
											/>
										</div>
										<div className="flex items-center justify-between mt-2">
											<span className="text-xs text-muted-foreground">
												AI-confirmed
											</span>
											{field.confidence !== null && (
												<Badge variant="outline" className="text-xs">
													{field.confidence}%
												</Badge>
											)}
										</div>
										{(field.evidenceRefs ?? []).length > 0 && (
											<div className="mt-2 flex flex-wrap gap-1">
												{(field.evidenceRefs ?? []).map((ref) => (
													<Badge
														key={ref.fileId}
														variant="outline"
														className="text-xs gap-1"
													>
														<FileText className="h-3 w-3" />
														{ref.filename}
														{ref.page && ` p.${ref.page}`}
													</Badge>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Right column: evidence upload, evidence list, context note */}
			<div className="lg:col-span-2 space-y-6">
				{/* Evidence Upload */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Upload Evidence</CardTitle>
					</CardHeader>
					<CardContent>
						<FileUploader
							projectId={projectId}
							onUploadComplete={(fileId) => {
								registerUploadedFile(fileId);
								if (isDirtyRef.current) {
									pendingHydrateRef.current = true;
								} else {
									hydrate(projectId);
								}
							}}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Analysis</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">
							{evidenceReadinessMessage}
						</p>
						<p className="text-xs text-muted-foreground">
							{passiveAnalysisHint}
						</p>
						<Button
							variant="outline"
							onClick={handleRunAnalysis}
							disabled={
								refreshing ||
								(proposalBatch === null && readyEvidenceCount === 0)
							}
							className="w-full"
						>
							{refreshing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Analyzing...
								</>
							) : (
								analysisLabel
							)}
						</Button>
					</CardContent>
				</Card>

				{/* Evidence List */}
				{evidenceItems.length > 0 && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center justify-between">
								<span>Evidence ({evidenceItems.length})</span>
								{evidenceItems.some(
									(i) =>
										i.processingStatus === "queued" ||
										i.processingStatus === "processing",
								) && (
									<Badge variant="outline" className="text-xs gap-1">
										<Clock className="h-3 w-3" />
										Processing...
									</Badge>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="divide-y">
								{evidenceItems.map((item) => (
									<EvidenceItemRow key={item.id} item={item} />
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Context Note */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
						<CardTitle className="text-base">Context Note</CardTitle>
						<SaveStatusBadge status={contextNoteSaveStatus} />
					</CardHeader>
					<CardContent>
						<Textarea
							value={contextNote}
							onChange={(e) => handleContextNoteChange(e.target.value)}
							placeholder="Add notes about this waste stream for context..."
							className="min-h-[120px] resize-y"
							aria-label="Context note"
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
