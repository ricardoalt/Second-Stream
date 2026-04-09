"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	Check,
	FileText,
	Loader2,
	MapPin,
	Pencil,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CompanyCombobox } from "@/components/features/shared/company-combobox";
import { LocationCombobox } from "@/components/features/shared/location-combobox";
import {
	DRAFT_FREQUENCY_OPTIONS,
	DRAFT_UNITS_OPTIONS,
} from "@/components/features/streams/draft-field-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	CandidateEditableField,
	CandidateValidationErrors,
} from "@/lib/discovery-confirmation-utils";
import { useCompanyStore } from "@/lib/stores/company-store";
import type { DraftCandidate } from "@/lib/types/discovery";
import { cn } from "@/lib/utils";

interface CompanyMatchCandidate {
	id: string;
	name: string;
}

export function useDraftConfirmationModal(initialOpen = false) {
	const [open, setOpen] = useState(initialOpen);

	const openModal = useCallback(() => setOpen(true), []);
	const closeModal = useCallback(() => setOpen(false), []);

	return {
		open,
		setOpen,
		openModal,
		closeModal,
	};
}

type DraftConfirmationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	candidates: DraftCandidate[];
	editingCandidateId: string | null;
	onEditCandidate: (itemId: string | null) => void;
	onCandidateFieldChange: (
		itemId: string,
		field: CandidateEditableField,
		value: string,
	) => void;
	onConfirmCandidate: (itemId: string) => void;
	onRejectCandidate?: (itemId: string) => void;
	onProcessFinalizeAll: () => void;
	candidateErrors?: Record<string, CandidateValidationErrors>;
	confirmingId?: string | null;
	disableActions?: boolean;
	isBulkConfirming?: boolean;
};

export function isCandidateBusy(params: {
	candidate: DraftCandidate;
	confirmingId: string | null;
	isBulkConfirming: boolean;
}): boolean {
	const { candidate, confirmingId, isBulkConfirming } = params;
	return (
		confirmingId === candidate.itemId ||
		(isBulkConfirming && candidate.status === "pending")
	);
}

export function processFinalizeAllLabel(isBulkConfirming: boolean): string {
	return isBulkConfirming ? "Finishing…" : "Finish Review";
}

export function canRejectCandidates(
	onRejectCandidate?: (itemId: string) => void,
): onRejectCandidate is (itemId: string) => void {
	return typeof onRejectCandidate === "function";
}

export interface CandidateResolutionState {
	missingClient: boolean;
	missingLocation: boolean;
	ambiguousLocation: boolean;
	suggestedLocationLabel: string | null;
	requiresResolution: boolean;
}

export interface CandidateBatchResolutionState {
	resolvedCount: number;
	incompleteCount: number;
	hasMixedResolvedAndIncomplete: boolean;
}

function hasAcceptedCreateNewClient(candidate: DraftCandidate): boolean {
	return (
		candidate.aiSuggestedClientAccepted === true &&
		(candidate.suggestedClientName ?? "").trim().length > 0
	);
}

function hasAcceptedCreateNewLocation(candidate: DraftCandidate): boolean {
	return (
		candidate.aiSuggestedLocationAccepted === true &&
		(candidate.suggestedLocationName ?? "").trim().length > 0 &&
		(candidate.suggestedLocationCity ?? "").trim().length > 0 &&
		(candidate.suggestedLocationState ?? "").trim().length > 0
	);
}

export function resolveCandidateResolutionState(
	candidate: DraftCandidate,
): CandidateResolutionState {
	const clientResolved =
		(candidate.clientId ?? "").trim().length > 0 ||
		hasAcceptedCreateNewClient(candidate);
	const locationResolved =
		(candidate.locationId ?? "").trim().length > 0 ||
		hasAcceptedCreateNewLocation(candidate);
	const missingClient = !clientResolved;
	const missingLocation = !locationResolved;
	const ambiguousLocation =
		missingLocation && candidate.locationResolutionHint === "ambiguous";
	const suggestedLocationLabel =
		missingLocation &&
		(candidate.suggestedLocationName ||
			candidate.locationResolutionHint === "suggested" ||
			candidate.locationResolutionHint === "ambiguous")
			? (candidate.suggestedLocationName ??
				candidate.locationSuggestionLabel ??
				candidate.locationLabel ??
				null)
			: null;

	return {
		missingClient,
		missingLocation,
		ambiguousLocation,
		suggestedLocationLabel,
		requiresResolution: missingClient || missingLocation,
	};
}

export function canResolveLocationForCandidate(
	candidate: DraftCandidate,
): boolean {
	return (
		(candidate.clientId ?? "").trim().length > 0 ||
		hasAcceptedCreateNewClient(candidate)
	);
}

export function resolveConfirmableDrafts(candidates: DraftCandidate[]): {
	confirmableIds: string[];
	blockedIds: string[];
} {
	return candidates.reduce(
		(acc, candidate) => {
			if (resolveCandidateResolutionState(candidate).requiresResolution) {
				acc.blockedIds.push(candidate.itemId);
				return acc;
			}
			acc.confirmableIds.push(candidate.itemId);
			return acc;
		},
		{ confirmableIds: [] as string[], blockedIds: [] as string[] },
	);
}

function normalizeSuggestion(value?: string | null): string {
	return (value ?? "").trim().toLocaleLowerCase();
}

export function applyClientResolutionBySuggestedClient(params: {
	candidates: DraftCandidate[];
	targetItemId: string;
	resolvedClientId: string;
}): DraftCandidate[] {
	const { candidates, targetItemId, resolvedClientId } = params;
	const trimmedResolvedClientId = resolvedClientId.trim();
	if (!trimmedResolvedClientId) {
		return candidates;
	}

	const target = candidates.find(
		(candidate) => candidate.itemId === targetItemId,
	);
	if (!target) {
		return candidates;
	}

	const normalizedSuggestedClient = normalizeSuggestion(
		target.suggestedClientName,
	);

	return candidates.map((candidate) => {
		const isTarget = candidate.itemId === targetItemId;
		const candidateSuggestedClient = normalizeSuggestion(
			candidate.suggestedClientName,
		);
		const shouldAutoApply =
			normalizedSuggestedClient.length > 0 &&
			candidateSuggestedClient === normalizedSuggestedClient &&
			!(candidate.clientId ?? "").trim();

		if (!isTarget && !shouldAutoApply) {
			return candidate;
		}

		const nextLocationId =
			(candidate.locationId ?? "").trim().length > 0 &&
			candidate.clientId === trimmedResolvedClientId
				? candidate.locationId
				: null;

		return {
			...candidate,
			clientId: trimmedResolvedClientId,
			locationId: nextLocationId,
			locationResolutionHint: nextLocationId ? "none" : "missing",
			locationSuggestionLabel: null,
		};
	});
}

export function resolveSuggestedClientMatches(params: {
	candidates: DraftCandidate[];
	companies: CompanyMatchCandidate[];
}): { draftClientMatches: Record<string, string[]> } {
	const { candidates, companies } = params;
	const companiesByNormalizedName = new Map<string, string[]>();

	for (const company of companies) {
		const normalizedName = normalizeSuggestion(company.name);
		if (!normalizedName) {
			continue;
		}
		const existing = companiesByNormalizedName.get(normalizedName);
		if (existing) {
			existing.push(company.id);
			continue;
		}
		companiesByNormalizedName.set(normalizedName, [company.id]);
	}

	const draftClientMatches: Record<string, string[]> = {};
	for (const candidate of candidates) {
		const normalizedSuggestedName = normalizeSuggestion(
			candidate.suggestedClientName,
		);
		if (!normalizedSuggestedName) {
			continue;
		}
		draftClientMatches[candidate.itemId] =
			companiesByNormalizedName.get(normalizedSuggestedName) ?? [];
	}

	return { draftClientMatches };
}

export function resolveAutoPrefillClientResolutions(params: {
	candidates: DraftCandidate[];
	draftClientMatches: Record<string, string[]>;
}): Array<{ itemId: string; clientId: string }> {
	const { candidates, draftClientMatches } = params;
	const actions: Array<{ itemId: string; clientId: string }> = [];

	for (const candidate of candidates) {
		if ((candidate.clientId ?? "").trim().length > 0) {
			continue;
		}
		const matches = draftClientMatches[candidate.itemId] ?? [];
		if (matches.length !== 1) {
			continue;
		}
		actions.push({
			itemId: candidate.itemId,
			clientId: matches[0] ?? "",
		});
	}

	return actions;
}

export function resolveCreateNewAvailability(candidate: DraftCandidate): {
	canCreateClient: boolean;
	canCreateLocation: boolean;
} {
	return {
		canCreateClient: candidate.clientLocked !== true,
		canCreateLocation: canResolveLocationForCandidate(candidate),
	};
}

export function canCreateLocationFromSuggestion(
	candidate: DraftCandidate,
): boolean {
	return (
		(candidate.locationId ?? "").trim().length === 0 &&
		(candidate.suggestedLocationName ?? "").trim().length > 0 &&
		(candidate.suggestedLocationCity ?? "").trim().length > 0 &&
		(candidate.suggestedLocationState ?? "").trim().length > 0
	);
}

export function isAiClientSuggestionAccepted(params: {
	candidate: DraftCandidate;
	draftClientMatches: Record<string, string[]>;
}): boolean {
	const { candidate, draftClientMatches } = params;
	if ((candidate.clientId ?? "").trim().length > 0) {
		return false;
	}

	if ((candidate.suggestedClientName ?? "").trim().length === 0) {
		return false;
	}

	const exactMatchCount = (draftClientMatches[candidate.itemId] ?? []).length;
	if (exactMatchCount === 1) {
		return false;
	}

	return candidate.aiSuggestedClientAccepted === true;
}

export function resolveClientAutoCreateBadgeVisibility(params: {
	candidate: DraftCandidate;
	draftClientMatches: Record<string, string[]>;
}): boolean {
	return isAiClientSuggestionAccepted(params);
}

export function resolveLocationAutoCreateBadgeVisibility(
	candidate: DraftCandidate,
): boolean {
	if ((candidate.locationId ?? "").trim().length > 0) {
		return false;
	}

	return hasAcceptedCreateNewLocation(candidate);
}

function trimToNull(value?: string | null): string | null {
	const normalized = (value ?? "").trim();
	return normalized.length > 0 ? normalized : null;
}

function normalizeToken(value?: string | null): string {
	return (value ?? "").trim().toLocaleLowerCase();
}

function cleanSuggestedLocationName(candidate: DraftCandidate): string | null {
	const rawName = trimToNull(candidate.suggestedLocationName);
	if (!rawName) {
		return null;
	}

	const tokens = rawName
		.split(" - ")
		.map((token) => token.trim())
		.filter((token) => token.length > 0);

	if (tokens.length === 0) {
		return rawName;
	}

	const suggestedClientName = trimToNull(candidate.suggestedClientName);
	const clientHead = suggestedClientName?.split(" - ")[0]?.trim() ?? null;
	const normalizedClientName = normalizeToken(suggestedClientName);
	const normalizedClientHead = normalizeToken(clientHead);

	if (tokens.length > 1) {
		const firstToken = normalizeToken(tokens[0]);
		if (
			firstToken.length > 0 &&
			(firstToken === normalizedClientName ||
				firstToken === normalizedClientHead)
		) {
			tokens.shift();
		}
	}

	const dedupedTokens: string[] = [];
	for (const token of tokens) {
		const normalized = normalizeToken(token);
		if (!normalized) {
			continue;
		}
		if (
			dedupedTokens.some((existing) => normalizeToken(existing) === normalized)
		) {
			continue;
		}
		dedupedTokens.push(token);
	}

	const normalizedCity = normalizeToken(candidate.suggestedLocationCity);
	if (
		normalizedCity.length > 0 &&
		dedupedTokens.length > 1 &&
		normalizeToken(dedupedTokens[dedupedTokens.length - 1]) === normalizedCity
	) {
		dedupedTokens.pop();
	}

	if (dedupedTokens.length === 0) {
		return rawName;
	}

	return dedupedTokens.join(" - ");
}

export function resolveClientSuggestedPrefillValue(
	candidate: DraftCandidate,
): string | null {
	if ((candidate.clientId ?? "").trim().length > 0) {
		return null;
	}

	const suggestedClientName = trimToNull(candidate.suggestedClientName);
	if (!suggestedClientName) {
		return null;
	}

	if (suggestedClientName.includes(" - ")) {
		return null;
	}

	return suggestedClientName;
}

export function resolveLocationSuggestedPrefillValue(
	candidate: DraftCandidate,
): string | null {
	if ((candidate.locationId ?? "").trim().length > 0) {
		return null;
	}

	const name = cleanSuggestedLocationName(candidate);
	if (!name) {
		return trimToNull(candidate.locationSuggestionLabel);
	}

	const city = trimToNull(candidate.suggestedLocationCity);
	if (!city) {
		return name;
	}

	if (normalizeToken(name) === normalizeToken(city)) {
		return name;
	}

	return `${name} - ${city}`;
}

export function resolveActiveReviewCandidates(
	candidates: DraftCandidate[],
): DraftCandidate[] {
	return candidates.filter((candidate) => candidate.status === "pending");
}

export function resolveCandidateBatchResolutionState(
	candidates: DraftCandidate[],
): CandidateBatchResolutionState {
	const incompleteCount = candidates.filter(
		(candidate) =>
			resolveCandidateResolutionState(candidate).requiresResolution,
	).length;
	const resolvedCount = Math.max(candidates.length - incompleteCount, 0);
	return {
		resolvedCount,
		incompleteCount,
		hasMixedResolvedAndIncomplete: resolvedCount > 0 && incompleteCount > 0,
	};
}

const MODAL_SHELL_WIDTH_CLASS =
	"w-[calc(100vw-2rem)] max-w-[1240px] sm:max-w-[1240px]";
const MODAL_CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-[1160px]";
const DESKTOP_TABLE_COLUMNS_CLASS =
	"grid-cols-[minmax(0,2.3fr)_minmax(120px,1fr)_minmax(72px,0.7fr)_minmax(72px,0.6fr)_minmax(96px,0.9fr)_minmax(196px,1.45fr)]";

export function DraftConfirmationModal({
	open,
	onOpenChange,
	candidates,
	editingCandidateId,
	onEditCandidate,
	onCandidateFieldChange,
	onConfirmCandidate,
	onRejectCandidate,
	onProcessFinalizeAll,
	candidateErrors = {},
	confirmingId = null,
	disableActions = false,
	isBulkConfirming = false,
}: DraftConfirmationModalProps) {
	const { companies, loadCompanies } = useCompanyStore();
	const [hasLoadedCompanies, setHasLoadedCompanies] = useState(false);

	useEffect(() => {
		if (hasLoadedCompanies) {
			return;
		}
		void loadCompanies().finally(() => {
			setHasLoadedCompanies(true);
		});
	}, [hasLoadedCompanies, loadCompanies]);

	const activeReviewCandidates = useMemo(
		() => resolveActiveReviewCandidates(candidates),
		[candidates],
	);
	const pendingCount = activeReviewCandidates.length;
	const showRejectAction = canRejectCandidates(onRejectCandidate);
	const confirmedCount = candidates.filter(
		(c) => c.status === "confirmed",
	).length;
	const resolutionSummary = resolveCandidateBatchResolutionState(
		activeReviewCandidates,
	);
	const totalCount = candidates.length;
	const remainingDraftCount = Math.max(totalCount - confirmedCount, 0);
	const remainingDraftLabel =
		remainingDraftCount === 1
			? "1 saved as draft"
			: `${remainingDraftCount} saved as drafts`;
	const suggestedClientMatches = useMemo(
		() =>
			resolveSuggestedClientMatches({
				candidates,
				companies: companies.map((company) => ({
					id: company.id,
					name: company.name,
				})),
			}),
		[candidates, companies],
	);

	useEffect(() => {
		const prefillActions = resolveAutoPrefillClientResolutions({
			candidates,
			draftClientMatches: suggestedClientMatches.draftClientMatches,
		});
		for (const action of prefillActions) {
			onCandidateFieldChange(action.itemId, "clientId", action.clientId);
		}
	}, [
		candidates,
		onCandidateFieldChange,
		suggestedClientMatches.draftClientMatches,
	]);

	// Progress calculation
	const progressPercentage = useMemo(() => {
		if (totalCount === 0) return 0;
		return Math.round((confirmedCount / totalCount) * 100);
	}, [confirmedCount, totalCount]);

	return (
		<TooltipProvider delayDuration={300}>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className={cn(
						MODAL_SHELL_WIDTH_CLASS,
						"gap-0 overflow-hidden rounded-xl border border-border/50 bg-background p-0 shadow-2xl",
					)}
				>
					<DialogTitle className="sr-only">
						Confirm identified streams
					</DialogTitle>
					<DialogDescription className="sr-only">
						Review AI-extracted chemical waste manifests before system
						ingestion.
					</DialogDescription>

					{/* Header */}
					<div className="border-b border-border/50 bg-muted/30 px-6 py-5">
						<div
							className={cn(
								MODAL_CONTENT_WIDTH_CLASS,
								"flex items-start justify-between gap-6",
							)}
						>
							<div className="min-w-0 flex-1">
								<h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
									Confirm Identified Streams
								</h2>
								<p className="mt-0.5 max-w-[42rem] text-sm text-muted-foreground">
									Review AI-extracted chemical waste manifests before system
									ingestion.
								</p>

								{/* Progress Bar */}
								{totalCount > 0 && (
									<div className="mt-3 flex max-w-[24rem] items-center gap-3">
										<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
											<motion.div
												className="h-full rounded-full bg-success"
												initial={{ width: 0 }}
												animate={{ width: `${progressPercentage}%` }}
												transition={{ duration: 0.5, ease: "easeOut" }}
											/>
										</div>
										<span className="w-10 text-right text-xs font-medium tabular-nums text-muted-foreground">
											{progressPercentage}%
										</span>
									</div>
								)}
							</div>
							<div className="flex shrink-0 items-center justify-end pt-1">
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary cursor-help">
											<Sparkles className="size-3.5" />
											{candidates.length} detected
										</span>
									</TooltipTrigger>
									<TooltipContent side="bottom">
										<p>
											AI detected {candidates.length} waste streams to review
										</p>
									</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</div>

					{/* Table Header */}
					<div className="border-b border-border/50 bg-muted/20 px-6">
						<div
							className={cn(
								MODAL_CONTENT_WIDTH_CLASS,
								"grid items-center gap-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground",
								DESKTOP_TABLE_COLUMNS_CLASS,
							)}
						>
							<div>Material Name</div>
							<div className="min-w-0">Source</div>
							<div className="text-right">Volume</div>
							<div className="text-center">Units</div>
							<div className="text-right">Frequency</div>
							<div className="text-right">Actions</div>
						</div>
					</div>

					{/* Table Body */}
					<div className="max-h-[min(70vh,600px)] overflow-auto px-6">
						<div
							className={cn(
								MODAL_CONTENT_WIDTH_CLASS,
								"divide-y divide-border/40",
							)}
						>
							<AnimatePresence mode="popLayout">
								{activeReviewCandidates.map((candidate, index) => {
									const isConfirmed = candidate.status === "confirmed";
									const isPending = candidate.status === "pending";
									const isEditing = editingCandidateId === candidate.itemId;
									const errors = candidateErrors[candidate.itemId];
									const resolutionState =
										resolveCandidateResolutionState(candidate);
									const suggestedClientPrefill =
										resolveClientSuggestedPrefillValue(candidate);
									const suggestedLocationPrefill =
										resolveLocationSuggestedPrefillValue(candidate);
									const canCreateSuggestedLocation =
										canCreateLocationFromSuggestion(candidate);
									const aiSuggestedClientAccepted =
										isAiClientSuggestionAccepted({
											candidate,
											draftClientMatches:
												suggestedClientMatches.draftClientMatches,
										});
									const aiSuggestedClientBadgeVisible =
										resolveClientAutoCreateBadgeVisibility({
											candidate,
											draftClientMatches:
												suggestedClientMatches.draftClientMatches,
										});
									const aiSuggestedLocationBadgeVisible =
										resolveLocationAutoCreateBadgeVisibility(candidate);
									const createNewAvailability =
										resolveCreateNewAvailability(candidate);
									const showSpinner = isCandidateBusy({
										candidate,
										confirmingId,
										isBulkConfirming,
									});

									return (
										<motion.div
											key={candidate.itemId}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, scale: 0.98 }}
											transition={{
												duration: 0.2,
												delay: index * 0.03,
												ease: [0.25, 0.1, 0.25, 1],
											}}
											layout
											className={cn(
												"group relative transition-colors duration-200",
												isConfirmed ? "bg-success/5" : "hover:bg-muted/30",
												isEditing && "bg-primary/[0.02]",
											)}
										>
											{/* Status Indicator Bar */}
											<motion.div
												className={cn(
													"absolute left-0 top-0 bottom-0 w-[3px]",
													isConfirmed && "bg-success",
													isPending && "bg-muted-foreground/30",
													isEditing && "bg-primary",
												)}
												initial={{ scaleY: 0 }}
												animate={{ scaleY: 1 }}
												transition={{ duration: 0.3, delay: index * 0.03 }}
												style={{ originY: 0.5 }}
											/>

											{/* Main Row */}
											<div
												className={cn(
													"grid items-center gap-4 py-4",
													DESKTOP_TABLE_COLUMNS_CLASS,
												)}
											>
												{/* Material Name */}
												<div className="min-w-0 pl-2 pr-2">
													<p
														className={cn(
															"text-sm font-medium text-foreground",
															isConfirmed && "text-success",
														)}
													>
														{candidate.material}
													</p>
													<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
														{resolutionState.requiresResolution ? (
															<Badge
																variant="outline"
																className="h-5 border-amber-300/60 bg-amber-50/60 px-1.5 text-[10px] text-amber-700"
															>
																Needs client/location resolution
															</Badge>
														) : null}
														{resolutionState.ambiguousLocation ? (
															<Badge
																variant="outline"
																className="h-5 border-blue-300/60 bg-blue-50/60 px-1.5 text-[10px] text-blue-700"
															>
																Ambiguous location suggestion
															</Badge>
														) : null}
														{candidate.locationLabel ? (
															<Tooltip>
																<TooltipTrigger asChild>
																	<span className="inline-flex items-center gap-1 cursor-help hover:text-foreground transition-colors">
																		<MapPin className="size-3" />
																		{candidate.locationLabel}
																	</span>
																</TooltipTrigger>
																<TooltipContent side="bottom">
																	<p>Location: {candidate.locationLabel}</p>
																</TooltipContent>
															</Tooltip>
														) : null}
														{resolutionState.suggestedLocationLabel ? (
															<span className="inline-flex items-center gap-1 rounded bg-blue-50/70 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
																AI suggests:{" "}
																{resolutionState.suggestedLocationLabel}
															</span>
														) : null}
														{(candidate.clientId ?? "").trim().length === 0 &&
														candidate.suggestedClientName &&
														(suggestedClientMatches.draftClientMatches[
															candidate.itemId
														]?.length ?? 0) > 0 ? (
															<span className="inline-flex items-center gap-1 rounded bg-blue-50/70 px-1.5 py-0.5 text-[10px] text-blue-700">
																Match candidate found for “
																{candidate.suggestedClientName}”
															</span>
														) : null}
													</div>
												</div>

												{/* Source */}
												<div className="min-w-0">
													<Tooltip>
														<TooltipTrigger asChild>
															<div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground cursor-help transition-colors hover:text-foreground">
																<FileText className="size-3.5 shrink-0" />
																<span className="truncate">
																	{candidate.source}
																</span>
															</div>
														</TooltipTrigger>
														<TooltipContent side="bottom">
															<p>Source file: {candidate.source}</p>
														</TooltipContent>
													</Tooltip>
												</div>

												{/* Volume */}
												<div className="text-right">
													<span className="text-sm tabular-nums text-foreground">
														{candidate.volume ?? "—"}
													</span>
												</div>

												{/* Units */}
												<div className="text-center">
													<span className="text-sm text-muted-foreground">
														{candidate.units ?? "—"}
													</span>
												</div>

												{/* Frequency */}
												<div className="text-right">
													<span className="text-sm text-foreground">
														{candidate.frequency ?? "—"}
													</span>
												</div>

												{/* Actions */}
												<div className="flex items-center justify-end gap-2 whitespace-nowrap">
													{!isConfirmed ? (
														<>
															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			onEditCandidate(
																				isEditing ? null : candidate.itemId,
																			)
																		}
																		disabled={disableActions || showSpinner}
																		className="h-8 px-2.5 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
																	>
																		{isEditing ? (
																			<>
																				<X className="mr-1 size-3.5" />
																				Cancel
																			</>
																		) : (
																			<>
																				<Pencil className="mr-1 size-3.5" />
																				Edit
																			</>
																		)}
																	</Button>
																</TooltipTrigger>
																<TooltipContent side="top">
																	<p>
																		{isEditing
																			? "Cancel editing"
																			: "Edit stream details"}
																	</p>
																</TooltipContent>
															</Tooltip>

															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		size="sm"
																		onClick={() =>
																			onConfirmCandidate(candidate.itemId)
																		}
																		disabled={
																			!isPending ||
																			resolutionState.requiresResolution ||
																			disableActions ||
																			showSpinner
																		}
																		className="h-8 bg-success text-success-foreground px-3 text-xs hover:bg-success/90 transition-all duration-200 hover:scale-105 active:scale-95"
																	>
																		{showSpinner ? (
																			<Loader2 className="size-3.5 animate-spin" />
																		) : (
																			<>
																				<Check className="mr-1 size-3.5" />
																				Confirm
																			</>
																		)}
																	</Button>
																</TooltipTrigger>
																<TooltipContent side="top">
																	<p>Confirm and create waste stream</p>
																</TooltipContent>
															</Tooltip>

															{showRejectAction ? (
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-8 w-8 text-muted-foreground hover:text-destructive transition-all duration-200 hover:scale-110"
																			onClick={() =>
																				onRejectCandidate(candidate.itemId)
																			}
																			disabled={disableActions || showSpinner}
																		>
																			{showSpinner ? (
																				<Loader2 className="size-3.5 animate-spin" />
																			) : (
																				<Trash2 className="size-3.5" />
																			)}
																		</Button>
																	</TooltipTrigger>
																	<TooltipContent side="top">
																		<p>Discard this stream</p>
																	</TooltipContent>
																</Tooltip>
															) : null}
														</>
													) : (
														<Tooltip>
															<TooltipTrigger asChild>
																<motion.span
																	className="inline-flex items-center gap-1.5 text-xs font-medium text-success cursor-help"
																	initial={{ opacity: 0, scale: 0.8 }}
																	animate={{ opacity: 1, scale: 1 }}
																	transition={{
																		type: "spring",
																		stiffness: 300,
																		damping: 20,
																	}}
																>
																	<motion.div
																		initial={{ scale: 0 }}
																		animate={{ scale: 1 }}
																		transition={{
																			type: "spring",
																			stiffness: 400,
																			damping: 15,
																			delay: 0.1,
																		}}
																	>
																		<Check className="size-3.5" />
																	</motion.div>
																	Confirmed
																</motion.span>
															</TooltipTrigger>
															<TooltipContent side="top">
																<p>Stream confirmed and created</p>
															</TooltipContent>
														</Tooltip>
													)}
												</div>
											</div>

											{/* Edit Mode Expansion */}
											<AnimatePresence>
												{isEditing && (
													<motion.div
														initial={{ height: 0, opacity: 0 }}
														animate={{ height: "auto", opacity: 1 }}
														exit={{ height: 0, opacity: 0 }}
														transition={{
															duration: 0.25,
															ease: [0.25, 0.1, 0.25, 1],
														}}
														className="overflow-hidden"
													>
														<div className="border-t border-border/40 bg-muted/20 px-6 py-4">
															<div className="grid gap-4 sm:grid-cols-3">
																<div className="space-y-1.5 sm:col-span-3">
																	<div className="flex items-center gap-2">
																		<label
																			htmlFor={`client-${candidate.itemId}`}
																			className="text-xs font-medium text-muted-foreground"
																		>
																			Client
																		</label>
																		{aiSuggestedClientBadgeVisible ? (
																			<Badge
																				variant="secondary"
																				className="h-5 px-1.5 text-[10px]"
																			>
																				Auto-create
																			</Badge>
																		) : null}
																	</div>
																	<CompanyCombobox
																		value={candidate.clientId ?? ""}
																		suggestedValue={suggestedClientPrefill}
																		isSuggestedAccepted={
																			aiSuggestedClientAccepted
																		}
																		onValueChange={(value) => {
																			onCandidateFieldChange(
																				candidate.itemId,
																				"clientId",
																				value,
																			);
																			if (
																				value !== (candidate.clientId ?? "")
																			) {
																				onCandidateFieldChange(
																					candidate.itemId,
																					"locationId",
																					"",
																				);
																			}
																		}}
																		showCreate={
																			createNewAvailability.canCreateClient
																		}
																		disabled={
																			disableActions ||
																			candidate.clientLocked === true
																		}
																		placeholder="Select client..."
																		className="h-9"
																	/>
																	{suggestedClientPrefill ? (
																		<p className="text-xs text-muted-foreground">
																			AI suggests: {suggestedClientPrefill}
																		</p>
																	) : null}
																	{candidate.clientLocked ? (
																		<p className="text-xs text-muted-foreground">
																			Client is fixed by wizard scope.
																		</p>
																	) : null}
																	{errors?.clientId ? (
																		<motion.p
																			className="text-xs text-destructive"
																			initial={{ opacity: 0, y: -5 }}
																			animate={{ opacity: 1, y: 0 }}
																		>
																			{errors.clientId}
																		</motion.p>
																	) : null}
																</div>

																<div className="space-y-1.5 sm:col-span-3">
																	<div className="flex items-center gap-2">
																		<label
																			htmlFor={`location-${candidate.itemId}`}
																			className="text-xs font-medium text-muted-foreground"
																		>
																			Location
																		</label>
																		{aiSuggestedLocationBadgeVisible ? (
																			<Badge
																				variant="secondary"
																				className="h-5 px-1.5 text-[10px]"
																			>
																				Auto-create
																			</Badge>
																		) : null}
																	</div>
																	<LocationCombobox
																		companyId={candidate.clientId ?? ""}
																		value={candidate.locationId ?? ""}
																		suggestedValue={suggestedLocationPrefill}
																		canCreateFromSuggestion={
																			canCreateSuggestedLocation
																		}
																		isSuggestedAccepted={
																			aiSuggestedLocationBadgeVisible
																		}
																		allowSuggestionWithoutCompany={
																			aiSuggestedClientBadgeVisible
																		}
																		onValueChange={(value) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"locationId",
																				value,
																			)
																		}
																		placeholder="Select location..."
																		className="h-9"
																	/>
																	{suggestedLocationPrefill ? (
																		<p className="text-xs text-muted-foreground">
																			AI suggests: {suggestedLocationPrefill}
																		</p>
																	) : null}
																	{errors?.locationId ? (
																		<motion.p
																			className="text-xs text-destructive"
																			initial={{ opacity: 0, y: -5 }}
																			animate={{ opacity: 1, y: 0 }}
																		>
																			{errors.locationId}
																		</motion.p>
																	) : null}
																	{resolutionState.ambiguousLocation &&
																	resolutionState.suggestedLocationLabel ? (
																		<p className="text-xs text-muted-foreground">
																			AI suggests:{" "}
																			{resolutionState.suggestedLocationLabel}.
																			Confirm the exact location.
																		</p>
																	) : null}
																</div>

																<div className="space-y-1.5 sm:col-span-3">
																	<label
																		htmlFor={`material-${candidate.itemId}`}
																		className="text-xs font-medium text-muted-foreground"
																	>
																		Material
																	</label>
																	<Input
																		id={`material-${candidate.itemId}`}
																		value={candidate.material}
																		onChange={(event) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"material",
																				event.target.value,
																			)
																		}
																		disabled={disableActions}
																		className="h-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
																		placeholder="Enter material name..."
																	/>
																	{errors?.material ? (
																		<motion.p
																			className="text-xs text-destructive"
																			initial={{ opacity: 0, y: -5 }}
																			animate={{ opacity: 1, y: 0 }}
																		>
																			{errors.material}
																		</motion.p>
																	) : null}
																</div>

																<div className="space-y-1.5">
																	<label
																		htmlFor={`volume-${candidate.itemId}`}
																		className="text-xs font-medium text-muted-foreground"
																	>
																		Volume
																	</label>
																	<Input
																		id={`volume-${candidate.itemId}`}
																		value={candidate.volume ?? ""}
																		onChange={(event) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"volume",
																				event.target.value,
																			)
																		}
																		disabled={disableActions}
																		className="h-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
																		placeholder="e.g. 5,000"
																	/>
																	{errors?.volume ? (
																		<motion.p
																			className="text-xs text-destructive"
																			initial={{ opacity: 0, y: -5 }}
																			animate={{ opacity: 1, y: 0 }}
																		>
																			{errors.volume}
																		</motion.p>
																	) : null}
																</div>

																<div className="space-y-1.5">
																	<label
																		htmlFor={`units-${candidate.itemId}`}
																		className="text-xs font-medium text-muted-foreground"
																	>
																		Units
																	</label>
																	<Select
																		value={candidate.units ?? ""}
																		onValueChange={(value) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"units",
																				value,
																			)
																		}
																		disabled={disableActions}
																	>
																		<SelectTrigger
																			id={`units-${candidate.itemId}`}
																			className="h-9 text-sm"
																		>
																			<SelectValue placeholder="Select units" />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectGroup>
																				{DRAFT_UNITS_OPTIONS.map((option) => (
																					<SelectItem
																						key={option}
																						value={option}
																					>
																						{option}
																					</SelectItem>
																				))}
																			</SelectGroup>
																		</SelectContent>
																	</Select>
																</div>

																<div className="space-y-1.5">
																	<label
																		htmlFor={`frequency-${candidate.itemId}`}
																		className="text-xs font-medium text-muted-foreground"
																	>
																		Frequency
																	</label>
																	<Select
																		value={candidate.frequency ?? ""}
																		onValueChange={(value) =>
																			onCandidateFieldChange(
																				candidate.itemId,
																				"frequency",
																				value,
																			)
																		}
																		disabled={disableActions}
																	>
																		<SelectTrigger
																			id={`frequency-${candidate.itemId}`}
																			className="h-9 text-sm"
																		>
																			<SelectValue placeholder="Select frequency" />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectGroup>
																				{DRAFT_FREQUENCY_OPTIONS.map(
																					(option) => (
																						<SelectItem
																							key={option}
																							value={option}
																						>
																							{option}
																						</SelectItem>
																					),
																				)}
																			</SelectGroup>
																		</SelectContent>
																	</Select>
																	{errors?.frequency ? (
																		<motion.p
																			className="text-xs text-destructive"
																			initial={{ opacity: 0, y: -5 }}
																			animate={{ opacity: 1, y: 0 }}
																		>
																			{errors.frequency}
																		</motion.p>
																	) : null}
																</div>
															</div>
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</motion.div>
									);
								})}
								{activeReviewCandidates.length === 0 ? (
									<div className="px-2 py-8 text-center text-sm text-muted-foreground">
										No drafts left in active review.
									</div>
								) : null}
							</AnimatePresence>
						</div>
					</div>

					{/* Footer */}
					<div className="border-t border-border/50 bg-muted/30 px-6 py-4">
						<div
							className={cn(
								MODAL_CONTENT_WIDTH_CLASS,
								"flex items-center justify-between gap-4",
							)}
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground cursor-help">
										<Sparkles className="size-4 shrink-0 text-primary" />
										<span className="truncate">
											{confirmedCount > 0 && pendingCount > 0 ? (
												<>
													<strong className="text-success">
														{confirmedCount}
													</strong>{" "}
													confirmed · <strong>{pendingCount}</strong> left as
													drafts
												</>
											) : resolutionSummary.hasMixedResolvedAndIncomplete ? (
												<>
													<strong className="text-success">
														{resolutionSummary.resolvedCount}
													</strong>{" "}
													resolved ·{" "}
													<strong>{resolutionSummary.incompleteCount}</strong>{" "}
													incomplete
												</>
											) : confirmedCount > 0 ? (
												<>
													<strong className="text-success">
														{confirmedCount}
													</strong>{" "}
													confirmed · ready to finish
												</>
											) : (
												<>
													<strong>{pendingCount}</strong> still in review
												</>
											)}
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent side="top">
									<p>
										{confirmedCount} confirmed stream
										{confirmedCount === 1 ? "" : "s"}
										{remainingDraftCount > 0
											? `, ${remainingDraftLabel}`
											: ", ready to finish review"}
									</p>
								</TooltipContent>
							</Tooltip>

							<div className="flex shrink-0 items-center gap-3">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											onClick={() => onOpenChange(false)}
											disabled={disableActions}
											className="transition-all duration-200 hover:scale-105 active:scale-95"
										>
											Leave Review
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>Choose what to do with the remaining items</p>
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											onClick={onProcessFinalizeAll}
											disabled={disableActions || totalCount === 0}
											className="bg-success text-success-foreground hover:bg-success/90 transition-all duration-200 hover:scale-105 active:scale-95"
										>
											{isBulkConfirming ? (
												<>
													<Loader2 className="mr-1.5 size-4 animate-spin" />
													{processFinalizeAllLabel(true)}
												</>
											) : (
												processFinalizeAllLabel(false)
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>
											{pendingCount > 0
												? `Finish review and save ${pendingCount} remaining stream${pendingCount === 1 ? "" : "s"} as draft${pendingCount === 1 ? "" : "s"}`
												: "Finish review with confirmed streams"}
										</p>
									</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
