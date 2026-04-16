"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StructuredField } from "./mock-data";

// ── SourceTag ─────────────────────────────────────────────────────────────────

function SourceTag({ type }: { type: "AI" | "UPLOADED" | "MANUAL" }) {
	return (
		<span
			className={cn(
				"text-[7.5px] font-bold uppercase tracking-[0.04em]",
				"px-1 py-px rounded-[2px]",
				type === "AI" && "text-primary bg-primary/8",
				(type === "UPLOADED" || type === "MANUAL") &&
					"text-muted-foreground bg-foreground/5",
			)}
		>
			{type}
		</span>
	);
}

// ── InlineEditZone ────────────────────────────────────────────────────────────

function InlineEditZone({
	initialValue,
	placeholder,
	onClose,
}: {
	initialValue?: string | undefined;
	placeholder?: string | undefined;
	onClose: () => void;
}) {
	const [value, setValue] = useState(initialValue ?? "");

	return (
		<div className="flex items-center gap-1 mt-1.5">
			<input
				type="text"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={placeholder}
				className={cn(
					"flex-1 px-2 py-1 text-[11.5px] font-sans",
					"text-foreground border border-border rounded-md",
					"bg-background focus:outline-none focus:border-primary",
					"placeholder:text-muted-foreground/50",
					"transition-colors duration-100",
				)}
			/>
			<button
				type="button"
				onClick={onClose}
				className={cn(
					"px-2.5 py-1 text-[10px] font-semibold",
					"bg-foreground text-background rounded-md",
					"font-sans cursor-pointer border-none",
					"hover:bg-foreground/90 transition-colors",
				)}
			>
				Save
			</button>
		</div>
	);
}

// ── FieldRow ──────────────────────────────────────────────────────────────────
// Individual structured field row with inline edit support

interface FieldRowProps {
	field: StructuredField;
}

export function FieldRow({ field }: FieldRowProps) {
	const [isEditing, setIsEditing] = useState(false);

	return (
		<div className={cn("py-2.5 border-t border-border/25 first:border-t-0")}>
			<div className="flex items-start justify-between gap-2.5">
				{/* Label */}
				<span
					className={cn(
						"text-[11.5px] font-medium text-muted-foreground",
						"flex-shrink-0 w-[120px] mt-px",
					)}
				>
					{field.label}
				</span>

				{/* Value area */}
				<div className="flex-1 min-w-0">
					{field.conflict && (
						<p
							className={cn(
								"text-[10.5px] font-medium text-destructive mb-0.5",
								"flex items-center gap-1",
							)}
						>
							<span className="w-1 h-1 rounded-full bg-destructive flex-shrink-0 opacity-80" />
							{field.conflict}
						</p>
					)}
					<p
						className={cn(
							"text-[13px] font-medium leading-snug",
							field.empty
								? "text-muted-foreground/60 italic font-normal text-[12.5px]"
								: "text-foreground",
						)}
					>
						{field.value ?? "Not yet determined"}
					</p>
					{field.source && field.sourceType && (
						<p className="flex items-center gap-1 mt-0.5">
							<SourceTag type={field.sourceType} />
							<span className="text-[9.5px] text-muted-foreground/60">
								{field.source}
							</span>
						</p>
					)}
				</div>

				{/* Edit trigger */}
				<button
					type="button"
					onClick={() => setIsEditing((v) => !v)}
					className={cn(
						"text-[10px] font-medium text-muted-foreground",
						"cursor-pointer bg-transparent border-none",
						"hover:text-primary transition-colors duration-75",
						"font-sans flex-shrink-0 mt-px",
					)}
				>
					{field.action}
				</button>
			</div>

			{/* Inline edit zone */}
			{isEditing && (
				<InlineEditZone
					initialValue={field.empty ? undefined : field.value}
					placeholder={
						field.action === "Resolve"
							? "Correct value"
							: field.empty
								? `e.g. ${field.label.toLowerCase()}`
								: field.value
					}
					onClose={() => setIsEditing(false)}
				/>
			)}
		</div>
	);
}
