"use client";

import {
	CheckCircle,
	CircleCheck,
	FileText,
	Loader2,
	MapPin,
	Trash2,
	Waves,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
	DiscoverySessionResult,
	DiscoverySource,
	DraftCandidate,
} from "@/lib/types/discovery";
import { cn } from "@/lib/utils";

const COUNTER_DURATION_MS = 800;

function reviewCounts(candidates: DraftCandidate[]) {
	const confirmed = candidates.filter(
		(item) => item.status === "confirmed",
	).length;
	const skipped = candidates.filter((item) => item.status === "skipped").length;
	return { confirmed, skipped, total: candidates.length };
}

function useAnimatedCounter(target: number, duration = COUNTER_DURATION_MS) {
	const [value, setValue] = useState(0);
	const prevTarget = useRef(0);

	useEffect(() => {
		if (target === prevTarget.current) return;
		prevTarget.current = target;

		const start = performance.now();
		let frameId: number;

		function tick(now: number) {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - (1 - progress) ** 3;
			setValue(Math.round(eased * target));

			if (progress < 1) {
				frameId = requestAnimationFrame(tick);
			}
		}

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	}, [target, duration]);

	return value;
}

export function sourceStatusLabel(status: DiscoverySource["status"]): string {
	if (status === "review_ready") {
		return "Processed";
	}
	if (status === "failed") {
		return "Needs attention";
	}
	return "Processing";
}

export function sourceTypeLabel(
	sourceType: DiscoverySource["sourceType"],
): string {
	if (sourceType === "audio") {
		return "Audio";
	}
	if (sourceType === "text") {
		return "Text";
	}
	return "File";
}

export function sourceDisplayLabel(source: DiscoverySource): string {
	if (source.sourceFilename && source.sourceFilename.trim().length > 0) {
		return source.sourceFilename;
	}
	if (source.textPreview && source.textPreview.trim().length > 0) {
		return source.textPreview;
	}
	if (source.sourceType === "text") {
		return "Text input";
	}
	if (source.sourceType === "audio") {
		return "Audio source";
	}
	return "File source";
}

export function ResultView({
	result,
	onReviewNow,
}: {
	result: DiscoverySessionResult;
	onReviewNow: () => void;
}) {
	const stats = [
		{
			icon: Waves,
			label: "Waste-streams found",
			count: result.summary.wasteStreamsFound,
			color: "bg-success/10 text-success",
		},
		{
			icon: MapPin,
			label: "Locations found",
			count: result.summary.locationsFound,
			color: "bg-info/10 text-info",
		},
	];
	const subtitle =
		result.status === "partial_failure"
			? "We analyzed your sources and prepared drafts. A few inputs need attention."
			: "We analyzed your sources and prepared drafts for review.";

	return (
		<section aria-label="Discovery complete" className="flex flex-col flex-1">
			<div className="h-1 bg-gradient-to-r from-success/80 via-success to-success/80" />
			<div className="flex flex-col items-center px-6 pt-10 pb-6 flex-1">
				<div className="rounded-2xl bg-success/10 p-5 mb-5">
					<CheckCircle className="h-8 w-8 text-success" />
				</div>
				<h3 className="font-display text-xl font-semibold tracking-tight mb-1">
					Ready for review
				</h3>
				<p className="text-sm text-muted-foreground mb-8">{subtitle}</p>
				<div className="w-full max-w-sm space-y-3 mb-8">
					{stats.map((stat, i) => (
						<StatCard
							key={stat.label}
							icon={stat.icon}
							label={stat.label}
							count={stat.count}
							color={stat.color}
							delay={i * 100}
						/>
					))}
					<p className="text-xs text-muted-foreground px-1">
						Locations are prefilled inside each draft.
					</p>
				</div>
				<div className="w-full max-w-sm mb-8">
					<p className="text-xs font-medium text-muted-foreground mb-2">
						Sources analyzed
					</p>
					<div className="rounded-lg border border-border/50 divide-y divide-border/40">
						{result.sources.length === 0 ? (
							<div className="px-3 py-2 text-xs text-muted-foreground">
								No sources recorded.
							</div>
						) : (
							result.sources.map((source) => (
								<div
									key={source.id}
									className="px-3 py-2 flex items-start justify-between gap-3"
								>
									<div className="min-w-0">
										<p className="text-sm truncate">
											{sourceDisplayLabel(source)}
										</p>
										<p className="text-xs text-muted-foreground">
											{sourceTypeLabel(source.sourceType)}
										</p>
									</div>
									<span className="text-xs text-muted-foreground whitespace-nowrap">
										{sourceStatusLabel(source.status)}
									</span>
								</div>
							))
						)}
					</div>
				</div>
				<Button
					onClick={onReviewNow}
					className="w-full max-w-sm mt-auto bg-success text-success-foreground hover:bg-success/90"
				>
					Review Drafts
				</Button>
				<p className="mt-2 text-xs text-muted-foreground">
					Continue in-wizard review before finishing.
				</p>
			</div>
		</section>
	);
}

function StatCard({
	icon: Icon,
	label,
	count,
	color,
	delay,
}: {
	icon: typeof MapPin;
	label: string;
	count: number;
	color: string;
	delay: number;
}) {
	const animatedCount = useAnimatedCounter(count);

	return (
		<div
			className="animate-in fade-in slide-in-from-bottom-2 rounded-xl bg-card border border-border/40 px-5 py-4 shadow-sm flex items-center gap-4"
			style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
		>
			<div className={`rounded-lg p-2.5 ${color}`}>
				<Icon className="h-5 w-5" />
			</div>
			<div className="flex items-baseline gap-2">
				<span className="font-display text-2xl font-bold tracking-tight tabular-nums">
					{animatedCount}
				</span>
				<span className="text-sm text-muted-foreground">{label}</span>
			</div>
		</div>
	);
}

export function ConfirmingView() {
	return (
		<section className="flex flex-col items-center justify-center flex-1 px-6 py-20">
			<Loader2 className="h-8 w-8 text-primary motion-safe:animate-spin" />
			<p className="mt-4 text-sm font-medium">Confirming stream…</p>
			<p className="text-xs text-muted-foreground mt-1">
				Applying your decision
			</p>
		</section>
	);
}

export function ReviewView({
	candidates,
	confirmingId,
	onConfirm,
	onSkip,
	onDiscard,
	onFinish,
}: {
	candidates: DraftCandidate[];
	confirmingId: string | null;
	onConfirm: (itemId: string) => void;
	onSkip: (itemId: string) => void;
	onDiscard: (itemId: string) => void;
	onFinish: () => void;
}) {
	const counts = reviewCounts(candidates);
	const actioned = counts.confirmed + counts.skipped;
	const finishEnabled = actioned === counts.total || counts.confirmed >= 1;

	return (
		<section className="flex flex-col flex-1">
			<div className="px-6 pt-6 pb-4">
				<h3 className="font-display text-xl font-semibold tracking-tight">
					Confirm Identified Streams
				</h3>
				<p className="text-sm text-muted-foreground mt-1">
					Review AI-extracted chemical waste manifests before system ingestion.
				</p>
			</div>
			<div className="flex-1 overflow-auto px-6">
				<table className="w-full text-sm">
					<tbody className="divide-y divide-border/20">
						{candidates.map((candidate) => {
							const isConfirmed = candidate.status === "confirmed";
							const isSkipped = candidate.status === "skipped";
							return (
								<tr
									key={candidate.itemId}
									className={cn(
										"transition-colors border-l-[3px]",
										isConfirmed && "border-l-success bg-success/5",
										isSkipped && "border-l-muted-foreground/30 opacity-60",
										!isConfirmed && !isSkipped && "border-l-primary",
									)}
								>
									<td className="py-3 pr-3">
										<p className="font-medium truncate max-w-[180px]">
											{candidate.material}
										</p>
									</td>
									<td className="py-3">
										<div className="flex items-center justify-end gap-1.5">
											{isConfirmed ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
													<CircleCheck className="size-3.5" />
													Confirmed
												</span>
											) : isSkipped ? (
												<span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
													Kept as draft
												</span>
											) : (
												<>
													<Button
														size="sm"
														onClick={() => onConfirm(candidate.itemId)}
														disabled={confirmingId === candidate.itemId}
														className="h-7 bg-primary text-primary-foreground text-[11px] px-2.5"
													>
														{confirmingId === candidate.itemId ? (
															<Loader2 className="size-3 animate-spin" />
														) : (
															<>
																<CircleCheck className="size-3 mr-1" />
																Confirm
															</>
														)}
													</Button>
													<Button
														size="sm"
														variant="outline"
														onClick={() => onSkip(candidate.itemId)}
														className="h-7 text-[11px] px-2.5"
													>
														<FileText className="size-3 mr-1" />
														Keep as Draft
													</Button>
													<button
														type="button"
														onClick={() => onDiscard(candidate.itemId)}
														className="h-7 w-7 flex items-center justify-center rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
													>
														<Trash2 className="size-3.5" />
													</button>
												</>
											)}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div className="flex items-center justify-between border-t border-border/10 bg-surface-container-low/40 px-6 py-5">
				<span className="text-xs text-muted-foreground">
					{counts.total} streams identified for batch processing.
				</span>
				<Button
					onClick={onFinish}
					disabled={!finishEnabled}
					className="bg-gradient-to-r from-primary to-primary/90 shadow-water"
				>
					Finish Review
				</Button>
			</div>
		</section>
	);
}
