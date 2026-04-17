"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { StructuredField } from "./mock-data";

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
				className="h-8 flex-1 text-sm"
			/>
			<Button
				type="button"
				size="sm"
				onClick={onClose}
				className="h-8 px-2.5 text-xs"
			>
				Save
			</Button>
		</div>
	);
}

interface FieldRowProps {
	field: StructuredField;
}

export function FieldRow({ field }: FieldRowProps) {
	const [isEditing, setIsEditing] = useState(false);

	return (
		<div className={cn("py-2.5 border-t border-border/25 first:border-t-0")}>
			<div className="flex items-start justify-between gap-2.5">
				<span className="text-sm font-medium text-muted-foreground flex-shrink-0 w-[120px] mt-px">
					{field.label}
				</span>

				<div className="flex-1 min-w-0">
					{field.conflict && (
						<div className="mb-1 flex items-center gap-1.5">
							<Badge
								variant="destructive-subtle"
								className="h-4 px-1 text-[8px] font-bold"
							>
								Conflict
							</Badge>
							<p className="text-xs font-medium text-destructive">
								{field.conflict}
							</p>
						</div>
					)}
					<p
						className={cn(
							"text-sm font-medium leading-snug",
							field.empty
								? "text-muted-foreground/60 italic font-normal"
								: "text-foreground",
						)}
					>
						{field.value ?? "Not yet determined"}
					</p>
					{field.source && field.sourceType && (
						<p className="flex items-center gap-1 mt-0.5">
							<SourceTag type={field.sourceType} />
							<span className="text-xs text-muted-foreground/60">
								{field.source}
							</span>
						</p>
					)}
				</div>

				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => setIsEditing((v) => !v)}
					className="mt-px"
				>
					{field.action}
				</Button>
			</div>

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
