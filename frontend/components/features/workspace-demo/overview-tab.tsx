"use client";

import { cn } from "@/lib/utils";
import { DiscoveryBrief } from "./discovery-brief";
import { EvidenceContextRail } from "./evidence-context-rail";
import { type BriefChange, DEMO_BRIEF_CHANGES } from "./mock-data";

// ── OverviewTab ───────────────────────────────────────────────────────────────
// Two-column layout at xl: artifact canvas (left) + sticky contextual rail (right).
// Brief IS the narrator — no loop-state widget above it.

interface OverviewTabProps {
	selectedPointId: string | null;
	onPointSelect: (id: string) => void;
}

export function OverviewTab({
	selectedPointId,
	onPointSelect,
}: OverviewTabProps) {
	const changesByPointId: Record<string, BriefChange> = Object.fromEntries(
		DEMO_BRIEF_CHANGES.map((c) => [c.pointId, c]),
	);

	return (
		<div
			className={cn("flex flex-col xl:grid xl:items-start gap-8 mt-7")}
			style={{ gridTemplateColumns: "1fr 280px" }}
		>
			<main className="min-w-0">
				<DiscoveryBrief
					selectedPointId={selectedPointId}
					onPointSelect={onPointSelect}
					changesByPointId={changesByPointId}
				/>
			</main>

			<aside className="mt-8 xl:mt-0">
				<EvidenceContextRail
					selectedPointId={selectedPointId}
					onSelectPoint={onPointSelect}
				/>
			</aside>
		</div>
	);
}
