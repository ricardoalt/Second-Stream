"use client";

import { cn } from "@/lib/utils";
import { DiscoveryBrief } from "./discovery-brief";
import { EvidenceContextRail } from "./evidence-context-rail";
import { FlowStateHeader } from "./flow-state-header";
import {
	type BriefChange,
	DEMO_BRIEF_CHANGES,
	DEMO_READINESS,
} from "./mock-data";

// ── OverviewTab ──────────────────────────────────────────────────────────────
// Desktop: two-column — artifact canvas (left) + sticky contextual rail (right).
// Mobile/tablet: single column (rail stacks below brief on small screens).
//
// Column ratios: flex-1 main | fixed-width rail (260px).
// Uses CSS grid with responsive breakpoint — XL gets the two-column layout.
// Right rail is strictly max 3 blocks: pending review / latest evidence / why changed.

interface OverviewTabProps {
	selectedPointId: string | null;
	onPointSelect: (id: string) => void;
}

export function OverviewTab({
	selectedPointId,
	onPointSelect,
}: OverviewTabProps) {
	// Build change lookup by pointId — passed into BriefPointRow
	const changesByPointId: Record<string, BriefChange> = Object.fromEntries(
		DEMO_BRIEF_CHANGES.map((c) => [c.pointId, c]),
	);

	return (
		<div
			className={cn(
				// Mobile: single column
				// xl: two-column — main canvas + sticky rail
				"flex flex-col xl:grid xl:items-start xl:gap-12 mt-7",
			)}
			style={{
				// XL: main grows, rail is fixed width
				gridTemplateColumns: "1fr 260px",
			}}
		>
			{/* ── Main column: loop state → artifact ── */}
			<main className="min-w-0">
				{/* Loop state header — what do I know, what changed, what needs review */}
				<FlowStateHeader
					readiness={DEMO_READINESS}
					onReviewNavigate={() => {
						// Navigate to first pending conflict item
						onPointSelect("solids");
					}}
				/>

				{/* Discovery Brief — the central artifact, above the fold */}
				<DiscoveryBrief
					selectedPointId={selectedPointId}
					onPointSelect={onPointSelect}
					changesByPointId={changesByPointId}
				/>
			</main>

			{/* ── Context rail — sticky, always active, drives review navigation ── */}
			<aside className="mt-8 xl:mt-0">
				<EvidenceContextRail
					selectedPointId={selectedPointId}
					onSelectPoint={onPointSelect}
				/>
			</aside>
		</div>
	);
}
