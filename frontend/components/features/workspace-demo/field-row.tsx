"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
			<Input
				type="text"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder={placeholder}
				className="h-8 flex-1 text-[11.5px]"
			/>
			<Button
				type="button"
				size="sm"
				onClick={onClose}
				className="h-8 px-2.5 text-[10px]"
			>
				Save
			</Button>
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
						<div className="mb-1 flex items-center gap-1.5">
							<Badge variant="destructive-subtle" className="h-4 px-1 text-[8px] font-bold">
								En conflicto
							</Badge>
							<p className="text-[10.5px] font-medium text-destructive">{field.conflict}</p>
						</div>
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
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => setIsEditing((v) => !v)}
					className="h-6 px-2 text-[10px] font-semibold text-muted-foreground hover:text-primary mt-px"
				>
					{field.action}
				</Button>
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
