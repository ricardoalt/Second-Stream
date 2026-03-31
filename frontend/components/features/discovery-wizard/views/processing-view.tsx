"use client";

import { Waves } from "lucide-react";
import { useEffect, useState } from "react";

const PROCESSING_MESSAGES = [
	"Analyzing your inputs...",
	"Extracting waste stream data...",
	"Identifying locations...",
	"Matching contacts...",
	"Building draft proposals...",
];
const MESSAGE_CYCLE_MS = 3000;

function useRotatingMessage(messages: string[], intervalMs: number) {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setIndex((prev) => (prev + 1) % messages.length);
		}, intervalMs);
		return () => clearInterval(id);
	}, [messages.length, intervalMs]);

	return { message: messages[index] ?? messages[0], index };
}

export function ProcessingView() {
	const { message, index } = useRotatingMessage(
		PROCESSING_MESSAGES,
		MESSAGE_CYCLE_MS,
	);

	return (
		<section
			aria-label="Processing your inputs"
			className="flex flex-col items-center justify-center flex-1 px-6 py-20"
		>
			<div className="relative h-32 w-32 mb-8">
				<div className="absolute inset-0 rounded-full border-2 border-primary/15 animate-orbital-1">
					<div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary/30" />
				</div>
				<div className="absolute inset-4 rounded-full border-2 border-dashed border-primary/25 animate-orbital-2">
					<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary/40" />
				</div>
				<div className="absolute inset-8 rounded-full border border-primary/35 animate-orbital-3" />
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="animate-orbital-breathe bg-primary/10 rounded-full p-4">
						<Waves className="h-7 w-7 text-primary" />
					</div>
				</div>
			</div>

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
