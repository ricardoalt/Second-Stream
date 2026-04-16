"use client";

import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
		<div className="mb-2 flex items-center gap-2.5 rounded-md border border-success/20 bg-success/[0.08] px-3 py-2 animate-in slide-in-from-bottom-2 duration-200">
			<svg
				width="12"
				height="12"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				className="text-success"
			>
				<title>Mapped</title>
				<path d="M3 8l3.5 3.5L13 4" />
			</svg>
			<p className="text-[10.5px] font-semibold text-success/90 shrink-0">
				Evidence mapped:
			</p>
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
				{result.mappedLabels.map((label, index) => (
					<Button
						key={result.mappedPoints[index]}
						type="button"
						variant="outline"
						size="sm"
						className="h-5 px-1.5 text-[9.5px] border-success/30 text-success bg-success/5 hover:bg-success/10"
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
				className="h-6 px-2 text-[10px]"
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
	const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);

	const isProcessing = captureState === "processing";
	const isMapped = captureState === "mapped";

	const contextualActions = useMemo(
		() => ["Request source check", "Flag inconsistency", "Create correction note"],
		[],
	);

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
		if (dismissTimerRef.current) {
			clearTimeout(dismissTimerRef.current);
		}
		setCaptureState("idle");
		setCaptureResult(null);
	}

	function handleSubmit() {
		if (!inputRef.current?.value.trim() && !isProcessing) return;
		runSimulation();
		if (inputRef.current) inputRef.current.value = "";
	}

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 px-6 py-2.5 backdrop-blur-sm">
			<div className="mx-auto max-w-[1400px]">
				{isMapped && captureResult ? (
					<MappedStrip
						result={captureResult}
						onPointSelect={onPointSelect}
						onDismiss={handleDismiss}
					/>
				) : null}

				<div className="rounded-xl border border-border/60 bg-surface-container-low px-3 py-2">
					<div className="mb-2 flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Badge variant="neutral-subtle" className="h-5 px-1.5 text-[10px] font-semibold">
								Global composer
							</Badge>
							<p className="text-[10.5px] text-muted-foreground">
								Response-first. Proposed changes require review.
							</p>
						</div>
						<div className="flex items-center gap-1.5">
							{contextualActions.map((action) => (
								<Button
									key={action}
									type="button"
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-[10px] text-muted-foreground"
								>
									{action}
								</Button>
							))}
						</div>
					</div>

					<Separator className="opacity-40" />

					<div className="mt-2 flex items-center gap-2">
						<Input
							ref={inputRef}
							type="text"
							disabled={isProcessing}
							placeholder={
								isProcessing
									? "Analyzing and preparing suggested changes..."
									: "Ask a question or propose a change with source references..."
							}
							onKeyDown={(event) => {
								if (event.key === "Enter") handleSubmit();
							}}
							className={cn("h-8 text-[12.5px]", isProcessing && "opacity-60")}
						/>

						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 px-2 text-[11px]"
							disabled={isProcessing}
						>
							Attach
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-8 px-2 text-[11px]"
							disabled={isProcessing}
						>
							Voice
						</Button>
						<Button type="button" size="sm" className="h-8 px-3 text-[11px]" onClick={handleSubmit}>
							{isProcessing ? <Spinner className="h-3 w-3" /> : "Propose"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
