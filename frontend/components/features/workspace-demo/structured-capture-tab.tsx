"use client";

import { cn } from "@/lib/utils";
import { FieldGroup } from "./field-group";
import { DEMO_FIELD_GROUPS } from "./mock-data";

// ── StructuredCaptureTab ─────────────────────────────────────────────────────
// Secondary tab — structured data populated from evidence and the Discovery Brief.
// Width normalized to platform standard (max-w-2xl) and uses real accordion primitives.

export function StructuredCaptureTab() {
	return (
		<div className={cn("mt-7 max-w-2xl")}>
			{/* Intro */}
			<p className={cn("text-sm text-muted-foreground mb-5 leading-relaxed")}>
				Structured data populated from evidence and the Discovery Brief. Edit
				any field directly — changes sync back to the brief automatically.
			</p>

			{/* Field groups */}
			<div className="flex flex-col gap-0">
				{DEMO_FIELD_GROUPS.map((group) => (
					<FieldGroup key={group.id} group={group} />
				))}
			</div>
		</div>
	);
}
