"use client";

import {
	Building2,
	CalendarDays,
	ClipboardPaste,
	FileText,
	Layers3,
	Mic,
	PlusCircle,
	Users,
} from "lucide-react";
import {
	AgentDashboardActivityFeed,
	type DashboardActivityItem,
} from "@/components/features/dashboard/components/agent-dashboard-activity-feed";
import { AgentDashboardKpiCard } from "@/components/features/dashboard/components/agent-dashboard-kpi-card";
import {
	AgentDashboardQuickActions,
	type DashboardPipelineStage,
	type DashboardQuickAction,
} from "@/components/features/dashboard/components/agent-dashboard-quick-actions";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const kpis = [
	{
		title: "Active streams",
		value: "48",
		caption: "Across 15 client accounts",
		trend: { value: "+6 this week", direction: "up" as const },
		icon: Layers3,
	},
	{
		title: "Missing information",
		value: "11",
		caption: "5 are compliance-sensitive",
		trend: { value: "-2 from yesterday", direction: "down" as const },
		icon: CalendarDays,
	},
	{
		title: "Active clients",
		value: "23",
		caption: "4 multi-location expansions",
		trend: { value: "+1 this month", direction: "up" as const },
		icon: Building2,
	},
	{
		title: "Offers in pipeline",
		value: "$2.9M",
		caption: "Weighted close value",
		trend: { value: "Stable", direction: "neutral" as const },
		icon: FileText,
	},
];

const recentActivity: DashboardActivityItem[] = [
	{
		id: "a1",
		agent: "AF",
		action: "logged a call with BioTech Solutions for",
		stream: "Mixed Solvent Waste",
		time: "12 min ago",
		status: "completed",
	},
	{
		id: "a2",
		agent: "AF",
		action: "requested missing SDS documentation on",
		stream: "Oily Water Mixture",
		time: "39 min ago",
		status: "follow_up",
	},
	{
		id: "a3",
		agent: "MV",
		action: "created a new draft stream for",
		stream: "Catalyst Slurry Residue",
		time: "1h ago",
		status: "new",
	},
	{
		id: "a4",
		agent: "AF",
		action: "advanced phase 2 review for",
		stream: "Acid Etch Solution",
		time: "2h ago",
		status: "completed",
	},
	{
		id: "a5",
		agent: "SB",
		action: "flagged compliance delay on",
		stream: "Infectious Solid Waste",
		time: "3h ago",
		status: "follow_up",
	},
];

const quickActions: DashboardQuickAction[] = [
	{
		id: "q1",
		label: "New discovery",
		description: "Launch the wizard with source upload.",
		icon: PlusCircle,
		priority: "high",
	},
	{
		id: "q2",
		label: "Quick paste",
		description: "Process field notes or email snippets.",
		icon: ClipboardPaste,
	},
	{
		id: "q3",
		label: "Voice memo",
		description: "Capture on-site observations with AI parsing.",
		icon: Mic,
	},
	{
		id: "q4",
		label: "Client outreach",
		description: "Send follow-up templates for stale streams.",
		icon: Users,
	},
];

const pipelineSnapshot: DashboardPipelineStage[] = [
	{ stage: "Qualification", count: 9, value: "$620K", fill: 86 },
	{ stage: "Review", count: 7, value: "$780K", fill: 72 },
	{ stage: "Negotiation", count: 4, value: "$1.1M", fill: 58 },
	{ stage: "Closing", count: 2, value: "$430K", fill: 31 },
];

const blockedStreams = [
	{
		material: "Infectious Solid Waste",
		client: "City Medical Hub",
		complianceStatus: "Blocked",
		missingDocs: "Updated transport manifest",
	},
	{
		material: "Oily Water Mixture",
		client: "Heavy Gear Mfg",
		complianceStatus: "Pending validation",
		missingDocs: "SDS + disposal certificate",
	},
	{
		material: "Spent Coolant Blend",
		client: "Apex Manufacturing",
		complianceStatus: "Action required",
		missingDocs: "Generator signature",
	},
	{
		material: "Catalyst Slurry Residue",
		client: "Zenith Industrial",
		complianceStatus: "Blocked",
		missingDocs: "Analysis sheet",
	},
];

function getGreeting(now: Date) {
	const hour = now.getHours();
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}

export default function AgentDashboardPage() {
	const discoveryWizard = useDiscoveryWizard();
	const now = new Date();
	const formattedDate = now.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
	const greeting = getGreeting(now);

	return (
		<div className="flex flex-col gap-8">
			{/* Zone 1: Greeting Header */}
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-1">
					<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
						{greeting}, Alex
					</h1>
					<p className="text-sm text-muted-foreground">
						{formattedDate} • Prioritize missing information and unblock
						high-value streams.
					</p>
				</div>
			</section>

			{/* Zone 2: KPI Cards */}
			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{kpis.map((kpi) => (
					<AgentDashboardKpiCard key={kpi.title} {...kpi} />
				))}
			</section>

			{/* Zone 3: Activity + Quick Actions */}
			<section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
				<AgentDashboardActivityFeed items={recentActivity} />
				<AgentDashboardQuickActions
					actions={quickActions}
					pipeline={pipelineSnapshot}
					onActionClick={(action) => {
						if (action.id === "q1") {
							discoveryWizard.open();
						}
					}}
				/>
			</section>

			{/* Zone 4: Blocked Streams */}
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="mb-4 flex items-end justify-between gap-4">
					<div>
						<h2 className="font-display text-xl font-semibold">
							Blocked Streams
						</h2>
						<p className="text-sm text-muted-foreground">
							Streams waiting on compliance documentation before progress.
						</p>
					</div>
				</div>
				<div className="grid grid-cols-[1.3fr_1fr_1fr_1.2fr_auto] gap-3 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
					<span>Material</span>
					<span>Client</span>
					<span>Compliance Status</span>
					<span>Missing Docs</span>
					<span className="text-right">Action</span>
				</div>
				<div className="space-y-2">
					{blockedStreams.map((stream) => (
						<div
							key={`${stream.material}-${stream.client}`}
							className="grid grid-cols-[1.3fr_1fr_1fr_1.2fr_auto] items-center gap-3 rounded-xl bg-surface-container-low px-3 py-3"
						>
							<span className="text-sm font-medium text-foreground">
								{stream.material}
							</span>
							<span className="text-sm text-muted-foreground">
								{stream.client}
							</span>
							<Badge variant="muted" className="w-fit border-0 rounded-full">
								{stream.complianceStatus}
							</Badge>
							<span className="text-sm text-muted-foreground">
								{stream.missingDocs}
							</span>
							<div className="flex justify-end">
								<Button size="sm">Resolve</Button>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Zone 5: Strategic Focus */}
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="mb-4">
					<h2 className="font-display text-xl font-semibold">
						Today's Strategic Focus
					</h2>
					<p className="text-sm text-muted-foreground">
						High-impact tasks curated to maximize pipeline velocity
					</p>
				</div>
				<p className="mb-3 text-sm font-medium text-foreground">
					2 / 5 Complete
				</p>
				<div className="rounded-xl bg-surface-container-low p-4">
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Placeholder task
					</p>
					<p className="mt-1 text-sm font-medium text-foreground">
						Unblock City Medical Hub by collecting signed manifest and SDS
						packet.
					</p>
				</div>
			</section>
		</div>
	);
}
