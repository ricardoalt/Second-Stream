"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BriefPointRow } from "./brief-point-row";
import {
	type BriefChange,
	type BriefSection,
	DEMO_BRIEF_VERSIONS,
	DEMO_BRIEF_SECTIONS,
	DEMO_PROVENANCE_SUMMARY,
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
	const activePoint = DEMO_BRIEF_SECTIONS.flatMap((section) => section.points).find(
		(point) => point.id === selectedPointId,
	);
	const activeProvenance =
		(activePoint && DEMO_PROVENANCE_SUMMARY[activePoint.id]) ?? null;

	return (
		<Card className="shadow-xs border-border/70">
			{/* Brief header — version + timestamp, visually quiet */}
			<CardHeader className="px-6 py-4 pb-3">
				<div className="flex items-start justify-between gap-4">
					<div>
						<span
							className={cn(
								"text-[10px] font-bold uppercase tracking-[0.12em]",
								"text-muted-foreground/70",
							)}
						>
							Discovery Brief
						</span>
						<h2 className="mt-1 font-display text-[1.2rem] font-semibold tracking-tight text-foreground leading-tight">
							Current working dossier
						</h2>
						<p className="text-[12px] text-muted-foreground mt-1">
							Human-reviewed artifact. AI proposes edits; nothing mutates silently.
						</p>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap justify-end">
						{DEMO_BRIEF_VERSIONS.map((version) => (
							<Badge
								key={version.id}
								variant={
									version.status === "current"
										? "primary-subtle"
										: version.status === "review"
											? "warning-subtle"
											: "neutral-subtle"
								}
								className="h-5 px-1.5 text-[10px] font-semibold"
							>
								{version.label} · {version.time}
							</Badge>
						))}
					</div>
				</div>
			</CardHeader>

			<Separator className="opacity-50" />

			<CardContent className="px-6 py-4">
				<div className="mb-4 rounded-lg border border-border/50 bg-surface-container-low px-3 py-2.5">
					<div className="flex items-center justify-between gap-3">
						<p className="text-[11px] font-semibold text-foreground tracking-tight">
							Version trail and review state
						</p>
						<span className="font-mono text-[10px] text-muted-foreground/60">
							{DEMO_STREAM.briefVersion} · {DEMO_STREAM.briefTime}
						</span>
					</div>
					<div className="mt-2 flex flex-wrap items-center gap-1.5">
						{DEMO_BRIEF_VERSIONS.map((version) => (
							<div
								key={`summary-${version.id}`}
								className="text-[10.5px] text-muted-foreground"
							>
								<span className="font-semibold text-foreground/90">{version.label}</span>
								<span className="mx-1 text-muted-foreground/50">·</span>
								{version.summary}
							</div>
						))}
					</div>
				</div>

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

				{activePoint && (
					<>
						<Separator className="mt-6 mb-3 opacity-30" />
						<div className="rounded-lg border border-border/50 bg-surface-container-low px-3 py-2.5">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">
										Selected point provenance
									</p>
									<p className="text-[12px] font-semibold text-foreground mt-1 leading-snug">
										{activePoint.text}
									</p>
								</div>
								<Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
									Propose revision
								</Button>
							</div>
							<div className="mt-2 flex flex-wrap gap-1.5">
								{(activeProvenance ?? ["No direct sources attached yet"]).map(
									(item) => (
										<Badge
											key={item}
											variant="neutral-subtle"
											className="h-5 px-1.5 text-[9.5px] font-medium"
										>
											{item}
										</Badge>
									),
								)}
							</div>
						</div>
					</>
				)}

				{/* Recommended next actions */}
				<Separator className="mt-6 mb-1 opacity-30" />
				<RecommendedActions />
			</CardContent>
		</Card>
	);
}
