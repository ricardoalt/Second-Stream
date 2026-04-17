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
					)}
				>
					<div className="flex items-center justify-between w-full pr-1">
						<span className="text-sm font-semibold text-foreground tracking-tight">
							{group.title}
						</span>

						<span
							className={cn(
								"text-xs font-semibold tracking-tight mr-2",
								group.status === "complete" && "text-success",
								group.status === "review" && "text-warning",
								group.status === "incomplete" && "text-muted-foreground",
							)}
						>
							{group.statusText}
						</span>
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
