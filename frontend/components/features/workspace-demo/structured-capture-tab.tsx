"use client";

import { cn } from "@/lib/utils";
import { FieldGroup } from "./field-group";
import { DEMO_FIELD_GROUPS } from "./mock-data";

// ── StructuredCaptureTab ─────────────────────────────────────────────────────
// Secondary tab — structured data populated from evidence and the Discovery Brief.
// Width normalized to platform standard (max-w-2xl) and uses real accordion primitives.

export function StructuredCaptureTab() {
	return (
		<div className={cn("mt-7 max-w-3xl")}>
			{/* Intro */}
			<div className="mb-5 rounded-lg border border-border/60 bg-surface-container-low px-4 py-3">
				<p className={cn("text-sm text-foreground font-medium leading-relaxed")}>
					Structured Capture
				</p>
				<p className={cn("text-[12px] text-muted-foreground mt-1 leading-relaxed")}>
					Operational fields extracted from evidence and linked to the working brief.
					Edits are proposed updates and should be reviewed before final handoff.
				</p>
			</div>

			{/* Field groups */}
			<div className="flex flex-col gap-0">
				{DEMO_FIELD_GROUPS.map((group) => (
					<FieldGroup key={group.id} group={group} />
				))}
			</div>
		</div>
	);
}
