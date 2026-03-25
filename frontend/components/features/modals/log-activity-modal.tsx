"use client";

import { Check, History, Repeat2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type RelatedStream = {
	id: string;
	label: string;
};

type LogActivityModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	relatedStreams?: RelatedStream[];
};

const activityTypes = [
	"Meeting",
	"Call",
	"Email",
	"Note",
	"Site visit",
	"Other",
];

export function LogActivityModal({
	open,
	onOpenChange,
	relatedStreams = [],
}: LogActivityModalProps) {
	const [activityType, setActivityType] = useState<string>(
		activityTypes[0] ?? "",
	);
	const [dateTime, setDateTime] = useState("2026-03-24T10:15");
	const [description, setDescription] = useState(
		"Reviewed stream documentation, confirmed pending SDS upload, and aligned on next checkpoint.",
	);
	const [relatedStreamId, setRelatedStreamId] = useState(
		relatedStreams[0]?.id ?? "none",
	);
	const [outcome, setOutcome] = useState(
		"Client acknowledged requirements and committed to sharing missing compliance files.",
	);
	const [reminder, setReminder] = useState("2026-03-26");

	useEffect(() => {
		if (!open) {
			setActivityType(activityTypes[0] ?? "");
			setDateTime("2026-03-24T10:15");
			setDescription(
				"Reviewed stream documentation, confirmed pending SDS upload, and aligned on next checkpoint.",
			);
			setRelatedStreamId(relatedStreams[0]?.id ?? "none");
			setOutcome(
				"Client acknowledged requirements and committed to sharing missing compliance files.",
			);
			setReminder("2026-03-26");
		}
	}, [open, relatedStreams]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,820px)] max-w-none rounded-xl border-0 p-0">
				<DialogHeader className="flex flex-col gap-2 bg-surface-container-low px-6 py-5 text-left">
					<div className="flex items-center gap-2">
						<History aria-hidden className="text-primary" />
						<Badge variant="secondary" className="rounded-full">
							Activity management
						</Badge>
					</div>
					<DialogTitle className="font-display text-2xl font-semibold tracking-tight">
						Log Activity
					</DialogTitle>
					<DialogDescription>
						Create a timeline entry with type, date, related stream, and
						follow-up context.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label>Activity type</Label>
							<Select value={activityType} onValueChange={setActivityType}>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{activityTypes.map((item) => (
											<SelectItem key={item} value={item}>
												{item}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="activity-datetime">Date &amp; time</Label>
							<Input
								id="activity-datetime"
								type="datetime-local"
								value={dateTime}
								onChange={(event) => setDateTime(event.target.value)}
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="activity-description">Description</Label>
						<Textarea
							id="activity-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							className="min-h-28 bg-surface"
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label>Related stream (optional)</Label>
							<Select
								value={relatedStreamId}
								onValueChange={setRelatedStreamId}
							>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select stream" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="none">No specific stream</SelectItem>
										{relatedStreams.map((stream) => (
											<SelectItem key={stream.id} value={stream.id}>
												{stream.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="activity-reminder">Next steps reminder</Label>
							<Input
								id="activity-reminder"
								type="date"
								value={reminder}
								onChange={(event) => setReminder(event.target.value)}
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="activity-outcome">Outcome / notes</Label>
						<Textarea
							id="activity-outcome"
							value={outcome}
							onChange={(event) => setOutcome(event.target.value)}
							className="min-h-24 bg-surface"
						/>
					</div>
				</div>

				<DialogFooter className="bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-between">
					<Badge className="rounded-full bg-primary/10 text-primary shadow-none">
						<Check data-icon="inline-start" aria-hidden />
						Draft active
					</Badge>
					<div className="flex items-center gap-2">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button variant="secondary" type="button">
							<Repeat2 data-icon="inline-start" aria-hidden />
							Help &amp; Docs
						</Button>
						<Button type="button">Save Activity</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
