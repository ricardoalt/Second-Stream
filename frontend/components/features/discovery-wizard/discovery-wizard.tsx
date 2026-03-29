"use client";

import {
	AlertCircle,
	CheckCircle,
	CircleCheck,
	FileSpreadsheet,
	FileText,
	Image,
	Loader2,
	MapPin,
	Mic,
	Package,
	Plus,
	Trash2,
	Waves,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CreateCompanyDialog } from "@/components/features/companies/create-company-dialog";
import { DraftConfirmationModal } from "@/components/features/discovery/draft-confirmation-modal";
import { CreateLocationDialog } from "@/components/features/locations/create-location-dialog";
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
import { Button } from "@/components/ui/button";
import { CompanyCombobox } from "@/components/ui/company-combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import { fetchCandidates } from "@/lib/api/dashboard";
import { discoverySessionsAPI } from "@/lib/api/discovery-sessions";
import { projectsAPI } from "@/lib/api/projects";
import {
	buildCandidateReviewNotes,
	type CandidateEditableField,
	type CandidateValidationErrors,
	toDiscoveryNormalizedData,
	validateCandidateForConfirmation,
} from "@/lib/discovery-confirmation-utils";
import { routes } from "@/lib/routes";
import { useLocationStore } from "@/lib/stores/location-store";
import type { DraftItemRow } from "@/lib/types/dashboard";
import type {
	DiscoverySessionResult,
	DiscoverySource,
	DraftCandidate,
} from "@/lib/types/discovery";
import { cn } from "@/lib/utils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;
const MIN_DISCOVERY_TEXT_LENGTH = 20;

const ACCEPTED_FILE_TYPES =
	".pdf,.csv,.xlsx,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp";
const ACCEPTED_AUDIO_TYPES = ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4";
const ACCEPTED_FILE_EXTENSIONS = new Set([
	".pdf",
	".csv",
	".xlsx",
	".doc",
	".docx",
	".txt",
	".png",
	".jpg",
	".jpeg",
	".webp",
]);
const ACCEPTED_FILE_MIME_TYPES = new Set([
	"application/pdf",
	"text/csv",
	"application/csv",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"text/plain",
	"image/png",
	"image/jpeg",
	"image/webp",
]);
const ACCEPTED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"]);
const ACCEPTED_AUDIO_MIME_TYPES = new Set([
	"audio/mpeg",
	"audio/mp3",
	"audio/wav",
	"audio/x-wav",
	"audio/wave",
	"audio/mp4",
	"audio/x-m4a",
	"audio/m4a",
]);

const TERMINAL_STATUSES = new Set([
	"review_ready",
	"partial_failure",
	"failed",
]);

const PROCESSING_MESSAGES = [
	"Analyzing your inputs...",
	"Extracting waste stream data...",
	"Identifying locations...",
	"Matching contacts...",
	"Building draft proposals...",
];

const VOICE_WAVE_BARS = [
	{ id: "bar-1", height: 3 },
	{ id: "bar-2", height: 5 },
	{ id: "bar-3", height: 2 },
	{ id: "bar-4", height: 6 },
	{ id: "bar-5", height: 4 },
	{ id: "bar-6", height: 3 },
	{ id: "bar-7", height: 5 },
] as const;

const MESSAGE_CYCLE_MS = 3000;
const COUNTER_DURATION_MS = 800;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type WizardPhase =
	| "idle"
	| "submitting"
	| "processing"
	| "no-results"
	| "review"
	| "confirming"
	| "complete"
	| "error";

interface ReviewSummary {
	confirmed: number;
	skipped: number;
	total: number;
}

type CandidateModalInstruction =
	| "open-review"
	| "warn-unresolved-drafts"
	| "close-complete";

type DecideDiscoveryDraftFn = typeof bulkImportAPI.decideDiscoveryDraft;

interface FinalizeAllResult {
	updatedCandidates: DraftCandidate[];
	validationById: Record<string, CandidateValidationErrors>;
	confirmedIds: string[];
}

interface DiscoveryWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultCompanyId?: string;
	defaultText?: string;
}

interface ConfirmTerminalSessionArgs {
	sessionId: string;
	terminalSession: DiscoverySessionResult;
	getSession: (sessionId: string) => Promise<DiscoverySessionResult>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function fileIcon(name: string) {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (["xlsx", "xls", "csv"].includes(ext)) return FileSpreadsheet;
	if (["png", "jpg", "jpeg", "webp"].includes(ext)) return Image;
	return FileText;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(name: string): string {
	const lastDot = name.lastIndexOf(".");
	if (lastDot < 0) return "";
	return name.slice(lastDot).toLowerCase();
}

function isSupportedDocumentFile(file: File): boolean {
	const extension = fileExtension(file.name);
	if (!ACCEPTED_FILE_EXTENSIONS.has(extension)) {
		return false;
	}
	if (!file.type) {
		return true;
	}
	return ACCEPTED_FILE_MIME_TYPES.has(file.type.toLowerCase());
}

function isAudioCandidate(file: File): boolean {
	const extension = fileExtension(file.name);
	if (ACCEPTED_AUDIO_EXTENSIONS.has(extension)) {
		return true;
	}
	return file.type.toLowerCase().startsWith("audio/");
}

function isSupportedAudioFile(file: File): boolean {
	const extension = fileExtension(file.name);
	if (!ACCEPTED_AUDIO_EXTENSIONS.has(extension)) {
		return false;
	}
	if (!file.type) {
		return true;
	}
	return ACCEPTED_AUDIO_MIME_TYPES.has(file.type.toLowerCase());
}

export async function confirmTerminalDiscoverySnapshot({
	sessionId,
	terminalSession,
	getSession,
}: ConfirmTerminalSessionArgs): Promise<DiscoverySessionResult> {
	try {
		const confirmedSession = await getSession(sessionId);
		if (TERMINAL_STATUSES.has(confirmedSession.status)) {
			return confirmedSession;
		}
	} catch {
		return terminalSession;
	}

	return terminalSession;
}

export function mapCandidateRows(
	rows: DraftItemRow[],
	defaultClientId: string | null,
	defaultLocationId: string | null,
): DraftCandidate[] {
	return rows.map((row) => {
		const parsedVolume = parseVolumeSummary(row.volumeSummary);
		const targetLocationId =
			row.target?.entrypointType === "location"
				? row.target.entrypointId
				: null;

		return {
			itemId: row.itemId,
			runId: row.runId,
			clientId: row.companyId ?? defaultClientId,
			locationId: targetLocationId ?? defaultLocationId,
			material: row.streamName,
			volume: row.volumeSummary,
			frequency: parsedVolume.frequency,
			units: parsedVolume.units,
			locationLabel: row.locationLabel,
			source: row.sourceFilename ?? sourceTypeLabelFromDraft(row.sourceType),
			confidence: row.confidence,
			status: "pending",
		};
	});
}

export function canStartDiscovery(params: {
	companyId: string;
	locationId: string;
	filesCount: number;
	hasAudio: boolean;
	hasValidTextSource: boolean;
}): boolean {
	const { companyId, locationId, filesCount, hasAudio, hasValidTextSource } =
		params;
	return (
		companyId !== "" &&
		locationId !== "" &&
		(filesCount > 0 || hasAudio || hasValidTextSource)
	);
}

export function resolveLocationIdOnCompanyChange(params: {
	previousCompanyId: string;
	nextCompanyId: string;
	currentLocationId: string;
}): string {
	const { previousCompanyId, nextCompanyId, currentLocationId } = params;
	if (previousCompanyId !== nextCompanyId) {
		return "";
	}
	return currentLocationId;
}

export function canSaveQuickEntry(params: {
	clientId: string;
	locationId: string;
	material: string;
	volume: string;
	units: string;
	frequency: string;
	isSaving: boolean;
}): boolean {
	const { clientId, locationId, material, volume, units, frequency, isSaving } =
		params;
	return (
		clientId.trim().length > 0 &&
		locationId.trim().length > 0 &&
		material.trim().length > 0 &&
		volume.trim().length > 0 &&
		units.trim().length > 0 &&
		frequency.trim().length > 0 &&
		!isSaving
	);
}

export function resolveLocationResolution(params: {
	candidateLocationId: string | null;
	defaultLocationId?: string | undefined;
}): { mode: "existing"; locationId: string } | undefined {
	const { candidateLocationId, defaultLocationId } = params;
	const resolvedLocationId = candidateLocationId ?? defaultLocationId ?? null;
	if (!resolvedLocationId) {
		return undefined;
	}

	return {
		mode: "existing",
		locationId: resolvedLocationId,
	};
}

export function resolveDiscoverySessionCompanyScope(params: {
	companyId: string;
	locationId: string;
}): string {
	const { companyId } = params;
	return companyId;
}

function parseVolumeSummary(volumeSummary: string | null): {
	units: string | null;
	frequency: string | null;
} {
	if (!volumeSummary) {
		return { units: null, frequency: null };
	}

	const normalized = volumeSummary.trim();
	if (normalized.length === 0) {
		return { units: null, frequency: null };
	}

	const [unitsRaw, frequencyRaw] = normalized.split("/");
	const units = unitsRaw?.replace(/^[\d.,\s-]+/, "").trim() || null;
	const frequency = frequencyRaw?.trim() || null;

	return { units, frequency };
}

function sourceTypeLabelFromDraft(
	sourceType: DraftItemRow["sourceType"],
): string {
	if (sourceType === "voice_interview") {
		return "Voice interview";
	}
	return "Bulk import";
}

function reviewCounts(candidates: DraftCandidate[]): ReviewSummary {
	const confirmed = candidates.filter(
		(item) => item.status === "confirmed",
	).length;
	const skipped = candidates.filter((item) => item.status === "skipped").length;
	return {
		confirmed,
		skipped,
		total: candidates.length,
	};
}

export async function confirmCandidateDecision(params: {
	candidate: DraftCandidate;
	decideDiscoveryDraft: DecideDiscoveryDraftFn;
	defaultLocationId?: string;
}): Promise<CandidateValidationErrors> {
	const { candidate, decideDiscoveryDraft, defaultLocationId } = params;
	const validationErrors = validateCandidateForConfirmation(candidate);
	if (Object.keys(validationErrors).length > 0) {
		return validationErrors;
	}
	const decisionPayload: Parameters<DecideDiscoveryDraftFn>[1] = {
		action: "confirm",
		normalizedData: toDiscoveryNormalizedData(candidate),
		reviewNotes: buildCandidateReviewNotes(candidate),
	};
	const locationResolution = resolveLocationResolution({
		candidateLocationId: candidate.locationId,
		defaultLocationId,
	});
	if (locationResolution) {
		decisionPayload.locationResolution = locationResolution;
	}

	await decideDiscoveryDraft(candidate.itemId, decisionPayload);

	return {};
}

export async function processFinalizeAllCandidates(params: {
	candidates: DraftCandidate[];
	decideDiscoveryDraft: DecideDiscoveryDraftFn;
	defaultLocationId?: string;
}): Promise<FinalizeAllResult> {
	const { candidates, decideDiscoveryDraft, defaultLocationId } = params;
	const pendingCandidates = candidates.filter(
		(candidate) => candidate.status === "pending",
	);
	const validationById: Record<string, CandidateValidationErrors> = {};
	const validPending = pendingCandidates.filter((candidate) => {
		const errors = validateCandidateForConfirmation(candidate);
		if (Object.keys(errors).length > 0) {
			validationById[candidate.itemId] = errors;
			return false;
		}
		return true;
	});

	const confirmedIds: string[] = [];

	await Promise.all(
		validPending.map(async (candidate) => {
			const decisionPayload: Parameters<DecideDiscoveryDraftFn>[1] = {
				action: "confirm",
				normalizedData: toDiscoveryNormalizedData(candidate),
				reviewNotes: buildCandidateReviewNotes(candidate),
			};
			const locationResolution = resolveLocationResolution({
				candidateLocationId: candidate.locationId,
				defaultLocationId,
			});
			if (locationResolution) {
				decisionPayload.locationResolution = locationResolution;
			}
			await decideDiscoveryDraft(candidate.itemId, decisionPayload);
			confirmedIds.push(candidate.itemId);
		}),
	);

	const confirmedSet = new Set(confirmedIds);
	const updatedCandidates = candidates.map((candidate) => {
		if (confirmedSet.has(candidate.itemId)) {
			return { ...candidate, status: "confirmed" as const };
		}
		if (candidate.status === "pending") {
			return { ...candidate, status: "skipped" as const };
		}
		return candidate;
	});

	return {
		updatedCandidates,
		validationById,
		confirmedIds,
	};
}

export function shouldRouteToNoResults(params: {
	draftsNeedingConfirmation: number;
	mappedCandidatesCount: number;
}): boolean {
	const { draftsNeedingConfirmation, mappedCandidatesCount } = params;
	if (draftsNeedingConfirmation <= 0) {
		return true;
	}
	return mappedCandidatesCount <= 0;
}

export function resolveDiscoveryReviewStep(params: {
	draftsNeedingConfirmation: number;
	mappedCandidatesCount: number;
}): {
	phase: "review" | "no-results";
	openCandidateModal: boolean;
} {
	if (shouldRouteToNoResults(params)) {
		return {
			phase: "no-results",
			openCandidateModal: false,
		};
	}

	return {
		phase: "review",
		openCandidateModal: true,
	};
}

export function resolveCandidateModalInstruction(params: {
	nextOpen: boolean;
	pendingCandidatesCount: number;
}): CandidateModalInstruction {
	const { nextOpen, pendingCandidatesCount } = params;
	if (nextOpen) {
		return "open-review";
	}

	if (pendingCandidatesCount > 0) {
		return "warn-unresolved-drafts";
	}

	return "close-complete";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HOOKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function useAnimatedCounter(target: number, duration = COUNTER_DURATION_MS) {
	const [value, setValue] = useState(0);
	const prevTarget = useRef(0);

	useEffect(
		function animateToTarget() {
			if (target === prevTarget.current) return;
			prevTarget.current = target;

			const start = performance.now();
			let frameId: number;

			function tick(now: number) {
				const elapsed = now - start;
				const progress = Math.min(elapsed / duration, 1);
				// ease-out cubic
				const eased = 1 - (1 - progress) ** 3;
				setValue(Math.round(eased * target));

				if (progress < 1) {
					frameId = requestAnimationFrame(tick);
				}
			}

			frameId = requestAnimationFrame(tick);
			return () => cancelAnimationFrame(frameId);
		},
		[target, duration],
	);

	return value;
}

function useRotatingMessage(messages: string[], intervalMs: number) {
	const [index, setIndex] = useState(0);

	useEffect(
		function cycleMessages() {
			const id = setInterval(() => {
				setIndex((prev) => (prev + 1) % messages.length);
			}, intervalMs);
			return () => clearInterval(id);
		},
		[messages.length, intervalMs],
	);

	return { message: messages[index] ?? messages[0], index };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function DiscoveryWizard({
	open,
	onOpenChange,
	defaultCompanyId,
	defaultText,
}: DiscoveryWizardProps): ReactElement {
	// ── State ──
	const [phase, setPhase] = useState<WizardPhase>("idle");
	const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
	const [locationId, setLocationId] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const [text, setText] = useState("");
	const [_result, setResult] = useState<DiscoverySessionResult | null>(null);
	const [candidates, setCandidates] = useState<DraftCandidate[]>([]);
	const [candidateModalOpen, setCandidateModalOpen] = useState(false);
	const [editingCandidateId, setEditingCandidateId] = useState<string | null>(
		null,
	);
	const [showDraftCloseWarning, setShowDraftCloseWarning] = useState(false);
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const [isBulkConfirming, setIsBulkConfirming] = useState(false);
	const [candidateErrors, setCandidateErrors] = useState<
		Record<string, CandidateValidationErrors>
	>({});
	const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [dragActive, setDragActive] = useState(false);
	const [wizardTab, setWizardTab] = useState<"ai" | "quick">("ai");

	// ── Refs ──
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const audioInputRef = useRef<HTMLInputElement | null>(null);
	const dragCounterRef = useRef(0);
	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pollStartRef = useRef<number>(0);
	const terminalConfirmingRef = useRef(false);

	const router = useRouter();
	const trimmedText = text.trim();
	const hasValidTextSource = trimmedText.length >= MIN_DISCOVERY_TEXT_LENGTH;

	// ── Derived ──
	const canDiscover = canStartDiscovery({
		companyId,
		locationId,
		filesCount: files.length,
		hasAudio: audioFile !== null,
		hasValidTextSource,
	});
	const pendingCandidatesCount = candidates.filter(
		(candidate) => candidate.status === "pending",
	).length;
	const isCandidateMutationInFlight = confirmingId !== null || isBulkConfirming;
	const isBlocking =
		phase === "submitting" || phase === "processing" || phase === "confirming";

	// ── Sync defaultCompanyId on open ──
	useEffect(
		function syncCompanyIdOnOpen() {
			if (open && defaultCompanyId) {
				setCompanyId(defaultCompanyId);
				setLocationId("");
			}
		},
		[open, defaultCompanyId],
	);

	const handleCompanyChange = useCallback((nextCompanyId: string) => {
		setCompanyId((previousCompanyId) => {
			setLocationId((currentLocationId) =>
				resolveLocationIdOnCompanyChange({
					previousCompanyId,
					nextCompanyId,
					currentLocationId,
				}),
			);
			return nextCompanyId;
		});
	}, []);

	// ── Prefill text when opened via quick paste bridge ──
	useEffect(
		function syncDefaultTextOnOpen() {
			if (!open) {
				return;
			}
			if (defaultText && defaultText.trim().length > 0) {
				setText(defaultText);
			}
		},
		[open, defaultText],
	);

	// ── Reset on close ──
	useEffect(
		function resetOnClose() {
			if (open) return;
			// Delay reset so close animation completes
			const timeout = setTimeout(() => {
				setPhase("idle");
				setCompanyId(defaultCompanyId ?? "");
				setLocationId("");
				setFiles([]);
				setAudioFile(null);
				setText("");
				setResult(null);
				setCandidates([]);
				setCandidateModalOpen(false);
				setEditingCandidateId(null);
				setShowDraftCloseWarning(false);
				setConfirmingId(null);
				setIsBulkConfirming(false);
				setCandidateErrors({});
				setReviewSummary(null);
				setError(null);
				setDragActive(false);
				setWizardTab("ai");
				dragCounterRef.current = 0;
				terminalConfirmingRef.current = false;
			}, 200);
			return () => clearTimeout(timeout);
		},
		[open, defaultCompanyId],
	);

	// ── Cleanup polling on unmount ──
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
			terminalConfirmingRef.current = false;
		};
	}, []);

	// ── File validation ──
	const validateAndAddFiles = useCallback(
		(incoming: File[]) => {
			const remaining = MAX_FILES - files.length;
			if (remaining <= 0) {
				toast.error(`Maximum ${MAX_FILES} files allowed`);
				return;
			}

			const toAdd: File[] = [];
			for (const file of incoming.slice(0, remaining)) {
				if (!isSupportedDocumentFile(file)) {
					toast.error(`${file.name} is not a supported file type`);
					continue;
				}
				if (file.size > MAX_FILE_SIZE) {
					toast.error(`${file.name} exceeds 10 MB limit`);
					continue;
				}
				toAdd.push(file);
			}

			if (incoming.length > remaining) {
				toast.error(
					`Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed`,
				);
			}

			if (toAdd.length > 0) {
				setFiles((prev) => [...prev, ...toAdd]);
			}
		},
		[files.length],
	);

	const validateAndSetAudio = useCallback((file: File) => {
		if (!isSupportedAudioFile(file)) {
			toast.error("Audio must be mp3, wav, or m4a");
			return;
		}
		if (file.size > MAX_AUDIO_SIZE) {
			toast.error("Audio file exceeds 25 MB limit");
			return;
		}
		setAudioFile(file);
	}, []);

	// ── Drag handlers (dragCounterRef pattern from voice-interview-launcher) ──
	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (isBlocking) return;
			dragCounterRef.current++;
			if (e.dataTransfer.types.includes("Files")) setDragActive(true);
		},
		[isBlocking],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current--;
		if (dragCounterRef.current === 0) setDragActive(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);
			dragCounterRef.current = 0;
			if (isBlocking) return;

			const droppedFiles = Array.from(e.dataTransfer.files);
			if (droppedFiles.length === 0) return;

			const audioCandidates = droppedFiles.filter(isAudioCandidate);
			const nonAudio = droppedFiles.filter((f) => !isAudioCandidate(f));

			if (audioCandidates.length > 0) {
				const [firstAudio] = audioCandidates;
				if (audioFile) {
					toast.error("Only one audio file is allowed");
				} else if (firstAudio) {
					validateAndSetAudio(firstAudio);
				}
				if (audioCandidates.length > 1) {
					toast.error("Only one audio file is allowed");
				}
			}
			if (nonAudio.length > 0) {
				validateAndAddFiles(nonAudio);
			}
		},
		[isBlocking, audioFile, validateAndSetAudio, validateAndAddFiles],
	);

	// ── Remove handlers ──
	const removeFile = useCallback((index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const removeAudio = useCallback(() => {
		setAudioFile(null);
		if (audioInputRef.current) audioInputRef.current.value = "";
	}, []);

	// ── Polling ──
	const startPolling = useCallback(
		(sid: string) => {
			setPhase("processing");
			pollStartRef.current = Date.now();
			terminalConfirmingRef.current = false;

			pollIntervalRef.current = setInterval(async () => {
				try {
					const session = await discoverySessionsAPI.getSession(sid);

					if (TERMINAL_STATUSES.has(session.status)) {
						if (terminalConfirmingRef.current) {
							return;
						}
						terminalConfirmingRef.current = true;
						const finalSession = await confirmTerminalDiscoverySnapshot({
							sessionId: sid,
							terminalSession: session,
							getSession: discoverySessionsAPI.getSession,
						});
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
						}
						if (finalSession.status === "failed") {
							setError(finalSession.processingError ?? "Processing failed");
							setPhase("error");
						} else {
							setResult(finalSession);
							if (finalSession.summary.draftsNeedingConfirmation > 0) {
								try {
									const rows = await fetchCandidates(sid);
									const mapped = mapCandidateRows(rows, companyId, locationId);
									if (
										!shouldRouteToNoResults({
											draftsNeedingConfirmation:
												finalSession.summary.draftsNeedingConfirmation,
											mappedCandidatesCount: mapped.length,
										})
									) {
										setCandidates(mapped);
										setPhase("review");
										setCandidateModalOpen(true);
										return;
									}
									setPhase("no-results");
									return;
								} catch {
									toast.error("Could not load draft candidates for review");
									setPhase("error");
									setError("Could not load draft candidates for review");
									return;
								}
							}
							if (
								shouldRouteToNoResults({
									draftsNeedingConfirmation:
										finalSession.summary.draftsNeedingConfirmation,
									mappedCandidatesCount: 0,
								})
							) {
								setPhase("no-results");
							}
						}
						return;
					}

					// Timeout check
					if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
						if (pollIntervalRef.current) {
							clearInterval(pollIntervalRef.current);
							pollIntervalRef.current = null;
						}
						setError(
							"Processing is taking longer than expected. Please try again.",
						);
						setPhase("error");
					}
				} catch (err) {
					if (pollIntervalRef.current) {
						clearInterval(pollIntervalRef.current);
						pollIntervalRef.current = null;
					}
					setError(
						err instanceof Error
							? err.message
							: "Failed to check processing status",
					);
					setPhase("error");
				}
			}, POLL_INTERVAL_MS);
		},
		[companyId, locationId],
	);

	// ── Submit flow ──
	const handleDiscover = useCallback(async () => {
		if (!canDiscover) return;

		setPhase("submitting");
		setError(null);

		try {
			// 1. Create session
			const session = await discoverySessionsAPI.create(
				resolveDiscoverySessionCompanyScope({ companyId, locationId }),
			);
			const sid = session.id;

			// 2. Upload sources in parallel
			const uploads: Promise<unknown>[] = [];

			for (const file of files) {
				uploads.push(discoverySessionsAPI.uploadFile(sid, file));
			}
			if (audioFile) {
				uploads.push(discoverySessionsAPI.uploadAudio(sid, audioFile));
			}
			if (hasValidTextSource) {
				uploads.push(discoverySessionsAPI.addText(sid, trimmedText));
			}

			await Promise.all(uploads);

			// 3. Start processing
			await discoverySessionsAPI.start(sid);

			// 4. Begin polling
			startPolling(sid);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to start discovery",
			);
			setPhase("error");
		}
	}, [
		audioFile,
		canDiscover,
		companyId,
		files,
		hasValidTextSource,
		locationId,
		startPolling,
		trimmedText,
	]);

	// ── Try again (error recovery) ──
	const handleTryAgain = useCallback(() => {
		setPhase("idle");
		setError(null);
		setResult(null);
		setCandidates([]);
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		setShowDraftCloseWarning(false);
		setWizardTab("ai");
		setConfirmingId(null);
		setIsBulkConfirming(false);
		setCandidateErrors({});
		setReviewSummary(null);
	}, []);

	const handleConfirmCandidate = useCallback(
		async (itemId: string) => {
			if (isCandidateMutationInFlight) {
				return;
			}

			const candidate = candidates.find((item) => item.itemId === itemId);
			if (!candidate || candidate.status !== "pending") {
				return;
			}

			const validationErrors = validateCandidateForConfirmation(candidate);
			if (Object.keys(validationErrors).length > 0) {
				setCandidateErrors((current) => ({
					...current,
					[itemId]: validationErrors,
				}));
				setEditingCandidateId(itemId);
				toast.error("Complete required fields before confirming candidate");
				return;
			}

			setConfirmingId(itemId);
			try {
				await confirmCandidateDecision({
					candidate,
					decideDiscoveryDraft: bulkImportAPI.decideDiscoveryDraft,
					defaultLocationId: locationId,
				});
				setCandidates((prev) =>
					prev.map((candidate) =>
						candidate.itemId === itemId
							? { ...candidate, status: "confirmed" }
							: candidate,
					),
				);
				setCandidateErrors((current) => {
					if (!(itemId in current)) {
						return current;
					}
					const next = { ...current };
					delete next[itemId];
					return next;
				});
				setEditingCandidateId((current) =>
					current === itemId ? null : current,
				);
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to confirm stream",
				);
			} finally {
				setConfirmingId(null);
			}
		},
		[candidates, isCandidateMutationInFlight, locationId],
	);

	const handleGoToStreams = useCallback(() => {
		onOpenChange(false);
		router.push(routes.streams.all);
	}, [onOpenChange, router]);

	const handleGoToDrafts = useCallback(() => {
		onOpenChange(false);
		router.push(routes.streams.all);
	}, [onOpenChange, router]);

	const handleCreateManually = useCallback(() => {
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		setCandidateErrors({});
		setShowDraftCloseWarning(false);
		setPhase("idle");
		setWizardTab("quick");
	}, []);

	const handleCandidateFieldChange = useCallback(
		(itemId: string, field: CandidateEditableField, value: string) => {
			setCandidates((prev) =>
				prev.map((candidate) =>
					candidate.itemId === itemId
						? {
								...candidate,
								[field]: value,
							}
						: candidate,
				),
			);
			setCandidateErrors((current) => {
				if (!(itemId in current)) {
					return current;
				}
				const next = { ...current };
				delete next[itemId];
				return next;
			});
		},
		[],
	);

	const handleCandidateModalOpenChange = useCallback(
		(nextOpen: boolean) => {
			const instruction = resolveCandidateModalInstruction({
				nextOpen,
				pendingCandidatesCount,
			});

			if (instruction === "open-review") {
				setCandidateModalOpen(true);
				setPhase("review");
				return;
			}

			if (instruction === "warn-unresolved-drafts") {
				setShowDraftCloseWarning(true);
				return;
			}

			setCandidateModalOpen(false);
			setEditingCandidateId(null);
			setReviewSummary(reviewCounts(candidates));
			setPhase("complete");
		},
		[candidates, pendingCandidatesCount],
	);

	const handleProcessFinalizeAll = useCallback(async () => {
		if (isCandidateMutationInFlight) {
			return;
		}

		const currentCandidates = [...candidates];
		const pendingCandidatesCount = currentCandidates.filter(
			(candidate) => candidate.status === "pending",
		).length;

		if (pendingCandidatesCount === 0) {
			const finalized = currentCandidates.map((candidate) =>
				candidate.status === "pending"
					? { ...candidate, status: "skipped" as const }
					: candidate,
			);
			setCandidates(finalized);
			setReviewSummary(reviewCounts(finalized));
			setCandidateModalOpen(false);
			setEditingCandidateId(null);
			setCandidateErrors({});
			setPhase("complete");
			return;
		}

		setIsBulkConfirming(true);
		let outcome: FinalizeAllResult | null = null;

		try {
			outcome = await processFinalizeAllCandidates({
				candidates: currentCandidates,
				decideDiscoveryDraft: bulkImportAPI.decideDiscoveryDraft,
				defaultLocationId: locationId,
			});
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to finalize all pending candidates",
			);
		} finally {
			setIsBulkConfirming(false);
		}

		if (!outcome) {
			return;
		}

		if (Object.keys(outcome.validationById).length > 0) {
			setCandidateErrors((current) => ({
				...current,
				...outcome.validationById,
			}));
		}

		setCandidates(outcome.updatedCandidates);
		setReviewSummary(reviewCounts(outcome.updatedCandidates));
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		setCandidateErrors({});
		setPhase("complete");
	}, [candidates, isCandidateMutationInFlight, locationId]);

	const handleConfirmKeepDrafts = useCallback(() => {
		setShowDraftCloseWarning(false);
		setCandidateModalOpen(false);
		setEditingCandidateId(null);
		const finalizedCandidates = candidates.map((candidate) =>
			candidate.status === "pending"
				? { ...candidate, status: "skipped" as const }
				: candidate,
		);
		setCandidates(finalizedCandidates);
		setReviewSummary(reviewCounts(finalizedCandidates));
		setPhase("complete");
	}, [candidates]);

	// ── Prevent close during blocking phases ──
	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (isBlocking && !nextOpen) return;
			if (!nextOpen && candidateModalOpen) {
				setShowDraftCloseWarning(true);
				return;
			}
			onOpenChange(nextOpen);
		},
		[candidateModalOpen, isBlocking, onOpenChange],
	);

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// RENDER
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="glass-popover discovery-wizard-dialog w-[min(92vw,960px)] max-w-none min-h-[640px] p-0 gap-0 overflow-hidden rounded-2xl shadow-water-lg"
				showCloseButton={!isBlocking}
			>
				<div
					key={phase}
					aria-live="polite"
					className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col min-h-[640px]"
				>
					{(phase === "idle" || phase === "submitting") && (
						<IdleView
							phase={phase}
							wizardTab={wizardTab}
							onWizardTabChange={setWizardTab}
							companyId={companyId}
							locationId={locationId}
							onCompanyChange={handleCompanyChange}
							onLocationChange={setLocationId}
							files={files}
							audioFile={audioFile}
							onTextChange={setText}
							dragActive={dragActive}
							canDiscover={canDiscover}
							defaultCompanyId={defaultCompanyId}
							fileInputRef={fileInputRef}
							audioInputRef={audioInputRef}
							onDragEnter={handleDragEnter}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							onFilesSelected={validateAndAddFiles}
							onAudioSelected={validateAndSetAudio}
							onRemoveFile={removeFile}
							onRemoveAudio={removeAudio}
							onDiscover={handleDiscover}
							onClose={() => onOpenChange(false)}
						/>
					)}

					{phase === "processing" && <ProcessingView />}

					{phase === "no-results" && (
						<NoResultsView
							onClose={() => onOpenChange(false)}
							onTryAgain={handleTryAgain}
							onCreateManually={handleCreateManually}
						/>
					)}

					{phase === "review" && (
						<section className="flex flex-1 items-center justify-center px-6 py-10 text-center">
							<div>
								<p className="font-medium">Candidate review in progress</p>
								<p className="mt-1 text-sm text-muted-foreground">
									Use the confirmation modal to review and confirm candidates.
								</p>
							</div>
						</section>
					)}

					{phase === "confirming" && <ConfirmingView />}

					{phase === "complete" && reviewSummary && (
						<CompleteView
							confirmed={reviewSummary.confirmed}
							skipped={reviewSummary.skipped}
							onGoToStreams={handleGoToStreams}
							onGoToDrafts={handleGoToDrafts}
						/>
					)}

					{phase === "error" && (
						<ErrorView
							error={error ?? "An unexpected error occurred"}
							onTryAgain={handleTryAgain}
							onClose={() => onOpenChange(false)}
							onCreateManually={handleCreateManually}
						/>
					)}
				</div>
			</DialogContent>

			<DraftConfirmationModal
				open={candidateModalOpen}
				onOpenChange={handleCandidateModalOpenChange}
				candidates={candidates}
				editingCandidateId={editingCandidateId}
				onEditCandidate={setEditingCandidateId}
				onCandidateFieldChange={handleCandidateFieldChange}
				onConfirmCandidate={handleConfirmCandidate}
				onProcessFinalizeAll={handleProcessFinalizeAll}
				candidateErrors={candidateErrors}
				confirmingId={confirmingId}
				disableActions={isCandidateMutationInFlight}
				isBulkConfirming={isBulkConfirming}
			/>

			<AlertDialog
				open={showDraftCloseWarning}
				onOpenChange={setShowDraftCloseWarning}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Leave candidates as drafts?</AlertDialogTitle>
						<AlertDialogDescription>
							You still have unresolved candidates. If you close now, those
							candidates will remain as drafts and will not become real waste
							streams.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Reviewing</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmKeepDrafts}>
							Leave as Drafts
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUB-VIEWS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function IdleView({
	phase,
	wizardTab,
	onWizardTabChange,
	companyId,
	locationId,
	onCompanyChange,
	onLocationChange,
	files,
	audioFile,
	onTextChange,
	dragActive,
	canDiscover,
	defaultCompanyId,
	fileInputRef,
	audioInputRef,
	onDragEnter,
	onDragOver,
	onDragLeave,
	onDrop,
	onFilesSelected,
	onAudioSelected,
	onRemoveFile,
	onRemoveAudio,
	onDiscover,
	onClose,
}: {
	phase: "idle" | "submitting";
	wizardTab: "ai" | "quick";
	onWizardTabChange: (tab: "ai" | "quick") => void;
	companyId: string;
	locationId: string;
	onCompanyChange: (id: string) => void;
	onLocationChange: (id: string) => void;
	files: File[];
	audioFile: File | null;
	onTextChange: (text: string) => void;
	dragActive: boolean;
	canDiscover: boolean;
	defaultCompanyId: string | undefined;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	audioInputRef: React.RefObject<HTMLInputElement | null>;
	onDragEnter: (e: React.DragEvent) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
	onFilesSelected: (files: File[]) => void;
	onAudioSelected: (file: File) => void;
	onRemoveFile: (index: number) => void;
	onRemoveAudio: () => void;
	onDiscover: () => void;
	onClose: () => void;
}) {
	const hasAttachments = files.length > 0 || audioFile !== null;
	const isSubmitting = phase === "submitting";
	const [qe, setQe] = useState({
		client: "",
		locationId: "",
		material: "",
		volume: "",
		units: "Gallons",
		frequency: "Weekly",
	});
	const [quickEntryError, setQuickEntryError] = useState<string | null>(null);
	const [isSavingQuickEntry, setIsSavingQuickEntry] = useState(false);
	const { locations, loadLocationsByCompany } = useLocationStore();

	useEffect(() => {
		if (qe.client) {
			void loadLocationsByCompany(qe.client);
		}
	}, [qe.client, loadLocationsByCompany]);

	useEffect(() => {
		if (companyId) {
			void loadLocationsByCompany(companyId);
		}
	}, [companyId, loadLocationsByCompany]);

	const quickEntryLocations = locations.filter(
		(location) => location.companyId === qe.client,
	);
	const aiLocations = locations.filter(
		(location) => location.companyId === companyId,
	);
	const canSaveQuickEntryDraft = canSaveQuickEntry({
		clientId: qe.client,
		locationId: qe.locationId,
		material: qe.material,
		volume: qe.volume,
		units: qe.units,
		frequency: qe.frequency,
		isSaving: isSavingQuickEntry,
	});

	const resetQuickEntry = useCallback(() => {
		setQuickEntryError(null);
		setQe({
			client: "",
			locationId: "",
			material: "",
			volume: "",
			units: "Gallons",
			frequency: "Weekly",
		});
	}, []);

	const handleQuickEntrySave = useCallback(async () => {
		if (
			!qe.client ||
			!qe.material.trim() ||
			!qe.volume.trim() ||
			!qe.units.trim() ||
			!qe.frequency.trim()
		) {
			return;
		}

		if (!qe.locationId) {
			setQuickEntryError("Select a Location before saving");
			return;
		}

		setQuickEntryError(null);
		setIsSavingQuickEntry(true);

		try {
			await projectsAPI.createProject({
				locationId: qe.locationId,
				name: qe.material.trim(),
			});

			toast.success("Waste stream created");
			resetQuickEntry();
			onClose();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create stream",
			);
		} finally {
			setIsSavingQuickEntry(false);
		}
	}, [
		onClose,
		qe.client,
		qe.frequency,
		qe.locationId,
		qe.material,
		qe.units,
		qe.volume,
		resetQuickEntry,
	]);

	return (
		<div className="flex flex-col flex-1">
			{/* Header with accent strip */}
			<div className="relative overflow-hidden px-6 pt-8 pb-3">
				<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-container" />
				<h2 className="font-display text-xl font-semibold tracking-tight">
					Discovery Wizard
				</h2>
				<p className="text-sm text-muted-foreground/80 mt-1">
					Select a method to identify and ingest waste stream data
				</p>
				{/* Tab bar — editorial underline style */}
				<div className="mt-5 flex gap-0">
					<button
						type="button"
						onClick={() => onWizardTabChange("ai")}
						className={cn(
							"px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] border-b-2 transition-all",
							wizardTab === "ai"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border/40",
						)}
					>
						AI Discovery
					</button>
					<button
						type="button"
						onClick={() => onWizardTabChange("quick")}
						className={cn(
							"px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] border-b-2 transition-all",
							wizardTab === "quick"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border/40",
						)}
					>
						Quick Entry
					</button>
				</div>
			</div>

			{wizardTab === "quick" ? (
				/* ── Quick Entry Form ── */
				<div className="flex flex-col flex-1">
					<div className="flex-1 overflow-auto px-6 py-4">
						<div className="mx-auto w-full max-w-3xl space-y-4">
							<section className="rounded-xl bg-surface-container-lowest/80 p-5 shadow-xs">
								<div className="mb-2 flex items-center justify-between">
									<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
										Client
									</span>
									<CreateCompanyDialog
										onSuccess={(company) => {
											if (company) {
												setQuickEntryError(null);
												setQe({
													...qe,
													client: company.id,
													locationId: "",
												});
											}
										}}
										trigger={
											<button
												type="button"
												className="text-[0.6875rem] font-semibold text-primary hover:underline"
											>
												⊕ Add New Client
											</button>
										}
									/>
								</div>
								<CompanyCombobox
									value={qe.client}
									onValueChange={(value) => {
										setQuickEntryError(null);
										setQe({ ...qe, client: value, locationId: "" });
									}}
									placeholder="Select Existing Client"
									showCreate={true}
								/>
							</section>

							<section className="rounded-xl bg-surface-container-lowest/80 p-5 shadow-xs">
								<span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
									Location
								</span>
								<div className="space-y-1.5">
									<LocationCombobox
										companyId={qe.client}
										value={qe.locationId}
										onValueChange={(value) => {
											setQuickEntryError(null);
											setQe({ ...qe, locationId: value });
										}}
										placeholder={
											qe.client ? "Select Location" : "Select Client first"
										}
										className="h-12"
									/>
									{qe.client && quickEntryLocations.length === 0 ? (
										<div className="text-xs text-muted-foreground">
											No locations —{" "}
											<CreateLocationDialog
												companyId={qe.client}
												onSuccess={(location) => {
													if (!location) {
														return;
													}
													void loadLocationsByCompany(qe.client);
													setQe({ ...qe, locationId: location.id });
												}}
												trigger={
													<button
														type="button"
														className="font-medium text-primary hover:underline"
													>
														[+ Add location]
													</button>
												}
											/>
										</div>
									) : null}
								</div>
							</section>

							<section className="rounded-xl bg-surface-container-lowest/80 p-5 shadow-xs">
								<span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
									Material / Stream Name
								</span>
								<input
									type="text"
									placeholder="e.g. Spent Solvent"
									value={qe.material}
									onChange={(event) =>
										setQe({ ...qe, material: event.target.value })
									}
									className="w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
								/>
							</section>

							<section className="rounded-xl bg-surface-container-lowest/80 p-5 shadow-xs">
								<div className="grid gap-3 md:grid-cols-3">
									<div>
										<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
											Volume
										</span>
										<input
											type="text"
											placeholder="5,000"
											value={qe.volume}
											onChange={(event) =>
												setQe({ ...qe, volume: event.target.value })
											}
											className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
										/>
									</div>
									<div>
										<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
											Units
										</span>
										<select
											value={qe.units}
											onChange={(event) =>
												setQe({ ...qe, units: event.target.value })
											}
											className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
										>
											<option>Gallons</option>
											<option>Tons</option>
											<option>Barrels</option>
											<option>Pounds</option>
										</select>
									</div>
									<div>
										<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
											Frequency
										</span>
										<select
											value={qe.frequency}
											onChange={(event) =>
												setQe({ ...qe, frequency: event.target.value })
											}
											className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
										>
											<option>Weekly</option>
											<option>Bi-Weekly</option>
											<option>Monthly</option>
											<option>Quarterly</option>
											<option>Ad-hoc</option>
										</select>
									</div>
								</div>
							</section>
						</div>
					</div>
					{/* Quick Entry Footer */}
					<div className="flex items-center justify-between border-t border-border/20 bg-muted/20 px-6 py-4">
						<button
							type="button"
							onClick={resetQuickEntry}
							className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground hover:text-foreground transition-colors"
						>
							Clear All
						</button>
						<div className="flex items-center gap-3">
							{quickEntryError && (
								<p className="text-xs text-destructive">{quickEntryError}</p>
							)}
							<Button
								variant="ghost"
								onClick={() => {
									setQuickEntryError(null);
									onWizardTabChange("ai");
								}}
							>
								Cancel
							</Button>
							<Button
								onClick={handleQuickEntrySave}
								disabled={!canSaveQuickEntryDraft}
								className="bg-gradient-to-r from-primary to-primary/90 shadow-water"
							>
								{isSavingQuickEntry ? "Saving…" : "Save Stream"}
							</Button>
						</div>
					</div>
				</div>
			) : (
				<div className="flex flex-col flex-1">
					<div className="flex-1 overflow-auto px-6 py-6">
						<div className="mx-auto w-full max-w-3xl space-y-5">
							<section className="rounded-xl bg-surface-container-lowest/80 p-5 shadow-xs">
								<div className="mb-2 flex items-center justify-between">
									<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
										Client
									</span>
									<CreateCompanyDialog
										onSuccess={(company) => {
											if (company) {
												onCompanyChange(company.id);
											}
										}}
										trigger={
											<button
												type="button"
												className="text-[0.6875rem] font-semibold text-primary hover:underline"
											>
												⊕ Add New Client
											</button>
										}
									/>
								</div>
								{defaultCompanyId ? (
									<div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
										<Package className="size-4 text-muted-foreground" />
										Company pre-selected
									</div>
								) : (
									<CompanyCombobox
										value={companyId}
										onValueChange={(value) => {
											onCompanyChange(value);
											onLocationChange("");
										}}
										placeholder="Select Existing Client"
										showCreate={true}
									/>
								)}
							</section>

							<section className="rounded-xl bg-surface-container-lowest/80 p-5 shadow-xs">
								<span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
									Location
								</span>
								<div className="space-y-1.5">
									<LocationCombobox
										companyId={companyId}
										value={locationId}
										onValueChange={onLocationChange}
										placeholder={
											companyId ? "Select Location" : "Select Client first"
										}
										className="h-12"
									/>
									{companyId && aiLocations.length === 0 ? (
										<div className="text-xs text-muted-foreground">
											No locations —{" "}
											<CreateLocationDialog
												companyId={companyId}
												onSuccess={(location) => {
													if (!location) {
														return;
													}
													void loadLocationsByCompany(companyId);
													onLocationChange(location.id);
												}}
												trigger={
													<button
														type="button"
														className="font-medium text-primary hover:underline"
													>
														[+ Add location]
													</button>
												}
											/>
										</div>
									) : null}
								</div>
								<p className="mt-1.5 text-xs text-muted-foreground">
									Select a location before upload/analysis.
								</p>
							</section>

							<section className="rounded-xl bg-surface-container-lowest/80 p-5 shadow-xs">
								<div className="mb-2">
									<span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
										Upload files/emails
									</span>
									<p className="mt-1 text-xs text-muted-foreground">
										PDF, XLSX, EML and image files supported.
									</p>
								</div>
								<section
									aria-label={
										dragActive ? "Drop files here" : "File upload area"
									}
									className={cn(
										"relative rounded-xl border-2 border-dashed transition-all duration-300",
										dragActive
											? "border-primary/50 bg-primary/[0.08] shadow-glow ring-2 ring-primary/20"
											: "border-primary/20 bg-surface-container-low/40",
									)}
									onDragEnter={onDragEnter}
									onDragOver={onDragOver}
									onDragLeave={onDragLeave}
									onDrop={onDrop}
								>
									{hasAttachments ? (
										<div className="space-y-3 p-4">
											<div className="flex flex-wrap gap-2">
												{files.map((file, index) => {
													const Icon = fileIcon(file.name);
													return (
														<div
															key={`${file.name}-${file.size}`}
															className="group/chip flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-2 text-sm shadow-sm transition-all hover:border-border/60 hover:shadow-md"
														>
															<Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
															<span className="max-w-[140px] truncate">
																{file.name}
															</span>
															<span className="text-xs text-muted-foreground">
																{formatSize(file.size)}
															</span>
															<button
																type="button"
																aria-label={`Remove ${file.name}`}
																onClick={() => onRemoveFile(index)}
																className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-sm hover:bg-muted transition-opacity"
															>
																<X className="h-3 w-3" />
															</button>
														</div>
													);
												})}
												{audioFile && (
													<div className="group/chip flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-sm shadow-sm">
														<Mic className="h-3.5 w-3.5 shrink-0 text-primary" />
														<span className="max-w-[140px] truncate">
															{audioFile.name}
														</span>
														<span className="text-xs text-muted-foreground">
															{formatSize(audioFile.size)}
														</span>
														<button
															type="button"
															aria-label={`Remove ${audioFile.name}`}
															onClick={onRemoveAudio}
															className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-sm hover:bg-muted transition-opacity"
														>
															<X className="h-3 w-3" />
														</button>
													</div>
												)}
												{files.length < MAX_FILES && (
													<Button
														variant="outline"
														size="icon"
														className="h-9 w-9 border-dashed"
														onClick={() => fileInputRef.current?.click()}
														disabled={isSubmitting}
													>
														<Plus className="h-4 w-4" />
														<span className="sr-only">Add files</span>
													</Button>
												)}
											</div>
										</div>
									) : (
										<button
											type="button"
											className="flex w-full flex-col items-center gap-4 px-6 py-12 text-center"
											onClick={() => fileInputRef.current?.click()}
											disabled={isSubmitting}
										>
											<div className="flex items-center gap-4">
												<div className="rounded-lg bg-primary/8 p-2.5">
													<FileSpreadsheet className="h-6 w-6 text-primary/70" />
												</div>
												<div className="rounded-lg bg-primary/8 p-2.5">
													<FileText className="h-6 w-6 text-primary/70" />
												</div>
												<div className="rounded-lg bg-primary/8 p-2.5">
													<Image className="h-6 w-6 text-primary/70" />
												</div>
											</div>
											<div>
												<p
													className={cn(
														"text-sm font-medium",
														dragActive ? "text-primary" : "text-foreground",
													)}
												>
													{dragActive
														? "Drop files here"
														: "Drag and drop discovery assets here"}
												</p>
												<p className="mt-0.5 text-xs text-muted-foreground/60">
													Max 10 files · 50MB total upload budget
												</p>
											</div>
										</button>
									)}
								</section>
							</section>

							<section className="rounded-xl bg-surface-container-lowest/80 p-5 shadow-xs">
								<span className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
									Dictate voice note
								</span>
								<button
									type="button"
									className="flex w-full items-center justify-between rounded-xl bg-surface-container-low/60 px-4 py-4 transition-all hover:bg-surface-container-low hover:shadow-xs"
									onClick={() => audioInputRef.current?.click()}
									disabled={audioFile !== null || isSubmitting}
								>
									<div className="flex items-center gap-3">
										<div className="flex size-10 items-center justify-center rounded-full bg-primary">
											<Mic className="size-5 text-primary-foreground" />
										</div>
										<div className="text-left">
											<p className="text-sm font-semibold">Record Voice Note</p>
											<p className="text-xs text-muted-foreground">
												AI transcription will process clinical nuances
											</p>
										</div>
									</div>
									<div className="flex h-6 items-end gap-[2px]">
										{VOICE_WAVE_BARS.map((bar) => (
											<div
												key={bar.id}
												className="w-1 rounded-full bg-muted-foreground/20"
												style={{ height: `${bar.height * 4}px` }}
											/>
										))}
									</div>
								</button>
							</section>
						</div>
					</div>

					{/* Hidden file inputs */}
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept={ACCEPTED_FILE_TYPES}
						className="hidden"
						onChange={(e) => {
							const s = Array.from(e.target.files ?? []);
							if (s.length > 0) onFilesSelected(s);
							e.target.value = "";
						}}
					/>
					<input
						ref={audioInputRef}
						type="file"
						accept={ACCEPTED_AUDIO_TYPES}
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) onAudioSelected(f);
							e.target.value = "";
						}}
					/>

					{/* AI Discovery Footer */}
					<div className="flex items-center justify-between border-t border-border/20 bg-muted/20 px-6 py-4">
						<button
							type="button"
							onClick={() => {
								onRemoveAudio();
								onTextChange("");
							}}
							className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground hover:text-foreground transition-colors"
						>
							Clear All
						</button>
						<div className="flex items-center gap-3">
							<Button variant="ghost" onClick={onClose}>
								Cancel
							</Button>
							<Button
								onClick={onDiscover}
								disabled={!canDiscover || isSubmitting}
								className="bg-gradient-to-r from-primary to-primary/90 shadow-water hover:shadow-glow transition-shadow duration-300"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 motion-safe:animate-spin" />
										Uploading…
									</>
								) : (
									"Process with Second Stream AI"
								)}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function ProcessingView() {
	const { message, index } = useRotatingMessage(
		PROCESSING_MESSAGES,
		MESSAGE_CYCLE_MS,
	);

	return (
		<section
			aria-label="Processing your inputs"
			className="flex flex-col items-center justify-center flex-1 px-6 py-20"
		>
			{/* Orbital animation — 3 concentric rotating rings + center icon */}
			<div className="relative h-32 w-32 mb-8">
				{/* Ring 1 (outer) */}
				<div className="absolute inset-0 rounded-full border-2 border-primary/15 animate-orbital-1">
					<div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary/30" />
				</div>
				{/* Ring 2 (mid) */}
				<div className="absolute inset-4 rounded-full border-2 border-dashed border-primary/25 animate-orbital-2">
					<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary/40" />
				</div>
				{/* Ring 3 (inner) */}
				<div className="absolute inset-8 rounded-full border border-primary/35 animate-orbital-3" />
				{/* Center icon */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="animate-orbital-breathe bg-primary/10 rounded-full p-4">
						<Waves className="h-7 w-7 text-primary" />
					</div>
				</div>
			</div>

			{/* Rotating status message */}
			<div className="h-5 relative">
				<p
					key={index}
					className="animate-in fade-in slide-in-from-bottom-1 duration-300 text-sm font-medium text-foreground"
				>
					{message}
				</p>
			</div>
			<p className="text-xs text-muted-foreground mt-1">
				This may take a moment
			</p>
		</section>
	);
}

export function sourceStatusLabel(status: DiscoverySource["status"]): string {
	if (status === "review_ready") {
		return "Processed";
	}
	if (status === "failed") {
		return "Needs attention";
	}
	return "Processing";
}

export function sourceTypeLabel(
	sourceType: DiscoverySource["sourceType"],
): string {
	if (sourceType === "audio") {
		return "Audio";
	}
	if (sourceType === "text") {
		return "Text";
	}
	return "File";
}

export function sourceDisplayLabel(source: DiscoverySource): string {
	if (source.sourceFilename && source.sourceFilename.trim().length > 0) {
		return source.sourceFilename;
	}
	if (source.textPreview && source.textPreview.trim().length > 0) {
		return source.textPreview;
	}
	if (source.sourceType === "text") {
		return "Text input";
	}
	if (source.sourceType === "audio") {
		return "Audio source";
	}
	return "File source";
}

export function ResultView({
	result,
	onReviewNow,
}: {
	result: DiscoverySessionResult;
	onReviewNow: () => void;
}) {
	const stats = [
		{
			icon: Waves,
			label: "Waste-streams found",
			count: result.summary.wasteStreamsFound,
			color: "bg-emerald-500/10 text-emerald-600",
		},
		{
			icon: MapPin,
			label: "Locations found",
			count: result.summary.locationsFound,
			color: "bg-blue-500/10 text-blue-600",
		},
	];
	const subtitle =
		result.status === "partial_failure"
			? "We analyzed your sources and prepared drafts. A few inputs need attention."
			: "We analyzed your sources and prepared drafts for review.";

	return (
		<section aria-label="Discovery complete" className="flex flex-col flex-1">
			{/* Top accent strip */}
			<div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />

			<div className="flex flex-col items-center px-6 pt-10 pb-6 flex-1">
				{/* Success icon */}
				<div className="rounded-2xl bg-emerald-500/10 p-5 mb-5">
					<CheckCircle className="h-8 w-8 text-emerald-500" />
				</div>

				<h3 className="font-display text-xl font-semibold tracking-tight mb-1">
					Ready for review
				</h3>
				<p className="text-sm text-muted-foreground mb-8">{subtitle}</p>

				{/* Stat cards — vertical stack */}
				<div className="w-full max-w-sm space-y-3 mb-8">
					{stats.map((stat, i) => (
						<StatCard
							key={stat.label}
							icon={stat.icon}
							label={stat.label}
							count={stat.count}
							color={stat.color}
							delay={i * 100}
						/>
					))}
					<p className="text-xs text-muted-foreground px-1">
						Locations are prefilled inside each draft.
					</p>
				</div>

				<div className="w-full max-w-sm mb-8">
					<p className="text-xs font-medium text-muted-foreground mb-2">
						Sources analyzed
					</p>
					<div className="rounded-lg border border-border/50 divide-y divide-border/40">
						{result.sources.length === 0 ? (
							<div className="px-3 py-2 text-xs text-muted-foreground">
								No sources recorded.
							</div>
						) : (
							result.sources.map((source) => (
								<div
									key={source.id}
									className="px-3 py-2 flex items-start justify-between gap-3"
								>
									<div className="min-w-0">
										<p className="text-sm truncate">
											{sourceDisplayLabel(source)}
										</p>
										<p className="text-xs text-muted-foreground">
											{sourceTypeLabel(source.sourceType)}
										</p>
									</div>
									<span className="text-xs text-muted-foreground whitespace-nowrap">
										{sourceStatusLabel(source.status)}
									</span>
								</div>
							))
						)}
					</div>
				</div>

				{/* CTA — full-width at bottom */}
				<Button
					onClick={onReviewNow}
					className="w-full max-w-sm mt-auto bg-emerald-600 hover:bg-emerald-700 text-white"
				>
					Review Drafts
				</Button>
				<p className="mt-2 text-xs text-muted-foreground">
					Continue in-wizard review before finishing.
				</p>
			</div>
		</section>
	);
}

function StatCard({
	icon: Icon,
	label,
	count,
	color,
	delay,
}: {
	icon: typeof MapPin;
	label: string;
	count: number;
	color: string;
	delay: number;
}) {
	const animatedCount = useAnimatedCounter(count);

	return (
		<div
			className="animate-in fade-in slide-in-from-bottom-2 rounded-xl bg-card border border-border/40 px-5 py-4 shadow-sm flex items-center gap-4"
			style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
		>
			<div className={`rounded-lg p-2.5 ${color}`}>
				<Icon className="h-5 w-5" />
			</div>
			<div className="flex items-baseline gap-2">
				<span className="font-display text-2xl font-bold tracking-tight tabular-nums">
					{animatedCount}
				</span>
				<span className="text-sm text-muted-foreground">{label}</span>
			</div>
		</div>
	);
}

function ConfirmingView() {
	return (
		<section className="flex flex-col items-center justify-center flex-1 px-6 py-20">
			<Loader2 className="h-8 w-8 text-primary motion-safe:animate-spin" />
			<p className="mt-4 text-sm font-medium">Confirming stream…</p>
			<p className="text-xs text-muted-foreground mt-1">
				Applying your decision
			</p>
		</section>
	);
}

function _confidenceBadgeClass(confidence: number): string {
	if (confidence >= 0.8) {
		return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
	}
	if (confidence >= 0.5) {
		return "bg-amber-500/10 text-amber-700 border-amber-500/20";
	}
	return "bg-muted text-muted-foreground border-border/60";
}

export function ReviewView({
	candidates,
	confirmingId,
	onConfirm,
	onSkip,
	onDiscard,
	onFinish,
}: {
	candidates: DraftCandidate[];
	confirmingId: string | null;
	onConfirm: (itemId: string) => void;
	onSkip: (itemId: string) => void;
	onDiscard: (itemId: string) => void;
	onFinish: () => void;
}) {
	const counts = reviewCounts(candidates);
	const actioned = counts.confirmed + counts.skipped;
	const finishEnabled = actioned === counts.total || counts.confirmed >= 1;

	return (
		<section className="flex flex-col flex-1">
			{/* Header */}
			<div className="px-6 pt-6 pb-4">
				<h3 className="font-display text-xl font-semibold tracking-tight">
					Confirm Identified Streams
				</h3>
				<p className="text-sm text-muted-foreground mt-1">
					Review AI-extracted chemical waste manifests before system ingestion.
				</p>
			</div>

			{/* Table */}
			<div className="flex-1 overflow-auto px-6">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-border/30">
							<th className="text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary py-2 pr-3">
								Material Name
							</th>
							<th className="text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary py-2 pr-3">
								Source
							</th>
							<th className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary py-2 pr-3">
								Volume
							</th>
							<th className="text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary py-2 pr-3">
								Frequency
							</th>
							<th className="text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary py-2 pr-3">
								Units
							</th>
							<th className="text-right text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary py-2">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/20">
						{candidates.map((candidate) => {
							const isConfirmed = candidate.status === "confirmed";
							const isSkipped = candidate.status === "skipped";
							return (
								<tr
									key={candidate.itemId}
									className={cn(
										"transition-colors border-l-[3px]",
										isConfirmed && "border-l-emerald-500 bg-emerald-500/5",
										isSkipped && "border-l-muted-foreground/30 opacity-60",
										!isConfirmed && !isSkipped && "border-l-primary",
									)}
								>
									<td className="py-3 pr-3">
										<p className="font-medium truncate max-w-[180px]">
											{candidate.material}
										</p>
										{candidate.locationLabel && (
											<p className="text-[0.6875rem] text-muted-foreground uppercase tracking-wide truncate">
												{candidate.locationLabel}
											</p>
										)}
									</td>
									<td className="py-3 pr-3">
										<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
											<FileText className="size-3" />
											{candidate.source}
										</span>
									</td>
									<td className="py-3 pr-3 text-right font-medium tabular-nums">
										{candidate.volume ?? "—"}
									</td>
									<td className="py-3 pr-3 text-xs text-muted-foreground">
										{candidate.frequency ?? "—"}
									</td>
									<td className="py-3 pr-3 text-xs text-muted-foreground">
										{candidate.units ?? "—"}
									</td>
									<td className="py-3">
										<div className="flex items-center justify-end gap-1.5">
											{isConfirmed ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
													<CircleCheck className="size-3.5" />
													Confirmed
												</span>
											) : isSkipped ? (
												<span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
													Kept as draft
												</span>
											) : (
												<>
													<Button
														size="sm"
														onClick={() => onConfirm(candidate.itemId)}
														disabled={confirmingId === candidate.itemId}
														className="h-7 bg-primary text-primary-foreground text-[11px] px-2.5"
													>
														{confirmingId === candidate.itemId ? (
															<Loader2 className="size-3 animate-spin" />
														) : (
															<>
																<CircleCheck className="size-3 mr-1" />
																Confirm
															</>
														)}
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() => onSkip(candidate.itemId)}
														className="h-7 text-[11px] px-2.5"
													>
														<FileText className="size-3 mr-1" />
														Keep as Draft
													</Button>
													<button
														type="button"
														onClick={() => onDiscard(candidate.itemId)}
														className="h-7 w-7 flex items-center justify-center rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
													>
														<Trash2 className="size-3.5" />
													</button>
												</>
											)}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between border-t border-border/10 bg-surface-container-low/40 px-6 py-5">
				<div className="flex items-center gap-2">
					<span className="inline-flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
						{counts.confirmed}
					</span>
					<span className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold">
						{counts.skipped}
					</span>
					<span className="text-xs text-muted-foreground">
						{counts.total} streams identified for batch processing.
					</span>
				</div>
				<div className="flex items-center gap-3">
					<Button
						onClick={onFinish}
						disabled={!finishEnabled}
						className="bg-gradient-to-r from-primary to-primary/90 shadow-water"
					>
						Finish Review
					</Button>
				</div>
			</div>
		</section>
	);
}

export function CompleteView({
	confirmed,
	skipped,
	onGoToStreams,
	onGoToDrafts,
}: {
	confirmed: number;
	skipped: number;
	onGoToStreams: () => void;
	onGoToDrafts: () => void;
}) {
	return (
		<section className="flex flex-col flex-1 px-6 pt-8 pb-6">
			<div className="flex items-start gap-3 mb-2">
				<div className="rounded-xl bg-primary/10 p-2.5">
					<CheckCircle className="h-5 w-5 text-primary" />
				</div>
				<div>
					<h3 className="font-display text-xl font-semibold tracking-tight">
						Waste Streams Created
					</h3>
					<p className="text-sm text-muted-foreground mt-0.5 max-w-md">
						{confirmed} stream{confirmed === 1 ? "" : "s"} confirmed and
						created. {skipped} stream{skipped === 1 ? "" : "s"} kept as draft.
					</p>
				</div>
			</div>

			{/* Footer */}
			<div className="mt-auto flex items-center justify-end gap-3 pt-6">
				<Button variant="ghost" onClick={onGoToDrafts}>
					Done
				</Button>
				<Button
					onClick={onGoToStreams}
					className="bg-gradient-to-r from-primary to-primary/90 shadow-water"
				>
					View Streams
				</Button>
			</div>
		</section>
	);
}

export function NoResultsView({
	onClose,
	onTryAgain,
	onCreateManually,
}: {
	onClose: () => void;
	onTryAgain: () => void;
	onCreateManually: () => void;
}) {
	return (
		<section className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
			<div className="rounded-full bg-muted/70 p-4">
				<AlertCircle className="h-7 w-7 text-muted-foreground" />
			</div>
			<h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
				No streams detected
			</h3>
			<p className="mt-1 max-w-md text-sm text-muted-foreground">
				Second Stream AI could not identify candidates from this input.
			</p>

			<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
				<Button onClick={onTryAgain}>Try Again</Button>
				<Button variant="secondary" onClick={onCreateManually}>
					Create Manually
				</Button>
			</div>
		</section>
	);
}

function ErrorView({
	error,
	onTryAgain,
	onClose,
	onCreateManually,
}: {
	error: string;
	onTryAgain: () => void;
	onClose: () => void;
	onCreateManually: () => void;
}) {
	return (
		<div
			role="alert"
			className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center flex-1 px-6 py-12"
		>
			<div className="rounded-full bg-destructive/10 p-4 mb-4">
				<AlertCircle className="h-8 w-8 text-destructive" />
			</div>

			<h3 className="font-display text-lg font-semibold tracking-tight mb-1">
				Something went wrong
			</h3>
			<p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
				{error}
			</p>

			<div className="flex gap-3">
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
				<Button onClick={onTryAgain}>Try Again</Button>
				<Button variant="secondary" onClick={onCreateManually}>
					Create Manually
				</Button>
			</div>
		</div>
	);
}
