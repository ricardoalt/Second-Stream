"use client";

import {
	AlertCircle,
	Calendar,
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
import { Button } from "@/components/ui/button";
import { CompanyCombobox } from "@/components/ui/company-combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { bulkImportAPI } from "@/lib/api/bulk-import";
import { fetchCandidates } from "@/lib/api/dashboard";
import { discoverySessionsAPI } from "@/lib/api/discovery-sessions";
import { routes } from "@/lib/routes";
import { useDashboardActions } from "@/lib/stores/dashboard-store";
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

const MESSAGE_CYCLE_MS = 3000;
const COUNTER_DURATION_MS = 800;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type WizardPhase =
	| "idle"
	| "submitting"
	| "processing"
	| "result"
	| "review"
	| "confirming"
	| "complete"
	| "error";

interface ReviewSummary {
	confirmed: number;
	skipped: number;
	total: number;
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

interface NavigateToSessionScopedDashboardArgs {
	sessionId: string;
	openNeedsConfirmationForSession: (sessionId: string) => void;
	closeWizard: () => void;
	push: (href: string) => void;
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

export function navigateToSessionScopedDashboard({
	sessionId,
	openNeedsConfirmationForSession,
	closeWizard,
	push,
}: NavigateToSessionScopedDashboardArgs): void {
	openNeedsConfirmationForSession(sessionId);
	closeWizard();
	push(routes.dashboard);
}

export function mapCandidateRows(rows: DraftItemRow[]): DraftCandidate[] {
	return rows.map((row) => ({
		itemId: row.itemId,
		runId: row.runId,
		material: row.streamName,
		volume: row.volumeSummary,
		locationLabel: row.locationLabel,
		source: row.sourceFilename ?? sourceTypeLabelFromDraft(row.sourceType),
		confidence: row.confidence,
		status: "pending",
	}));
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
	const [files, setFiles] = useState<File[]>([]);
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const [text, setText] = useState("");
	const [result, setResult] = useState<DiscoverySessionResult | null>(null);
	const [candidates, setCandidates] = useState<DraftCandidate[]>([]);
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [dragActive, setDragActive] = useState(false);

	// ── Refs ──
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const audioInputRef = useRef<HTMLInputElement | null>(null);
	const dragCounterRef = useRef(0);
	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pollStartRef = useRef<number>(0);
	const terminalConfirmingRef = useRef(false);

	const router = useRouter();
	const { openNeedsConfirmationForSession } = useDashboardActions();
	const trimmedText = text.trim();
	const hasValidTextSource = trimmedText.length >= MIN_DISCOVERY_TEXT_LENGTH;

	// ── Derived ──
	const canDiscover =
		companyId !== "" &&
		(files.length > 0 || audioFile !== null || hasValidTextSource);
	const isBlocking =
		phase === "submitting" || phase === "processing" || phase === "confirming";

	// ── Sync defaultCompanyId on open ──
	useEffect(
		function syncCompanyIdOnOpen() {
			if (open && defaultCompanyId) {
				setCompanyId(defaultCompanyId);
			}
		},
		[open, defaultCompanyId],
	);

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
				setFiles([]);
				setAudioFile(null);
				setText("");
				setResult(null);
				setCandidates([]);
				setConfirmingId(null);
				setReviewSummary(null);
				setError(null);
				setDragActive(false);
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
	const startPolling = useCallback((sid: string) => {
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
								const mapped = mapCandidateRows(rows);
								if (mapped.length > 0) {
									setCandidates(mapped);
									setPhase("review");
									return;
								}
							} catch {
								toast.error("Could not load draft candidates for review");
							}
						}
						setPhase("result");
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
	}, []);

	// ── Submit flow ──
	const handleDiscover = useCallback(async () => {
		if (!canDiscover) return;

		setPhase("submitting");
		setError(null);

		try {
			// 1. Create session
			const session = await discoverySessionsAPI.create(companyId);
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
		startPolling,
		trimmedText,
	]);

	// ── Try again (error recovery) ──
	const handleTryAgain = useCallback(() => {
		setPhase("idle");
		setError(null);
		setResult(null);
		setCandidates([]);
		setConfirmingId(null);
		setReviewSummary(null);
	}, []);

	const handleConfirmCandidate = useCallback(async (itemId: string) => {
		setPhase("confirming");
		setConfirmingId(itemId);
		try {
			await bulkImportAPI.decideDiscoveryDraft(itemId, { action: "confirm" });
			setCandidates((prev) =>
				prev.map((candidate) =>
					candidate.itemId === itemId
						? { ...candidate, status: "confirmed" }
						: candidate,
				),
			);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to confirm stream",
			);
		} finally {
			setConfirmingId(null);
			setPhase("review");
		}
	}, []);

	const handleSkipCandidate = useCallback((itemId: string) => {
		setCandidates((prev) =>
			prev.map((candidate) =>
				candidate.itemId === itemId
					? { ...candidate, status: "skipped" }
					: candidate,
			),
		);
	}, []);

	const handleFinishReview = useCallback(() => {
		const counts = reviewCounts(candidates);
		const allActioned = counts.confirmed + counts.skipped === counts.total;
		if (!allActioned && counts.confirmed < 1) {
			return;
		}
		setReviewSummary(counts);
		setPhase("complete");
	}, [candidates]);

	const handleGoToStreams = useCallback(() => {
		onOpenChange(false);
		router.push(routes.streams.all);
	}, [onOpenChange, router]);

	const handleGoToDrafts = useCallback(() => {
		onOpenChange(false);
		router.push(routes.streams.all);
	}, [onOpenChange, router]);

	// ── Navigate to dashboard ──
	const handleGoToDashboard = useCallback(
		(sessionId: string) => {
			navigateToSessionScopedDashboard({
				sessionId,
				openNeedsConfirmationForSession,
				closeWizard: () => onOpenChange(false),
				push: (href) => router.push(href),
			});
		},
		[openNeedsConfirmationForSession, onOpenChange, router],
	);

	// ── Prevent close during blocking phases ──
	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (isBlocking && !nextOpen) return;
			onOpenChange(nextOpen);
		},
		[isBlocking, onOpenChange],
	);

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// RENDER
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="glass-popover discovery-wizard-dialog w-[min(92vw,800px)] max-w-none min-h-[560px] p-0 gap-0 overflow-hidden rounded-2xl shadow-water-lg"
				showCloseButton={!isBlocking}
			>
				<div
					key={phase}
					aria-live="polite"
					className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col min-h-[560px]"
				>
					{(phase === "idle" || phase === "submitting") && (
						<IdleView
							phase={phase}
							companyId={companyId}
							onCompanyChange={setCompanyId}
							files={files}
							audioFile={audioFile}
							text={text}
							trimmedText={trimmedText}
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
						/>
					)}

					{phase === "processing" && <ProcessingView />}

					{phase === "result" && result && (
						<ResultView result={result} onGoToDashboard={handleGoToDashboard} />
					)}

					{phase === "review" && (
						<ReviewView
							candidates={candidates}
							confirmingId={confirmingId}
							onConfirm={handleConfirmCandidate}
							onSkip={handleSkipCandidate}
							onFinish={handleFinishReview}
						/>
					)}

					{phase === "confirming" && <ConfirmingView />}

					{phase === "complete" && reviewSummary && (
						<CompleteView
							confirmed={reviewSummary.confirmed}
							skipped={reviewSummary.skipped}
							total={reviewSummary.total}
							onGoToStreams={handleGoToStreams}
							onGoToDrafts={handleGoToDrafts}
						/>
					)}

					{phase === "error" && (
						<ErrorView
							error={error ?? "An unexpected error occurred"}
							onTryAgain={handleTryAgain}
							onClose={() => onOpenChange(false)}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUB-VIEWS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function IdleView({
	phase,
	companyId,
	onCompanyChange,
	files,
	audioFile,
	text,
	trimmedText,
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
}: {
	phase: "idle" | "submitting";
	companyId: string;
	onCompanyChange: (id: string) => void;
	files: File[];
	audioFile: File | null;
	text: string;
	trimmedText: string;
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
}) {
	const hasAttachments = files.length > 0 || audioFile !== null;
	const isSubmitting = phase === "submitting";

	const [wizardTab, setWizardTab] = useState<"ai" | "quick">("ai");
	const [qe, setQe] = useState({
		client: "",
		material: "",
		process: "",
		volume: "",
		units: "Gallons",
		location: "",
		frequency: "Weekly",
		packaging: "Bulk Tanker",
		firstLift: "",
	});

	return (
		<div className="flex flex-col flex-1">
			{/* Header */}
			<div className="px-6 pt-6 pb-2">
				<h2 className="font-display text-lg font-semibold tracking-tight">
					Discovery Wizard
				</h2>
				<p className="text-sm text-muted-foreground/80 mt-0.5">
					Select a method to identify and ingest waste stream data
				</p>
				{/* Tab bar */}
				<div className="mt-3 flex gap-1 border-b border-border/20">
					<button
						type="button"
						onClick={() => setWizardTab("ai")}
						className={cn(
							"px-4 py-2 text-xs font-semibold uppercase tracking-[0.05em] border-b-2 transition-colors",
							wizardTab === "ai"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						AI Discovery
					</button>
					<button
						type="button"
						onClick={() => setWizardTab("quick")}
						className={cn(
							"px-4 py-2 text-xs font-semibold uppercase tracking-[0.05em] border-b-2 transition-colors",
							wizardTab === "quick"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground",
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
						<div className="grid gap-4 lg:grid-cols-2">
							{/* Material Identity */}
							<div className="rounded-xl bg-surface-container-low/50 p-4">
								<div className="flex items-center gap-2 mb-3">
									<Package className="size-4 text-primary" />
									<h4 className="text-sm font-semibold">Material Identity</h4>
								</div>
								<div className="space-y-3">
									<div>
										<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
											Client Selection
										</span>
										<CompanyCombobox
											value={qe.client}
											onValueChange={(v) => setQe({ ...qe, client: v })}
											placeholder="Select an existing client..."
											showCreate={false}
										/>
									</div>
									<div>
										<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
											Material Name
										</span>
										<input
											type="text"
											placeholder="e.g. Toluene"
											value={qe.material}
											onChange={(e) =>
												setQe({ ...qe, material: e.target.value })
											}
											className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
										/>
									</div>
									<div>
										<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
											Generating Process
										</span>
										<input
											type="text"
											placeholder="e.g. Reactor Cleaning"
											value={qe.process}
											onChange={(e) =>
												setQe({ ...qe, process: e.target.value })
											}
											className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
										/>
									</div>
								</div>
							</div>
							{/* Frequency & Volume + Timeline */}
							<div className="flex flex-col gap-4">
								<div className="rounded-xl bg-surface-container-low/50 p-4">
									<div className="flex items-center gap-2 mb-3">
										<Waves className="size-4 text-primary" />
										<h4 className="text-sm font-semibold">
											Frequency &amp; Volume
										</h4>
									</div>
									<div className="space-y-3">
										<div className="grid grid-cols-2 gap-2">
											<div>
												<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
													Volume / Weight
												</span>
												<input
													type="text"
													placeholder="5,000"
													value={qe.volume}
													onChange={(e) =>
														setQe({ ...qe, volume: e.target.value })
													}
													className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
												/>
											</div>
											<div>
												<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
													&nbsp;
												</span>
												<select
													value={qe.units}
													onChange={(e) =>
														setQe({ ...qe, units: e.target.value })
													}
													className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
												>
													<option>Gallons</option>
													<option>Tons</option>
													<option>Barrels</option>
													<option>Pounds</option>
												</select>
											</div>
										</div>
										<div>
											<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
												Primary Location
											</span>
											<div className="relative mt-1">
												<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
												<input
													type="text"
													placeholder="City, State"
													value={qe.location}
													onChange={(e) =>
														setQe({ ...qe, location: e.target.value })
													}
													className="w-full rounded-lg bg-surface-container-high/60 pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
												/>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div>
												<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
													Frequency
												</span>
												<select
													value={qe.frequency}
													onChange={(e) =>
														setQe({ ...qe, frequency: e.target.value })
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
											<div>
												<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
													Packaging Type
												</span>
												<select
													value={qe.packaging}
													onChange={(e) =>
														setQe({ ...qe, packaging: e.target.value })
													}
													className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
												>
													<option>Bulk Tanker</option>
													<option>Drums</option>
													<option>Totes</option>
													<option>Containers</option>
												</select>
											</div>
										</div>
									</div>
								</div>
								{/* Timeline */}
								<div className="rounded-xl bg-surface-container-low/50 p-4">
									<div className="flex items-center gap-2 mb-3">
										<Calendar className="size-4 text-primary" />
										<h4 className="text-sm font-semibold">Timeline</h4>
									</div>
									<div>
										<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
											Expected First Lift
										</span>
										<input
											type="date"
											value={qe.firstLift}
											onChange={(e) =>
												setQe({ ...qe, firstLift: e.target.value })
											}
											className="mt-1 w-full rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
										/>
									</div>
								</div>
							</div>
						</div>
						{/* Entry Guidelines */}
						<div className="mt-4 rounded-lg bg-primary/5 px-4 py-3">
							<p className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-primary mb-1">
								Entry Guidelines
							</p>
							<ul className="space-y-1">
								<li className="flex items-center gap-2 text-xs text-muted-foreground">
									<span className="size-1.5 rounded-full bg-primary" />
									Ensure MSDS are available.
								</li>
								<li className="flex items-center gap-2 text-xs text-muted-foreground">
									<span className="size-1.5 rounded-full bg-primary" />
									Verify packaging compatibility.
								</li>
							</ul>
						</div>
					</div>
					{/* Quick Entry Footer */}
					<div className="flex items-center justify-between border-t border-border/20 bg-muted/20 px-6 py-4">
						<button
							type="button"
							onClick={() =>
								setQe({
									client: "",
									material: "",
									process: "",
									volume: "",
									units: "Gallons",
									location: "",
									frequency: "Weekly",
									packaging: "Bulk Tanker",
									firstLift: "",
								})
							}
							className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground hover:text-foreground transition-colors"
						>
							Clear All
						</button>
						<div className="flex items-center gap-3">
							<Button variant="ghost" onClick={() => onDiscover()}>
								Cancel
							</Button>
							<Button
								disabled={!qe.client || !qe.material}
								className="bg-gradient-to-r from-primary to-primary/90 shadow-water"
							>
								Save Stream
							</Button>
						</div>
					</div>
				</div>
			) : (
				<div className="flex flex-col flex-1">
					<div className="flex-1 overflow-auto px-6 py-4 space-y-5">
						{/* CLIENT INFORMATION */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary">
									Client Information
								</span>
								<button
									type="button"
									className="text-[0.6875rem] font-semibold text-primary hover:underline"
								>
									⊕ Add New Client
								</button>
							</div>
							{defaultCompanyId ? (
								<div className="rounded-lg border border-border/30 bg-surface-container-lowest px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
									<Package className="size-4 text-muted-foreground" />
									Company pre-selected
								</div>
							) : (
								<CompanyCombobox
									value={companyId}
									onValueChange={onCompanyChange}
									placeholder="Select Existing Client"
									showCreate={false}
								/>
							)}
						</div>

						{/* ASSIGN DEFAULT LOCATION */}
						<div>
							<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary block mb-2">
								Assign Default Location to All Streams (Optional)
							</span>
							<div className="relative">
								<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
								<input
									type="text"
									placeholder="e.g. Houston Facility, TX"
									className="w-full rounded-lg border border-border/30 bg-surface-container-lowest pl-9 pr-3 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
									disabled={isSubmitting}
								/>
							</div>
							<p className="text-xs text-muted-foreground mt-1.5">
								This location will be applied to all identified waste streams
								from this session.
							</p>
						</div>

						{/* UPLOAD CLIENT FILES OR EMAILS */}
						<div>
							<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary block mb-2">
								Upload Client Files or Emails
							</span>
							<section
								aria-label={dragActive ? "Drop files here" : "File upload area"}
								className={cn(
									"relative rounded-xl border-2 border-dashed transition-all duration-300",
									dragActive
										? "border-primary/40 bg-primary/[0.06] shadow-glow ring-2 ring-primary/20"
										: "border-border/30 bg-surface-container-lowest",
								)}
								onDragEnter={onDragEnter}
								onDragOver={onDragOver}
								onDragLeave={onDragLeave}
								onDrop={onDrop}
							>
								{hasAttachments ? (
									<div className="p-4 space-y-3">
										<div className="flex flex-wrap gap-2">
											{files.map((file, index) => {
												const Icon = fileIcon(file.name);
												return (
													<div
														key={`${file.name}-${file.size}`}
														className="group/chip flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-2 text-sm shadow-sm hover:shadow-md hover:border-border/60 transition-all"
													>
														<Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
														<span className="truncate max-w-[140px]">
															{file.name}
														</span>
														<span className="text-xs text-muted-foreground">
															{formatSize(file.size)}
														</span>
														<button
															type="button"
															aria-label={`Remove ${file.name}`}
															onClick={() => onRemoveFile(index)}
															className="ml-0.5 h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted transition-opacity"
														>
															<X className="h-3 w-3" />
														</button>
													</div>
												);
											})}
											{audioFile && (
												<div className="group/chip flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-sm shadow-sm">
													<Mic className="h-3.5 w-3.5 text-primary shrink-0" />
													<span className="truncate max-w-[140px]">
														{audioFile.name}
													</span>
													<span className="text-xs text-muted-foreground">
														{formatSize(audioFile.size)}
													</span>
													<button
														type="button"
														aria-label={`Remove ${audioFile.name}`}
														onClick={onRemoveAudio}
														className="ml-0.5 h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted transition-opacity"
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
										className="flex w-full flex-col items-center gap-3 px-6 py-10 text-center"
										onClick={() => fileInputRef.current?.click()}
										disabled={isSubmitting}
									>
										<div className="flex items-center gap-3">
											<FileSpreadsheet className="h-5 w-5 text-primary/60" />
											<FileText className="h-5 w-5 text-primary/60" />
											<Image className="h-5 w-5 text-primary/60" />
										</div>
										<div>
											<p
												className={cn(
													"font-medium text-sm",
													dragActive ? "text-primary" : "text-foreground",
												)}
											>
												{dragActive
													? "Drop files here"
													: "Drag and drop discovery assets here"}
											</p>
											<p className="text-xs text-muted-foreground/60 mt-0.5">
												PDF, XLSX, or EML files supported (Max 50MB)
											</p>
										</div>
									</button>
								)}
							</section>
						</div>

						{/* DICTATE DISCOVERY NOTES */}
						<div>
							<span className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-secondary block mb-2">
								Dictate Discovery Notes
							</span>
							<button
								type="button"
								className="w-full rounded-xl border border-border/30 bg-surface-container-lowest px-4 py-4 flex items-center justify-between hover:border-border/50 transition-colors"
								onClick={() => audioInputRef.current?.click()}
								disabled={audioFile !== null || isSubmitting}
							>
								<div className="flex items-center gap-3">
									<div className="size-10 rounded-full bg-primary flex items-center justify-center">
										<Mic className="size-5 text-primary-foreground" />
									</div>
									<div className="text-left">
										<p className="text-sm font-semibold">Record Voice Note</p>
										<p className="text-xs text-muted-foreground">
											AI-transcription will process clinical nuances
										</p>
									</div>
								</div>
								<div className="flex items-end gap-[2px] h-6">
									{[3, 5, 2, 6, 4, 3, 5].map((h, i) => (
										<div
											key={`bar-${h}-${i}`}
											className="w-1 rounded-full bg-muted-foreground/20"
											style={{ height: `${h * 4}px` }}
										/>
									))}
								</div>
							</button>
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
							<Button variant="ghost">Cancel</Button>
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
	onGoToDashboard,
}: {
	result: DiscoverySessionResult;
	onGoToDashboard: (sessionId: string) => void;
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
					onClick={() => onGoToDashboard(result.id)}
					className="w-full max-w-sm mt-auto bg-emerald-600 hover:bg-emerald-700 text-white"
				>
					Go to dashboard
				</Button>
				<p className="mt-2 text-xs text-muted-foreground">
					Scoped to this discovery session.
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
	onFinish,
}: {
	candidates: DraftCandidate[];
	confirmingId: string | null;
	onConfirm: (itemId: string) => void;
	onSkip: (itemId: string) => void;
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
										"transition-colors",
										isConfirmed && "bg-emerald-500/5",
										isSkipped && "opacity-60",
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
										Monthly
									</td>
									<td className="py-3 pr-3 text-xs text-muted-foreground">
										Gallons
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
													Draft
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
														Draft
													</Button>
													<button
														type="button"
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
			<div className="flex items-center justify-between border-t border-border/20 bg-muted/20 px-6 py-4">
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
						variant="ghost"
						onClick={onFinish}
						disabled={!finishEnabled}
						className="text-xs"
					>
						Cancel
					</Button>
					<Button
						onClick={onFinish}
						disabled={!finishEnabled}
						className="bg-gradient-to-r from-primary to-primary/90 shadow-water"
					>
						Process & Finalize All
					</Button>
				</div>
			</div>
		</section>
	);
}

export function CompleteView({
	confirmed,
	skipped,
	total,
	onGoToStreams,
	onGoToDrafts,
}: {
	confirmed: number;
	skipped: number;
	total: number;
	onGoToStreams: () => void;
	onGoToDrafts: () => void;
}) {
	const phases = [
		{ num: 1, label: "Operational" },
		{ num: 2, label: "Commercial" },
		{ num: 3, label: "Technical" },
		{ num: 4, label: "Diagnostic" },
	];

	return (
		<section className="flex flex-col flex-1 px-6 pt-8 pb-6">
			<div className="flex items-start gap-3 mb-2">
				<div className="rounded-xl bg-primary/10 p-2.5">
					<CheckCircle className="h-5 w-5 text-primary" />
				</div>
				<div>
					<h3 className="font-display text-xl font-semibold tracking-tight">
						Complete Discovery
					</h3>
					<p className="text-sm text-muted-foreground mt-0.5 max-w-md">
						All four phases of information have been successfully gathered and
						all missing data is now complete for{" "}
						<strong className="text-foreground">
							Stream #WD-{String(total).padStart(3, "0")}
						</strong>
						. Confirming this step will transition the waste stream from a
						&lsquo;Draft&rsquo; status to the &lsquo;Proposals&rsquo; section
						for final generation.
					</p>
				</div>
			</div>

			{/* Phase grid */}
			<div className="grid grid-cols-2 gap-3 mt-6">
				{phases.map((phase) => (
					<div
						key={phase.num}
						className="rounded-xl bg-surface-container-low/50 p-4 flex items-center justify-between"
					>
						<div className="flex items-center gap-2.5">
							<CircleCheck className="size-5 text-primary" />
							<div>
								<p className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
									Phase {phase.num}
								</p>
								<p className="text-sm font-semibold">{phase.label}</p>
							</div>
						</div>
						<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
							Complete
						</span>
					</div>
				))}
			</div>

			{/* Footer */}
			<div className="mt-auto flex items-center justify-end gap-3 pt-6">
				<Button variant="ghost" onClick={onGoToDrafts}>
					Cancel
				</Button>
				<Button
					onClick={onGoToStreams}
					className="bg-gradient-to-r from-primary to-primary/90 shadow-water"
				>
					Confirm & Create Proposal →
				</Button>
			</div>
		</section>
	);
}

function ErrorView({
	error,
	onTryAgain,
	onClose,
}: {
	error: string;
	onTryAgain: () => void;
	onClose: () => void;
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
			</div>
		</div>
	);
}
