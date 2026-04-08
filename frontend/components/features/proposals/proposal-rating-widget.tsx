"use client";

import { AlertCircle, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/format";
import type { ProposalRatingStats } from "@/lib/types/proposal-rating";
import { cn } from "@/lib/utils";
import { ScoreSelector } from "./score-selector";
import { type ReadyState, useProposalRatings } from "./use-proposal-ratings";

const RATING_CRITERIA = [
	{
		key: "coverageNeedsScore",
		label: "Coverage of needs",
		description: "How well proposal addresses project needs",
	},
	{
		key: "qualityInfoScore",
		label: "Quality of information",
		description: "How clear and reliable details are",
	},
	{
		key: "businessDataScore",
		label: "Business data quality",
		description: "How useful data is for business decisions",
	},
] as const;

const AUTO_CLOSE_DELAY = 600;

interface ProposalRatingWidgetProps {
	projectId: string;
	proposalId: string;
	isWriteBlocked: boolean;
	onStatsLoaded?: (stats: ProposalRatingStats | null) => void;
}

export function ProposalRatingWidget({
	projectId,
	proposalId,
	isWriteBlocked,
	onStatsLoaded,
}: ProposalRatingWidgetProps) {
	const rating = useProposalRatings(projectId, proposalId, isWriteBlocked);
	const [popoverOpen, setPopoverOpen] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

	const statsForCallback =
		rating.status === "ready" ? rating.ratingStats : null;
	useEffect(() => {
		onStatsLoaded?.(statsForCallback);
	}, [statsForCallback, onStatsLoaded]);

	if (rating.status === "loading") {
		return (
			<div className="mb-6">
				<Skeleton className="h-9 w-28" />
			</div>
		);
	}

	if (rating.status === "error") {
		return (
			<div className="mb-6 inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
				<AlertCircle className="h-4 w-4 text-destructive" />
				<span className="text-sm text-destructive">Ratings unavailable</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={rating.retry}
					className="ml-1 h-7 px-2 text-xs"
				>
					Retry
				</Button>
			</div>
		);
	}

	const handleSave = async () => {
		setHasTriedSubmit(true);
		const success = await rating.save();
		if (success) {
			setHasTriedSubmit(false);
			setTimeout(() => {
				setPopoverOpen(false);
				setDrawerOpen(false);
			}, AUTO_CLOSE_DELAY);
		}
	};

	const handlePopoverChange = (open: boolean) => {
		if (!open) setHasTriedSubmit(false);
		setPopoverOpen(open);
	};

	const handleDrawerChange = (open: boolean) => {
		if (!open) setHasTriedSubmit(false);
		setDrawerOpen(open);
	};

	return (
		<div className="mb-6">
			{/* Desktop: Popover */}
			<div className="hidden lg:block">
				<Popover open={popoverOpen} onOpenChange={handlePopoverChange}>
					<PopoverTrigger asChild>
						<TriggerButton rating={rating} />
					</PopoverTrigger>
					<PopoverContent side="bottom" align="start" className="w-96 p-0">
						<RatingForm
							rating={rating}
							isWriteBlocked={isWriteBlocked}
							hasTriedSubmit={hasTriedSubmit}
							onSave={handleSave}
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Mobile: Drawer */}
			<div className="lg:hidden">
				<Drawer open={drawerOpen} onOpenChange={handleDrawerChange}>
					<DrawerTrigger asChild>
						<TriggerButton rating={rating} />
					</DrawerTrigger>
					<DrawerContent>
						<DrawerHeader className="text-left">
							<DrawerTitle>Rate this proposal</DrawerTitle>
						</DrawerHeader>
						<div className="px-4 pb-2">
							<RatingForm
								rating={rating}
								isWriteBlocked={isWriteBlocked}
								hasTriedSubmit={hasTriedSubmit}
								onSave={handleSave}
							/>
						</div>
						<DrawerFooter>
							<DrawerClose asChild>
								<Button variant="outline" size="sm">
									Close
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			</div>
		</div>
	);
}

interface TriggerButtonProps extends React.ComponentProps<typeof Button> {
	rating: ReadyState;
}

function getPersistedAverage(rating: ReadyState): number | null {
	if (!rating.currentRating) {
		return null;
	}

	const { coverageNeedsScore, qualityInfoScore, businessDataScore } =
		rating.currentRating;

	return (coverageNeedsScore + qualityInfoScore + businessDataScore) / 3;
}

const TriggerButton = React.forwardRef<HTMLButtonElement, TriggerButtonProps>(
	({ rating, className, ...props }, ref) => {
		const persistedAverage = getPersistedAverage(rating);
		const isRated = persistedAverage !== null;

		return (
			<Button
				ref={ref}
				variant="outline"
				size="sm"
				className={cn(
					"gap-1.5 transition-colors",
					isRated && "border-rating-star/50 text-rating-star",
					className,
				)}
				{...props}
			>
				<Star
					className={cn(
						"h-3.5 w-3.5",
						isRated
							? "fill-rating-star text-rating-star"
							: "text-muted-foreground",
					)}
				/>
				{isRated ? (
					<span className="tabular-nums">
						{persistedAverage.toFixed(1)} avg
					</span>
				) : (
					"Rate"
				)}
			</Button>
		);
	},
);
TriggerButton.displayName = "TriggerButton";

function RatingForm({
	rating,
	isWriteBlocked,
	hasTriedSubmit,
	onSave,
}: {
	rating: ReadyState;
	isWriteBlocked: boolean;
	hasTriedSubmit: boolean;
	onSave: () => void;
}) {
	const { scores, comment, isSaving, allScored, currentRating } = rating;

	return (
		<div className="p-4 space-y-3">
			{/* Criteria rows — divide-y for clean separation, no border-left noise */}
			<div className="divide-y divide-border/50">
				{RATING_CRITERIA.map((criterion) => {
					const score = scores[criterion.key];
					const unscored = score < 1;

					return (
						<div
							key={criterion.key}
							className={cn(
								"flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between",
								// only highlight after a failed submit attempt
								hasTriedSubmit &&
									unscored &&
									"rounded-md bg-destructive/5 px-2",
							)}
						>
							<div className="min-w-0">
								<span className="text-sm font-medium leading-none">
									{criterion.label}
								</span>
								<span className="ml-2 text-xs text-muted-foreground">
									{criterion.description}
								</span>
							</div>
							<ScoreSelector
								name={criterion.key}
								label={criterion.label}
								value={score}
								onChange={(value) => rating.setScore(criterion.key, value)}
								disabled={isSaving || isWriteBlocked}
							/>
						</div>
					);
				})}
			</div>

			{/* Comment */}
			<div className="space-y-1.5 pt-1">
				<label
					htmlFor="proposal-rating-comment"
					className="text-xs uppercase tracking-wide text-muted-foreground"
				>
					Comment <span className="normal-case not-italic">(optional)</span>
				</label>
				<Textarea
					id="proposal-rating-comment"
					value={comment}
					onChange={(event) => rating.setComment(event.target.value)}
					placeholder="Share what worked well and what should improve"
					maxLength={1000}
					disabled={isSaving || isWriteBlocked}
					className="min-h-[64px] resize-none text-sm"
				/>
				{/* counter only visible once the user starts typing */}
				{comment.length > 0 && (
					<p
						className={cn(
							"text-xs tabular-nums",
							comment.length >= 900 ? "text-warning" : "text-muted-foreground",
						)}
					>
						{comment.length}/1000
					</p>
				)}
			</div>

			{/* Footer */}
			<div className="space-y-2 pt-1">
				{/* timestamp / hint line */}
				<p className="text-xs text-muted-foreground/70">
					{currentRating
						? `Last updated ${formatDateTime(currentRating.updatedAt)}`
						: !allScored
							? "· Rate all 3 criteria to submit"
							: null}
				</p>

				<div className="flex items-center justify-between gap-3">
					{isWriteBlocked && (
						<p className="text-xs text-muted-foreground">
							Read-only — proposal is archived.
						</p>
					)}
					<div className="ml-auto">
						<Tooltip delayDuration={200}>
							<TooltipTrigger asChild>
								<span className="inline-flex">
									<Button
										onClick={onSave}
										disabled={isSaving || isWriteBlocked || !allScored}
										size="sm"
									>
										{isSaving
											? "Saving..."
											: currentRating
												? "Update rating"
												: "Save rating"}
									</Button>
								</span>
							</TooltipTrigger>
							{!allScored && !isWriteBlocked && (
								<TooltipContent>Rate all 3 criteria to submit</TooltipContent>
							)}
							{isWriteBlocked && (
								<TooltipContent>
									Archived proposals are read-only
								</TooltipContent>
							)}
						</Tooltip>
					</div>
				</div>
			</div>
		</div>
	);
}
