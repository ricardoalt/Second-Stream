"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── Evidence item data ────────────────────────────────────────────────────────
// Minimal-real list of evidence documents attached to this stream.

interface EvidenceDoc {
	id: string;
	type: "PDF" | "DOC" | "NOTE" | "VOICE" | "PHOTO" | "EMAIL";
	name: string;
	summary: string;
	linkedPoints: string[];
	addedAt: string;
	addedBy: string;
}

const EVIDENCE_DOCS: EvidenceDoc[] = [
	{
		id: "ev-1",
		type: "PDF",
		name: "Lab Report #LR-884",
		summary:
			"Paint sludge analysis — solids 32%, pH 6.4, no ignitability markers",
		linkedPoints: ["material", "solids", "ph"],
		addedAt: "11:40 AM",
		addedBy: "M. Torres",
	},
	{
		id: "ev-2",
		type: "DOC",
		name: "Manifests Jan–Mar",
		summary: "Three transport manifests — volumes 42, 48, 50 tons",
		linkedPoints: ["volume", "frequency"],
		addedAt: "11:35 AM",
		addedBy: "M. Torres",
	},
	{
		id: "ev-3",
		type: "DOC",
		name: "Manifest #TM-220",
		summary:
			"Transport manifest reading 18% solids — conflicts with lab report",
		linkedPoints: ["solids"],
		addedAt: "11:38 AM",
		addedBy: "M. Torres",
	},
	{
		id: "ev-4",
		type: "DOC",
		name: "Service agreement",
		summary: "Pickup schedule: Thursdays 7 AM–12 PM. Contract cap: 38t/mo",
		linkedPoints: ["frequency", "volume"],
		addedAt: "Yesterday",
		addedBy: "System",
	},
	{
		id: "ev-5",
		type: "PDF",
		name: "Historical dossier — similar site",
		summary: "2024 analogous site — pH 6.0–7.3, paint sludge with organics",
		linkedPoints: ["ph"],
		addedAt: "Yesterday",
		addedBy: "AI",
	},
];

// ── EvidenceRow ───────────────────────────────────────────────────────────────

function EvidenceRow({ doc }: { doc: EvidenceDoc }) {
	return (
		<div className="flex items-start gap-3 py-3">
			{/* Type badge */}
			<Badge
				variant="neutral-subtle"
				className="text-[7.5px] font-bold tracking-[0.04em] px-1 py-0 h-4 rounded-[2px] flex-shrink-0 mt-0.5"
			>
				{doc.type}
			</Badge>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline justify-between gap-2">
					<p className="text-[13px] font-semibold text-foreground leading-snug">
						{doc.name}
					</p>
					<span className="font-mono text-[9.5px] text-muted-foreground/50 flex-shrink-0">
						{doc.addedAt}
					</span>
				</div>
				<p className="text-[11.5px] text-muted-foreground/80 mt-0.5 leading-snug">
					{doc.summary}
				</p>
				{doc.linkedPoints.length > 0 && (
					<div className="flex items-center gap-1 mt-1.5 flex-wrap">
						<span className="text-[9.5px] text-muted-foreground/50">
							Links:
						</span>
						{doc.linkedPoints.map((point) => (
							<span
								key={point}
								className={cn(
									"text-[9.5px] font-medium px-1.5 py-px rounded",
									"bg-primary/[0.06] text-primary border border-primary/12",
								)}
							>
								{point}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ── EvidenceTab ───────────────────────────────────────────────────────────────
// Compact list of all evidence documents attached to this stream.
// Replaces the placeholder with a real, minimal-real surface.

export function EvidenceTab() {
	return (
		<div className="mt-7 max-w-2xl">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-[13px] font-semibold text-foreground">Evidence</h2>
				<Badge variant="neutral-subtle" className="text-[10px] font-medium">
					{EVIDENCE_DOCS.length} documents
				</Badge>
			</div>

			<Card className="shadow-xs">
				<CardContent className="px-4 py-0">
					{EVIDENCE_DOCS.map((doc, i) => (
						<div key={doc.id}>
							<EvidenceRow doc={doc} />
							{i < EVIDENCE_DOCS.length - 1 && (
								<Separator className="opacity-25" />
							)}
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
