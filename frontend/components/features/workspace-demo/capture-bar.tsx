"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
	type CaptureResult,
	type CaptureState,
	DEMO_CAPTURE_RESULT,
} from "./mock-data";

// ── MappedStrip ───────────────────────────────────────────────────────────────
// Feedback strip shown above the dock after evidence is mapped to brief.

function MappedStrip({
	result,
	onPointSelect,
	onDismiss,
}: {
	result: CaptureResult;
	onPointSelect: (id: string) => void;
	onDismiss: () => void;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-2.5 px-3.5 py-2 mb-1.5",
				"bg-success/[0.06] border-l-2 border-success rounded-r-lg",
				"animate-in slide-in-from-bottom-2 duration-200",
			)}
		>
			{/* Check icon */}
			<svg
				width="11"
				height="11"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="text-success flex-shrink-0"
			>
				<title>Mapped</title>
				<path d="M3 8l3.5 3.5L13 4" />
			</svg>
			<span className="text-[10.5px] font-medium text-success/90 flex-shrink-0">
				Mapped to brief:
			</span>
			<div className="flex items-center gap-1.5 flex-1 flex-wrap">
				{result.mappedLabels.map((label, i) => (
					<button
						key={result.mappedPoints[i]}
						type="button"
						onClick={() => onPointSelect(result.mappedPoints[i] ?? "")}
						className={cn(
							"text-[10.5px] font-semibold px-2 py-px rounded",
							"bg-success/[0.1] text-success border border-success/20",
							"hover:bg-success/[0.18] transition-colors duration-75 font-sans",
						)}
					>
						{label}
					</button>
				))}
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				aria-label="Dismiss"
				onClick={onDismiss}
				className="h-5 w-5 p-0 text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0"
			>
				<svg
					width="8"
					height="8"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<title>Dismiss</title>
					<path d="M2 2l12 12M14 2L2 14" />
				</svg>
			</Button>
		</div>
	);
}

// ── CaptureBar ────────────────────────────────────────────────────────────────
// Fixed ingest dock — feels like adding evidence/context, not opening a chat.
// State machine: idle → processing → mapped
// Uses Input + Button primitives for consistency with platform.

interface CaptureBarProps {
	onPointSelect: (id: string) => void;
}

export function CaptureBar({ onPointSelect }: CaptureBarProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [captureState, setCaptureState] = useState<CaptureState>("idle");
	const [captureResult, setCaptureResult] = useState<CaptureResult | null>(
		null,
	);
	const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isProcessing = captureState === "processing";
	const isMapped = captureState === "mapped";

	function runSimulation() {
		if (isProcessing) return;
		setCaptureState("processing");
		setTimeout(() => {
			setCaptureResult(DEMO_CAPTURE_RESULT);
			setCaptureState("mapped");
			// Auto-dismiss after 6s
			dismissTimerRef.current = setTimeout(() => {
				setCaptureState("idle");
				setCaptureResult(null);
			}, 6000);
		}, 2000);
	}

	function handleDismiss() {
		if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
		setCaptureState("idle");
		setCaptureResult(null);
	}

	function handleSubmit() {
		if (!inputRef.current?.value.trim() && !isProcessing) return;
		runSimulation();
		if (inputRef.current) inputRef.current.value = "";
	}

	function handleVoice() {
		runSimulation();
	}

	return (
		<div
			className={cn(
				"fixed bottom-0 left-0 right-0 z-50",
				"bg-card border-t border-border/60",
				// Match AgentShell main content horizontal padding
				"px-6 py-2.5",
			)}
		>
			<div className="mx-auto max-w-[1400px] flex flex-col gap-0">
				{/* Mapped strip — slides up above dock */}
				{isMapped && captureResult && (
					<MappedStrip
						result={captureResult}
						onPointSelect={onPointSelect}
						onDismiss={handleDismiss}
					/>
				)}

				{/* Indeterminate progress — thin line when processing */}
				{isProcessing && (
					<div className="w-full h-[2px] bg-primary/10 rounded-full overflow-hidden mb-2">
						<div
							className={cn(
								"h-full bg-primary/60 rounded-full",
								"animate-[progress-indeterminate_1.4s_ease-in-out_infinite]",
							)}
							style={{ width: "40%" }}
						/>
					</div>
				)}

				{/* Dock row */}
				<div className="flex items-center gap-2">
					{/* Dock label */}
					<Badge
						variant="neutral-subtle"
						className="text-[10px] font-semibold whitespace-nowrap shrink-0 h-6"
					>
						Add to stream
					</Badge>

					{/* Main input — uses platform Input primitive */}
					<Input
						ref={inputRef}
						type="text"
						disabled={isProcessing}
						placeholder={
							isProcessing
								? "Processing evidence..."
								: "Paste text, drop a file, or type a note..."
						}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSubmit();
						}}
						className={cn(
							"flex-1 h-8 text-[12.5px]",
							isProcessing && "opacity-50 cursor-not-allowed",
						)}
					/>

					{/* Upload affordance */}
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label="Upload file"
						title="Upload file"
						disabled={isProcessing}
						className="h-8 w-8 p-0"
					>
						<svg
							width="13"
							height="13"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						>
							<title>Upload</title>
							<path d="M8 10V3m0 0L5.5 5.5M8 3l2.5 2.5" />
							<path d="M3 12h10" />
						</svg>
					</Button>

					{/* Voice affordance */}
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label="Voice note"
						title="Voice note"
						onClick={handleVoice}
						disabled={isProcessing}
						className="h-8 w-8 p-0"
					>
						<svg
							width="13"
							height="13"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						>
							<title>Voice</title>
							<rect x="6" y="2" width="4" height="7" rx="2" />
							<path d="M4 8a4 4 0 0 0 8 0" />
							<path d="M8 13v1" />
						</svg>
					</Button>

					{/* Submit */}
					<Button
						type="button"
						size="sm"
						aria-label="Submit evidence"
						title="Submit"
						onClick={handleSubmit}
						disabled={isProcessing}
						className="h-8 w-8 p-0"
					>
						{isProcessing ? (
							<Spinner className="h-3 w-3" />
						) : (
							<svg
								width="13"
								height="13"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Submit</title>
								<path d="M14 2 2 8l5 2 2 5z" />
							</svg>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
