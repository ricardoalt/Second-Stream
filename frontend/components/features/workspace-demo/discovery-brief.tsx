"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BriefPointRow } from "./brief-point-row";
import {
	type BriefChange,
	type BriefSection,
	DEMO_BRIEF_SECTIONS,
	DEMO_STREAM,
} from "./mock-data";
import { RecommendedActions, SectionLabel } from "./recommended-actions";

// ── SectionStat ───────────────────────────────────────────────────────────────
// Badge next to section label — shows urgency without a separate banner.

function SectionStat({ section }: { section: BriefSection }) {
	const reviewCount = section.points.filter(
		(p) => p.state === "needs-review" || p.state === "conflict",
	).length;

	if (reviewCount === 0) return null;

	const hasConflict = section.points.some((p) => p.state === "conflict");

	return (
		<Badge
			variant={hasConflict ? "destructive-subtle" : "warning-subtle"}
			className="ml-2 text-[8.5px] font-bold tracking-[0.02em] px-1.5 py-0 h-4"
		>
			{reviewCount} review
		</Badge>
	);
}

// ── DiscoveryBrief ─────────────────────────────────────────────────────────
// The central artifact surface. Uses Card primitive so it sits on bg-card
// and reads as a real product document, not editorial HTML.

interface DiscoveryBriefProps {
	selectedPointId: string | null;
	onPointSelect: (id: string) => void;
	changesByPointId: Record<string, BriefChange>;
}

export function DiscoveryBrief({
	selectedPointId,
	onPointSelect,
	changesByPointId,
}: DiscoveryBriefProps) {
	return (
		<Card className="shadow-xs">
			{/* Brief header — version + timestamp, visually quiet */}
			<CardHeader className="px-5 py-3.5 pb-3">
				<div className="flex items-center justify-between">
					<span
						className={cn(
							"text-[10px] font-bold uppercase tracking-[0.12em]",
							"text-muted-foreground/70",
						)}
					>
						Discovery Brief
					</span>
					<span className="text-[10px] text-muted-foreground/60 font-mono tracking-[0.01em]">
						{DEMO_STREAM.briefVersion} · {DEMO_STREAM.briefTime}
					</span>
				</div>
			</CardHeader>

			<Separator className="opacity-50" />

			<CardContent className="px-5 py-4">
				{/* Brief sections */}
				{DEMO_BRIEF_SECTIONS.map((section, sectionIndex) => (
					<div key={section.label}>
						{/* Section separator — not before first section */}
						{sectionIndex > 0 && <Separator className="my-5 opacity-30" />}

						{/* Section label + count badge */}
						<div className="flex items-center mb-3">
							<SectionLabel>{section.label}</SectionLabel>
							<SectionStat section={section} />
						</div>

						<div>
							{section.points.map((point) => (
								<BriefPointRow
									key={point.id}
									point={point}
									isSelected={selectedPointId === point.id}
									onSelect={onPointSelect}
									change={changesByPointId[point.id]}
								/>
							))}
						</div>
					</div>
				))}

				{/* Recommended next actions */}
				<Separator className="mt-6 mb-1 opacity-30" />
				<RecommendedActions />
			</CardContent>
		</Card>
	);
}
