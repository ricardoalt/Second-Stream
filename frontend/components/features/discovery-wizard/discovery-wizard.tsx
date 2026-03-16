"use client";

import {
	AlertCircle,
	CheckCircle,
	FileSpreadsheet,
	FileText,
	Image,
	MapPin,
	Mic,
	Plus,
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
import { discoverySessionsAPI } from "@/lib/api/discovery-sessions";
import { routes } from "@/lib/routes";
import { useDashboardActions } from "@/lib/stores/dashboard-store";
import type { DiscoverySessionResult } from "@/lib/types/discovery";

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

type WizardPhase = "idle" | "submitting" | "processing" | "result" | "error";

interface DiscoveryWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultCompanyId?: string;
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
}: DiscoveryWizardProps): ReactElement {
	// ── State ──
	const [phase, setPhase] = useState<WizardPhase>("idle");
	const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
	const [files, setFiles] = useState<File[]>([]);
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const [text, setText] = useState("");
	const [result, setResult] = useState<DiscoverySessionResult | null>(null);
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
	const { switchBucket } = useDashboardActions();
	const trimmedText = text.trim();
	const hasValidTextSource = trimmedText.length >= MIN_DISCOVERY_TEXT_LENGTH;

	// ── Derived ──
	const canDiscover =
		companyId !== "" &&
		(files.length > 0 || audioFile !== null || hasValidTextSource);
	const isBlocking = phase === "submitting" || phase === "processing";

	// ── Sync defaultCompanyId on open ──
	useEffect(
		function syncCompanyIdOnOpen() {
			if (open && defaultCompanyId) {
				setCompanyId(defaultCompanyId);
			}
		},
		[open, defaultCompanyId],
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
	}, []);

	// ── Navigate to dashboard ──
	const handleGoToDashboard = useCallback(() => {
		switchBucket("needs_confirmation");
		onOpenChange(false);
		router.push(routes.dashboard);
	}, [switchBucket, onOpenChange, router]);

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
				className="discovery-wizard-dialog max-w-[540px] min-h-[480px] p-0 gap-0 overflow-hidden rounded-2xl shadow-water-lg"
				showCloseButton={!isBlocking}
			>
				<div
					key={phase}
					className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col min-h-[480px]"
				>
					{phase === "idle" && (
						<IdleView
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

					{(phase === "submitting" || phase === "processing") && (
						<ProcessingView phase={phase} />
					)}

					{phase === "result" && result && (
						<ResultView result={result} onGoToDashboard={handleGoToDashboard} />
					)}

					{phase === "error" && (
						<ErrorView
							error={error}
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

	return (
		<div className="flex flex-col flex-1">
			{/* Header */}
			<div className="px-6 pt-6 pb-4">
				<h2 className="font-display text-lg font-semibold tracking-tight">
					Discovery Wizard
				</h2>
				<p className="text-sm text-muted-foreground/80 mt-0.5">
					Upload files, record audio, or describe waste streams
				</p>
			</div>

			{/* Drop zone */}
			<div className="px-6">
				{/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone requires drag event handlers */}
				<div
					className={`relative rounded-xl border transition-all duration-300 ${
						dragActive
							? "border-primary/30 bg-gradient-to-br from-primary/[0.08] to-primary/[0.06] shadow-glow ring-2 ring-primary/30"
							: "border-border/30 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02]"
					}`}
					onDragEnter={onDragEnter}
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
				>
					{hasAttachments ? (
						<div className="p-4 space-y-3">
							{/* File chips */}
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
												onClick={() => onRemoveFile(index)}
												className="ml-0.5 rounded-sm p-0.5 hover:bg-muted opacity-0 group-hover/chip:opacity-100 transition-opacity"
											>
												<X className="h-3 w-3" />
											</button>
										</div>
									);
								})}

								{audioFile && (
									<div className="group/chip flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-sm shadow-sm hover:shadow-md transition-all">
										<Mic className="h-3.5 w-3.5 text-primary shrink-0" />
										<span className="truncate max-w-[140px]">
											{audioFile.name}
										</span>
										<span className="text-xs text-muted-foreground">
											{formatSize(audioFile.size)}
										</span>
										<button
											type="button"
											onClick={onRemoveAudio}
											className="ml-0.5 rounded-sm p-0.5 hover:bg-muted opacity-0 group-hover/chip:opacity-100 transition-opacity"
										>
											<X className="h-3 w-3" />
										</button>
									</div>
								)}

								{/* Add more — icon button */}
								{files.length < MAX_FILES && (
									<Button
										variant="outline"
										size="icon"
										className="h-9 w-9 border-dashed"
										onClick={() => fileInputRef.current?.click()}
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
							className="flex w-full flex-col items-center gap-3 px-6 py-12 text-center"
							onClick={() => fileInputRef.current?.click()}
						>
							{/* Overlapping file-type icons */}
							<div className="flex items-center -space-x-2">
								<FileText className="h-6 w-6 text-muted-foreground/40" />
								<FileSpreadsheet className="h-6 w-6 text-muted-foreground/40 relative z-10" />
								<Image className="h-6 w-6 text-muted-foreground/40" />
							</div>
							<div>
								<p className="font-display font-medium text-sm">Upload Files</p>
								<p className="text-xs text-muted-foreground/50 mt-0.5">
									Drag or upload a file
								</p>
							</div>
						</button>
					)}
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
					const selected = Array.from(e.target.files ?? []);
					if (selected.length > 0) onFilesSelected(selected);
					e.target.value = "";
				}}
			/>
			<input
				ref={audioInputRef}
				type="file"
				accept={ACCEPTED_AUDIO_TYPES}
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) onAudioSelected(file);
					e.target.value = "";
				}}
			/>

			{/* Thin divider */}
			<div className="px-6 py-3">
				<div className="h-px bg-border/30" />
			</div>

			{/* Text area */}
			<div className="px-6 pb-4">
				<label
					htmlFor="discovery-text-input"
					className="block text-xs font-medium text-muted-foreground/70 uppercase tracking-wide mb-2"
				>
					Or describe what you know
				</label>
				<textarea
					id="discovery-text-input"
					placeholder="Paste notes, waste descriptions, or any relevant text..."
					className="w-full min-h-[80px] resize-none rounded-lg bg-muted/20 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:bg-muted/30 focus:outline-none transition-colors"
					value={text}
					onChange={(e) => onTextChange(e.target.value)}
				/>
				{trimmedText.length > 0 &&
					trimmedText.length < MIN_DISCOVERY_TEXT_LENGTH && (
						<p className="mt-2 text-xs text-muted-foreground">
							Add at least {MIN_DISCOVERY_TEXT_LENGTH} characters to submit
							text.
						</p>
					)}
			</div>

			{/* Footer — pushed to bottom */}
			<div className="mt-auto flex items-center gap-3 border-t border-border/20 bg-muted/20 px-6 py-4">
				<div className="flex-1 min-w-0">
					{defaultCompanyId ? (
						<div className="text-sm text-muted-foreground">
							Company pre-selected
						</div>
					) : (
						<CompanyCombobox
							value={companyId}
							onValueChange={onCompanyChange}
							placeholder="Select company..."
							showCreate={false}
						/>
					)}
				</div>

				<Button
					variant="ghost"
					className="shrink-0"
					onClick={() => audioInputRef.current?.click()}
					disabled={audioFile !== null}
				>
					<Mic className="h-4 w-4 mr-2" />
					Audio
				</Button>

				<Button
					onClick={onDiscover}
					disabled={!canDiscover}
					className="shrink-0 bg-gradient-to-r from-primary to-primary/90 shadow-water hover:shadow-glow transition-shadow duration-300"
				>
					<Waves className="h-4 w-4 mr-2" />
					Discover
				</Button>
			</div>
		</div>
	);
}

function ProcessingView({ phase }: { phase: "submitting" | "processing" }) {
	const messages =
		phase === "submitting" ? ["Analyzing your inputs..."] : PROCESSING_MESSAGES;
	const { message, index } = useRotatingMessage(messages, MESSAGE_CYCLE_MS);

	return (
		<div className="flex flex-col items-center justify-center flex-1 px-6 py-20">
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
		</div>
	);
}

function ResultView({
	result,
	onGoToDashboard,
}: {
	result: DiscoverySessionResult;
	onGoToDashboard: () => void;
}) {
	const stats = [
		{
			icon: MapPin,
			label: "locations found",
			count: result.summary.locationsFound,
			color: "bg-emerald-500/10 text-emerald-600",
		},
		{
			icon: Waves,
			label: "waste streams",
			count: result.summary.wasteStreamsFound,
			color: "bg-emerald-500/10 text-emerald-600",
		},
		{
			icon: FileText,
			label: "drafts for review",
			count: result.summary.draftsNeedingConfirmation,
			color: "bg-emerald-500/10 text-emerald-600",
		},
	];

	return (
		<div className="flex flex-col flex-1">
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
				<p className="text-sm text-muted-foreground mb-8">
					{result.status === "partial_failure"
						? "Some sources had issues, but drafts were created"
						: "Drafts have been created from your inputs"}
				</p>

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
				</div>

				{/* CTA — full-width at bottom */}
				<Button
					onClick={onGoToDashboard}
					className="w-full max-w-sm mt-auto bg-emerald-600 hover:bg-emerald-700 text-white"
				>
					Go to dashboard
				</Button>
			</div>
		</div>
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

function ErrorView({
	error,
	onTryAgain,
	onClose,
}: {
	error: string | null;
	onTryAgain: () => void;
	onClose: () => void;
}) {
	return (
		<div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center flex-1 px-6 py-12">
			<div className="rounded-full bg-destructive/10 p-4 mb-4">
				<AlertCircle className="h-8 w-8 text-destructive" />
			</div>

			<h3 className="font-display text-lg font-semibold tracking-tight mb-1">
				Something went wrong
			</h3>
			<p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
				{error ?? "An unexpected error occurred"}
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
