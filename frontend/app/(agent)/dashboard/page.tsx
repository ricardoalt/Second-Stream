"use client";

import {
	Building2,
	CalendarDays,
	ClipboardPaste,
	FileText,
	Layers3,
	Mic,
	PlusCircle,
	Sparkles,
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
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const kpis = [
	{
		title: "Active streams",
		value: "48",
		caption: "Across 15 client accounts",
		trend: { value: "+6 this week", direction: "up" as const },
		icon: Layers3,
	},
	{
		title: "Pending follow-ups",
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

const streams = {
	active: [
		{
			name: "Mixed Solvent Waste",
			client: "BioTech Solutions",
			phase: "Phase 3",
			status: "On Track",
			updated: "10m ago",
		},
		{
			name: "Acid Etch Solution",
			client: "Precision Circuits",
			phase: "Phase 2",
			status: "Awaiting client",
			updated: "52m ago",
		},
		{
			name: "Scrap Catalyst Material",
			client: "Global Refining",
			phase: "Phase 1",
			status: "Draft ready",
			updated: "2h ago",
		},
	],
	action: [
		{
			name: "Infectious Solid Waste",
			client: "City Medical Hub",
			phase: "Phase 2",
			status: "Critical delay",
			updated: "11d stale",
		},
		{
			name: "Oily Water Mixture",
			client: "Heavy Gear Mfg",
			phase: "Phase 1",
			status: "Missing SDS",
			updated: "8d stale",
		},
	],
	drafts: [
		{
			name: "Catalyst Slurry Residue",
			client: "Zenith Industrial",
			phase: "Draft",
			status: "Needs review",
			updated: "25m ago",
		},
		{
			name: "Spent Coolant Blend",
			client: "Apex Manufacturing",
			phase: "Draft",
			status: "AI suggested",
			updated: "1h ago",
		},
	],
};

function renderStreamTable(
	items: Array<{
		name: string;
		client: string;
		phase: string;
		status: string;
		updated: string;
	}>,
) {
	return (
		<Table>
			<TableHeader>
				<TableRow className="bg-surface-container-low">
					<TableHead className="px-4 py-3 text-[0.68rem]">Stream</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Client</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Phase</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Status</TableHead>
					<TableHead className="px-4 py-3 text-right text-[0.68rem]">
						Last updated
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((stream, index) => (
					<TableRow
						key={`${stream.name}-${stream.client}`}
						className={
							index % 2 === 0 ? "bg-surface" : "bg-surface-container-low"
						}
					>
						<TableCell className="px-4 py-3 font-medium text-foreground">
							{stream.name}
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{stream.client}
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{stream.phase}
						</TableCell>
						<TableCell className="px-4 py-3">
							<Badge
								variant="muted"
								className="rounded-full border-0 text-[0.65rem]"
							>
								{stream.status}
							</Badge>
						</TableCell>
						<TableCell className="px-4 py-3 text-right text-muted-foreground">
							{stream.updated}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

export default function AgentDashboardPage() {
	const discoveryWizard = useDiscoveryWizard();

	return (
		<div className="flex flex-col gap-8">
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							Good morning, Alex
						</h1>
						<p className="text-sm text-muted-foreground">
							Tuesday, March 24 • Prioritize follow-ups and unblock high-value
							streams.
						</p>
					</div>
					<Button className="md:self-center" onClick={discoveryWizard.open}>
						<Sparkles data-icon="inline-start" aria-hidden="true" />
						Discovery Wizard
					</Button>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{kpis.map((kpi) => (
					<AgentDashboardKpiCard key={kpi.title} {...kpi} />
				))}
			</section>

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

			<section>
				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div className="flex flex-col gap-1">
							<CardTitle className="font-display text-xl font-semibold">
								My streams
							</CardTitle>
							<CardDescription>
								Track active streams, blocked items, and fresh drafts.
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<Tabs defaultValue="active" className="flex flex-col gap-3">
							<TabsList className="w-fit bg-surface-container-low">
								<TabsTrigger value="active">Active</TabsTrigger>
								<TabsTrigger value="action">Action required</TabsTrigger>
								<TabsTrigger value="drafts">Drafts</TabsTrigger>
							</TabsList>
							<TabsContent value="active" className="mt-0">
								{renderStreamTable(streams.active)}
							</TabsContent>
							<TabsContent value="action" className="mt-0">
								{renderStreamTable(streams.action)}
							</TabsContent>
							<TabsContent value="drafts" className="mt-0">
								{renderStreamTable(streams.drafts)}
							</TabsContent>
						</Tabs>
					</CardContent>
					<CardFooter className="justify-end">
						<Button variant="ghost" className="text-primary">
							View all streams
						</Button>
					</CardFooter>
				</Card>
			</section>
		</div>
	);
}
