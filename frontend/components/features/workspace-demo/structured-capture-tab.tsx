"use client";

import { SectionHeader } from "@/components/patterns/layout/section-header";
import { FieldGroup } from "./field-group";
import { DEMO_FIELD_GROUPS } from "./mock-data";

export function StructuredCaptureTab() {
	return (
		<div className="mt-7 max-w-4xl">
			<div className="mb-6">
				<SectionHeader
					title="Structured capture"
					subtitle="Operational fields extracted from evidence, linked to the brief. Edits are proposed updates and require review before handoff."
				/>
			</div>

			<div className="flex flex-col gap-0">
				{DEMO_FIELD_GROUPS.map((group) => (
					<FieldGroup key={group.id} group={group} />
				))}
			</div>
		</div>
	);
}
