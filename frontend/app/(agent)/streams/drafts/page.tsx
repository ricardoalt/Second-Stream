"use client";

import { Download, FilePenLine, Sparkles } from "lucide-react";
import { draftStreams } from "@/components/features/streams/mock-data";
import { StreamsDraftsTable } from "@/components/features/streams/streams-drafts-table";
import { StreamsRouteTabs } from "@/components/features/streams/streams-route-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function AgentDraftStreamsPage() {
	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							Draft Streams
						</h1>
						<p className="text-sm text-muted-foreground">
							Review and quickly correct AI-created draft streams before
							submission.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button variant="ghost">
							<Download data-icon="inline-start" aria-hidden />
							Export
						</Button>
						<Button>
							<Sparkles data-icon="inline-start" aria-hidden />
							Discovery Wizard
						</Button>
					</div>
				</div>
			</section>

			<StreamsRouteTabs />

			<Card className="bg-surface-container-lowest shadow-sm">
				<CardHeader className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<FilePenLine aria-hidden className="size-5 text-primary" />
						<CardTitle className="font-display text-xl">
							Simplified inline edit
						</CardTitle>
					</div>
					<CardDescription>
						Use row-level edits to clean draft data without leaving the queue.
					</CardDescription>
					<div>
						<Badge variant="muted" className="rounded-full border-0">
							{draftStreams.length} pending drafts
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<StreamsDraftsTable rows={draftStreams} />
				</CardContent>
			</Card>
		</div>
	);
}
