"use client";

import { BrainIcon, CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyUIMessage } from "@/types/ui-message";
import { Shimmer } from "./shimmer";

type UpdateWorkingMemoryPart = Extract<
	MyUIMessage["parts"][number],
	{ type: "tool-updateWorkingMemory" }
>;

type WorkingMemoryUpdateProps = {
	state: UpdateWorkingMemoryPart["state"];
	input?: UpdateWorkingMemoryPart["input"];
	className?: string;
};

function formatMemorySummary(
	memory: NonNullable<NonNullable<UpdateWorkingMemoryPart["input"]>["memory"]>,
): string {
	const parts: string[] = [];
	if (memory.summary) parts.push(memory.summary);
	const keyFactsCount =
		memory.keyFacts?.filter((fact): fact is string => typeof fact === "string")
			.length ?? 0;
	if (keyFactsCount > 0) parts.push(`${keyFactsCount} key facts`);
	const preferencesCount =
		memory.preferences?.filter(
			(fact): fact is string => typeof fact === "string",
		).length ?? 0;
	if (preferencesCount > 0) parts.push(`${preferencesCount} preferences`);
	return parts.length > 0 ? parts.join(" · ") : "memory updated";
}

export function WorkingMemoryUpdate({
	state,
	input,
	className,
}: WorkingMemoryUpdateProps) {
	if (state === "output-available") {
		return (
			<div
				className={cn(
					"text-muted-foreground flex items-center gap-1.5 text-xs",
					className,
				)}
			>
				<CheckIcon className="size-3.5" />
				<span>
					Remembered{" "}
					{input?.memory ? formatMemorySummary(input.memory) : "memory updated"}
				</span>
			</div>
		);
	}

	if (state === "output-error") {
		return (
			<div
				className={cn(
					"text-destructive flex items-center gap-1.5 text-xs",
					className,
				)}
			>
				<XIcon className="size-3.5" />
				<span>Failed to update memory</span>
			</div>
		);
	}

	// loading states: input-streaming, input-available
	return (
		<div className={cn("flex items-center gap-1.5 text-xs", className)}>
			<BrainIcon className="text-muted-foreground size-3.5" />
			<Shimmer as="span" className="text-xs">
				Updating memory...
			</Shimmer>
		</div>
	);
}
