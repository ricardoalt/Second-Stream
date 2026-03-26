"use client";

import {
	ArrowLeft,
	ArrowRight,
	FileText,
	Mail,
	Mic,
	Paperclip,
	Phone,
	StickyNote,
	Upload,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import { QuickPasteModal } from "@/components/features/discovery/quick-paste-modal";
import { CallClientModal } from "@/components/features/modals/call-client-modal";
import { LogActivityModal } from "@/components/features/modals/log-activity-modal";
import { RequestUpdateModal } from "@/components/features/modals/request-update-modal";
import { SendEmailModal } from "@/components/features/modals/send-email-modal";
import { StreamPhaseStepper } from "@/components/features/streams/stream-phase-stepper";
import { StreamStatusBadge } from "@/components/features/streams/stream-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStreamDetail } from "./mock-data";
import type { StreamPhase, StreamTimelineEvent } from "./types";

const quickActions = [
	{ label: "Email", icon: Mail },
	{ label: "Call", icon: Phone },
	{ label: "Log Activity", icon: StickyNote },
	{ label: "Request Update", icon: FileText },
	{ label: "Upload", icon: Upload },
	{ label: "Quick Paste", icon: Paperclip },
	{ label: "Voice Memo", icon: Mic },
];

const phaseCTA: Record<StreamPhase, string> = {
	1: "Continue to Phase 2",
	2: "Continue to Phase 3",
	3: "Continue to Phase 4",
	4: "Complete Discovery",
};

export function StreamDetailPageContent({ id }: { id: string }) {
	const detail = getStreamDetail(id);
	const discoveryWizard = useDiscoveryWizard();
	const [emailOpen, setEmailOpen] = useState<boolean>(false);
	const [callOpen, setCallOpen] = useState<boolean>(false);
	const [logOpen, setLogOpen] = useState<boolean>(false);
	const [requestUpdateOpen, setRequestUpdateOpen] = useState<boolean>(false);
	const [quickPasteOpen, setQuickPasteOpen] = useState<boolean>(false);

	const streamContacts = [
		{
			id: `${detail.id}-contact`,
			name: `${detail.client} Coordinator`,
			role: "Client Contact",
			phone: "+1 (555) 010-2214",
		},
	];

	const quickActionHandlers: Record<string, () => void> = {
		Email: () => setEmailOpen(true),
		Call: () => setCallOpen(true),
		"Log Activity": () => setLogOpen(true),
		"Request Update": () => setRequestUpdateOpen(true),
		Upload: discoveryWizard.open,
		"Quick Paste": () => setQuickPasteOpen(true),
		"Voice Memo": discoveryWizard.open,
	};

	return (
		<div className="flex flex-col gap-6">
			<SendEmailModal open={emailOpen} onOpenChange={setEmailOpen} />
			<CallClientModal
				open={callOpen}
				onOpenChange={setCallOpen}
				contacts={streamContacts}
			/>
			<LogActivityModal
				open={logOpen}
				onOpenChange={setLogOpen}
				relatedStreams={[
					{ id: detail.id, label: `${detail.name} (${detail.id})` },
				]}
			/>
			<RequestUpdateModal
				open={requestUpdateOpen}
				onOpenChange={setRequestUpdateOpen}
				recipients={[
					{
						id: "assigned-agent",
						name: detail.assignedAgent,
						role: "Field Agent",
					},
				]}
			/>
			<QuickPasteModal open={quickPasteOpen} onOpenChange={setQuickPasteOpen} />
			<header className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
				<p className="text-xs uppercase tracking-[0.08em] text-secondary">
					Streams / {detail.client} / {detail.id}
				</p>
				<div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-col gap-2">
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							{detail.name}
						</h1>
						<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
							<span>{detail.client}</span>
							<span>•</span>
							<span>{detail.location}</span>
							<StreamStatusBadge status={detail.status} />
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Avatar className="size-9">
							<AvatarFallback className="bg-primary/15 text-primary">
								AF
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-semibold text-foreground">
								{detail.assignedAgent}
							</span>
							<span className="text-xs text-muted-foreground">
								Assigned agent
							</span>
						</div>
					</div>
				</div>
			</header>

			<StreamPhaseStepper activePhase={detail.phase} blockedPhases={[4]} />

			<div className="grid gap-6 xl:grid-cols-[1.6fr_340px]">
				<div className="flex flex-col gap-6">
					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Stream metadata
							</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 pt-0 md:grid-cols-2">
							<MetaItem label="Waste type" value={detail.wasteType} />
							<MetaItem label="Volume" value={detail.volume} />
							<MetaItem label="Frequency" value={detail.frequency} />
							<MetaItem
								label="First lift target"
								value={detail.firstLiftTarget}
							/>
							<MetaItem
								label="Regulatory class"
								value={detail.regulatoryClass}
							/>
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Phase workspace
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 pt-0">
							<div className="grid gap-4 md:grid-cols-2">
								<MetaItem label="Material name" value={detail.name} />
								<MetaItem
									label="Generating process"
									value="Distillation and tank flush"
								/>
								<MetaItem label="Packaging" value="Totes + drums" />
								<MetaItem
									label="Timeline for first lift"
									value={detail.firstLiftTarget}
								/>
							</div>

							<div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
								<Button variant="ghost">
									<ArrowLeft data-icon="inline-start" aria-hidden />
									Back
								</Button>
								<Button>
									{phaseCTA[detail.phase]}
									<ArrowRight data-icon="inline-end" aria-hidden />
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card className="bg-surface-container-lowest shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Activity timeline
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 pt-0">
							{detail.timeline.map((event) => (
								<TimelineRow key={event.id} event={event} />
							))}
						</CardContent>
					</Card>
				</div>

				<aside className="flex flex-col gap-6">
					<Card className="bg-surface-container-low shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-lg">Documents</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-2 pt-0">
							{detail.attachments.map((file) => (
								<div
									key={file.id}
									className="rounded-lg bg-surface-container-lowest p-3"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="flex min-w-0 gap-2">
											<FileText
												aria-hidden
												className="mt-0.5 size-4 text-primary"
											/>
											<div className="flex min-w-0 flex-col gap-0.5">
												<p className="truncate text-sm font-medium text-foreground">
													{file.name}
												</p>
												<p className="text-xs text-muted-foreground">
													{file.type} · {file.date}
												</p>
											</div>
										</div>
										<Badge
											variant="secondary"
											className={
												file.status === "verified"
													? "rounded-full bg-success/20 text-success-foreground"
													: "rounded-full bg-warning/20 text-warning-foreground"
											}
										>
											{file.status}
										</Badge>
									</div>
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="bg-surface-container-low shadow-sm">
						<CardHeader>
							<CardTitle className="font-display text-lg">
								Quick actions
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-2 pt-0">
							{quickActions.map((action) => {
								const Icon = action.icon;
								const onClick = quickActionHandlers[action.label];
								return (
									<Button
										key={action.label}
										variant="secondary"
										className="justify-start"
										onClick={onClick}
									>
										<Icon data-icon="inline-start" aria-hidden />
										{action.label}
									</Button>
								);
							})}
							<Button
								asChild
								variant="ghost"
								className="justify-start text-primary"
							>
								<Link href="/streams">Back to all streams</Link>
							</Button>
						</CardContent>
					</Card>
				</aside>
			</div>
		</div>
	);
}

function MetaItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg bg-surface-container-low p-3">
			<p className="text-xs uppercase tracking-[0.08em] text-secondary">
				{label}
			</p>
			<p className="mt-1 text-sm font-medium text-foreground">{value}</p>
		</div>
	);
}

function TimelineRow({ event }: { event: StreamTimelineEvent }) {
	const actorTone =
		event.actorRole === "admin"
			? "bg-info/20 text-info-foreground"
			: event.actorRole === "system"
				? "bg-muted text-muted-foreground"
				: "bg-primary/20 text-primary";

	return (
		<div className="rounded-xl bg-surface-container-low p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className={actorTone}>
						{event.actor}
					</Badge>
				</div>
				<span className="text-xs text-muted-foreground">{event.timestamp}</span>
			</div>
			<p className="mt-2 text-sm text-foreground">{event.message}</p>
		</div>
	);
}
