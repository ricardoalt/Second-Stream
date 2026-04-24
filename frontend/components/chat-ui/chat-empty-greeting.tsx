"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const PROMPTS = [
	"Analyze waste compliance reports",
	"Identify treatment opportunities",
	"Review lab results and SDS data",
	"Evaluate vendor performance",
	"Compare disposal cost scenarios",
] as const;

const CHAR_TYPING_MS = 38;
const CHAR_ERASING_MS = 22;
const PAUSE_AFTER_TYPED_MS = 2800;
const PAUSE_AFTER_ERASED_MS = 400;

/**
 * Isolated perpetual typewriter greeting for the chat empty state.
 * Uses requestAnimationFrame-driven intervals to avoid React re-render cost.
 * The headline is static; only the cycling subtitle animates.
 */
export function ChatEmptyGreeting() {
	const [displayText, setDisplayText] = useState("");
	const [promptIndex, setPromptIndex] = useState(0);
	const [showCursor, setShowCursor] = useState(true);
	const phaseRef = useRef<"typing" | "paused" | "erasing" | "waiting">(
		"typing",
	);
	const charIndexRef = useRef(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	useEffect(() => {
		const currentPrompt = PROMPTS[promptIndex];
		if (!currentPrompt) return;

		const tick = () => {
			const phase = phaseRef.current;

			if (phase === "typing") {
				const nextChar = charIndexRef.current + 1;
				if (nextChar <= currentPrompt.length) {
					charIndexRef.current = nextChar;
					setDisplayText(currentPrompt.slice(0, nextChar));
					timerRef.current = setTimeout(tick, CHAR_TYPING_MS);
				} else {
					phaseRef.current = "paused";
					timerRef.current = setTimeout(tick, PAUSE_AFTER_TYPED_MS);
				}
			} else if (phase === "paused") {
				phaseRef.current = "erasing";
				timerRef.current = setTimeout(tick, CHAR_ERASING_MS);
			} else if (phase === "erasing") {
				const nextChar = charIndexRef.current - 1;
				if (nextChar >= 0) {
					charIndexRef.current = nextChar;
					setDisplayText(currentPrompt.slice(0, nextChar));
					timerRef.current = setTimeout(tick, CHAR_ERASING_MS);
				} else {
					phaseRef.current = "waiting";
					timerRef.current = setTimeout(tick, PAUSE_AFTER_ERASED_MS);
				}
			} else if (phase === "waiting") {
				phaseRef.current = "typing";
				charIndexRef.current = 0;
				setPromptIndex((prev) => (prev + 1) % PROMPTS.length);
			}
		};

		phaseRef.current = "typing";
		charIndexRef.current = 0;
		timerRef.current = setTimeout(tick, PAUSE_AFTER_ERASED_MS);

		return clearTimer;
	}, [promptIndex, clearTimer]);

	// Cursor blink — pure interval, no React state churn
	useEffect(() => {
		const interval = setInterval(() => {
			setShowCursor((prev) => !prev);
		}, 530);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex flex-col items-center gap-3 select-none">
			<motion.h1
				initial={{ opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
				className="font-display text-4xl font-semibold tracking-tight text-foreground"
			>
				Start a new stream
			</motion.h1>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.2 }}
				className="flex h-7 items-center justify-center"
				aria-live="polite"
				aria-label="Example prompts"
			>
				<span className="text-base text-muted-foreground">{displayText}</span>
				<span
					className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[1px] rounded-full bg-primary"
					style={{ opacity: showCursor ? 1 : 0 }}
					aria-hidden="true"
				/>
			</motion.div>
		</div>
	);
}
