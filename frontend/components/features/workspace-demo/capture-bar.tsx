"use client";

import { Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
	type CaptureResult,
	type CaptureState,
	DEMO_CAPTURE_RESULT,
} from "./mock-data";

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
		<div className="mb-2 flex items-center gap-2.5 rounded-md border border-success/20 bg-success/[0.06] px-3 py-1.5 animate-in slide-in-from-bottom-2 duration-200">
			<svg
				width="11"
				height="11"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				className="text-success flex-shrink-0"
			>
				<title>Mapped</title>
				<path d="M3 8l3.5 3.5L13 4" />
			</svg>
			<p className="text-xs font-semibold text-success/90 shrink-0">
				Evidence mapped:
			</p>
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
				{result.mappedLabels.map((label, index) => (
					<Button
						key={result.mappedPoints[index]}
						type="button"
						variant="outline"
						size="sm"
						className="h-5 px-1.5 text-[10px] border-success/30 text-success bg-success/5 hover:bg-success/10"
						onClick={() => onPointSelect(result.mappedPoints[index] ?? "")}
					>
						{label}
					</Button>
				))}
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-6 px-2 text-xs"
				onClick={onDismiss}
			>
				Dismiss
			</Button>
		</div>
	);
}

interface CaptureBarProps {
	onPointSelect: (id: string) => void;
}

export function CaptureBar({ onPointSelect }: CaptureBarProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [captureState, setCaptureState] = useState<CaptureState>("idle");
	const [captureResult, setCaptureResult] = useState<CaptureResult | null>(
		null,
	);

	const isProcessing = captureState === "processing";
	const isMapped = captureState === "mapped";

	function runSimulation() {
		if (isProcessing) return;
		setCaptureState("processing");
		setTimeout(() => {
			setCaptureResult(DEMO_CAPTURE_RESULT);
			setCaptureState("mapped");
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

	return (
		<div className="fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-card/90 backdrop-blur-md px-6 py-3">
			<div className="mx-auto max-w-[1400px]">
				{isMapped && captureResult ? (
					<MappedStrip
						result={captureResult}
						onPointSelect={onPointSelect}
						onDismiss={handleDismiss}
					/>
				) : null}

				<div className="flex items-center gap-2">
					<Input
						ref={inputRef}
						type="text"
						disabled={isProcessing}
						placeholder={
							isProcessing
								? "Analyzing evidence and preparing suggested changes..."
								: "Ask a question or propose a change — SecondStream Analyst will respond and propose edits."
						}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleSubmit();
						}}
						className={cn("h-9 text-sm flex-1", isProcessing && "opacity-60")}
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						disabled={isProcessing}
						className="h-9 w-9 flex-shrink-0"
						aria-label="Attach file"
					>
						<Paperclip className="size-4" />
					</Button>
					<Button
						type="button"
						size="sm"
						className="h-9 px-4 text-sm flex-shrink-0"
						onClick={handleSubmit}
						disabled={isProcessing}
					>
						{isProcessing ? <Spinner className="h-4 w-4" /> : "Send"}
					</Button>
				</div>
			</div>
		</div>
	);
}
