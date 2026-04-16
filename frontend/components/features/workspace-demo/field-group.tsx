"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { FieldRow } from "./field-row";
import type { FieldGroup as FieldGroupType } from "./mock-data";

// ── Status Dot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: FieldGroupType["status"] }) {
	return (
		<span
			className={cn(
				"w-1 h-1 rounded-full flex-shrink-0",
				status === "complete" && "bg-success opacity-70",
				status === "review" && "bg-warning opacity-70",
				status === "incomplete" && "bg-muted-foreground opacity-30",
			)}
			aria-hidden
		/>
	);
}

// ── FieldGroup ────────────────────────────────────────────────────────────────
// Uses Radix Accordion for open/close behavior
// Translates v5 .field-group, .fg-header, .fg-body pattern

interface FieldGroupProps {
	group: FieldGroupType;
}

export function FieldGroup({ group }: FieldGroupProps) {
	return (
		<Accordion
			type="single"
			collapsible
			{...(group.defaultOpen ? { defaultValue: group.id } : {})}
			className="mb-1.5"
		>
			<AccordionItem
				value={group.id}
				className={cn(
					"border border-border/60 rounded-lg overflow-hidden",
					"bg-card",
				)}
			>
				<AccordionTrigger
					className={cn(
						"px-3.5 py-2.5 hover:no-underline hover:bg-foreground/[0.012]",
						"transition-colors duration-75",
						// Reset default accordion trigger styles
						"[&>svg]:hidden", // hide default chevron
					)}
				>
					<div className="flex items-center justify-between w-full pr-1">
						{/* Title */}
						<span
							className={cn(
								"text-[12.5px] font-semibold text-foreground tracking-tight",
							)}
						>
							{group.title}
						</span>

						{/* Right side: status + chevron */}
						<div className="flex items-center gap-2">
							<span
								className={cn(
									"flex items-center gap-1",
									"text-[9.5px] font-semibold tracking-[0.01em]",
									group.status === "complete" && "text-success",
									group.status === "review" && "text-warning",
									group.status === "incomplete" && "text-muted-foreground",
								)}
							>
								<StatusDot status={group.status} />
								{group.statusText}
							</span>

							{/* Custom chevron */}
							<svg
								width="10"
								height="10"
								viewBox="0 0 10 10"
								fill="none"
								className={cn(
									"text-muted-foreground opacity-50",
									"transition-transform duration-150",
									"[[data-state=open]_&]:rotate-90",
								)}
							>
								<title>Toggle</title>
								<path
									d="M3 2l4 3-4 3"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
					</div>
				</AccordionTrigger>

				<AccordionContent className="px-3.5 pb-3.5 pt-0">
					{group.fields.map((field) => (
						<FieldRow key={field.id} field={field} />
					))}
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
