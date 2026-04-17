"use client";

import { ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BriefPointRow } from "./brief-point-row";
import {
	type BriefChange,
	type BriefSection,
	DEMO_BRIEF_SECTIONS,
	DEMO_BRIEF_VERSIONS,
	DEMO_EXEC_SUMMARY,
	DEMO_PROVENANCE_SUMMARY,
	DEMO_STREAM,
} from "./mock-data";
import { RecommendedActions } from "./recommended-actions";

// ── VersionTrigger ────────────────────────────────────────────────────────────
// Ghost button — opens version history on demand. One trigger, not three Badges.

function VersionTrigger() {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 font-normal"
				>
					<span className="font-mono">{DEMO_STREAM.briefVersion}</span>
					<span>·</span>
					<span>{DEMO_STREAM.briefTime}</span>
					<ChevronDown className="size-3 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 p-3">
				<p className="text-xs uppercase tracking-[0.08em] text-secondary font-semibold mb-2.5">
					Version history
				</p>
				<div className="space-y-0">
					{DEMO_BRIEF_VERSIONS.map((version, i) => (
						<div
							key={version.id}
							className={cn(
								"flex items-start gap-2.5 py-2",
								i < DEMO_BRIEF_VERSIONS.length - 1 &&
									"border-b border-border/30",
							)}
						>
							<Badge
								variant={
									version.status === "current"
										? "primary-subtle"
										: version.status === "review"
											? "warning-subtle"
											: "neutral-subtle"
								}
								className="h-5 px-1.5 text-[9px] font-semibold flex-shrink-0 mt-0.5"
							>
								{version.label}
							</Badge>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-medium text-foreground leading-snug">
									{version.summary}
								</p>
								<p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
									{version.time}
								</p>
							</div>
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

// ── SectionStat ───────────────────────────────────────────────────────────────
// Inline review count — appears only when a section has review/conflict items.

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
			{reviewCount} to review
		</Badge>
	);
}

// ── DiscoveryBrief ────────────────────────────────────────────────────────────
// The living dossier — dominant artifact, not a summary card.

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
		<Card className="bg-surface-container-lowest shadow-sm">
			<CardHeader className="px-6 py-5 pb-4">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 min-w-0">
						<CardTitle className="font-display text-xl font-semibold tracking-tight text-foreground">
							Discovery Brief
						</CardTitle>
						<CardDescription className="mt-1 text-sm leading-relaxed">
							{DEMO_EXEC_SUMMARY.lead}
						</CardDescription>
					</div>
					<div className="flex-shrink-0">
						<VersionTrigger />
					</div>
				</div>
			</CardHeader>

			<Separator className="opacity-50" />

			<CardContent className="px-6 py-5">
				{/* Operational blocker — shown only when there's a real blocker */}
				<Alert variant="warning" className="mb-5 py-3">
					<AlertDescription className="text-sm font-medium">
						{DEMO_EXEC_SUMMARY.flag}
					</AlertDescription>
				</Alert>

				{/* Brief sections */}
				{DEMO_BRIEF_SECTIONS.map((section, sectionIndex) => (
					<div key={section.label}>
						{sectionIndex > 0 && <Separator className="my-5" />}

						<div className="flex items-center mb-3">
							<p className="text-xs uppercase tracking-[0.08em] text-secondary font-semibold">
								{section.label}
							</p>
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
									provenance={DEMO_PROVENANCE_SUMMARY[point.id]}
								/>
							))}
						</div>
					</div>
				))}

				<Separator className="mt-6 mb-1" />
				<RecommendedActions />
			</CardContent>
		</Card>
	);
}
