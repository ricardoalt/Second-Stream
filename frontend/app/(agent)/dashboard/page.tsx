"use client";

import {
	AlertCircle,
	ArrowRight,
	Building2,
	CheckCircle2,
	Clock,
	Layers3,
	MoreHorizontal,
	Plus,
	RefreshCw,
	Sparkles,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import { AdminDashboardPageContent } from "@/components/features/workspace";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { CircularGauge } from "@/components/ui/circular-gauge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/lib/contexts";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY KPIs (Zone 1) - 4 metrics with radial gauges
// ════════════════════════════════════════════════════════════

const executiveKpis = [
	{
		title: "Monthly Pipeline Growth",
		value: "$640K",
		change: "+12%",
		changeType: "positive" as const,
		subtitle: "vs last month",
		gaugeValue: 68,
	},
	{
		title: "Conversion Rate",
		value: "34%",
		change: "+4%",
		changeType: "positive" as const,
		subtitle: "Q1 avg: 30%",
		gaugeValue: 34,
	},
	{
		title: "Avg. Deal Cycle",
		value: "18 days",
		change: "-3 days",
		changeType: "positive" as const,
		subtitle: "Industry avg: 24d",
		gaugeValue: 75,
	},
	{
		title: "Compliance Score",
		value: "94%",
		change: "+2%",
		changeType: "positive" as const,
		subtitle: "Across all streams",
		gaugeValue: 94,
	},
];

// ════════════════════════════════════════════════════════════
// IMMEDIATE ACTION REQUIRED (Zone 2) - 3 elevated alert cards
// ════════════════════════════════════════════════════════════

const criticalActions = [
	{
		id: "overdue",
		severity: "critical" as const,
		label: "Overdue",
		client: "City Medical Hub",
		description:
			"Transport manifest for Infectious Solid Waste — 5 days past deadline",
		cta: "Resolve Now",
		ctaVariant: "destructive" as const,
	},
	{
		id: "stagnant",
		severity: "warning" as const,
		label: "Stagnant Deal",
		client: "Heavy Gear Manufacturing",
		description:
			"Catalyst Slurry Residue stuck in review — 12 days no activity",
		cta: "Send Nudge",
		ctaVariant: "secondary" as const,
	},
	{
		id: "opportunity",
		severity: "success" as const,
		label: "New Opportunity",
		client: "Apex Industrial",
		description: "Expansion potential — 2 additional facilities in region",
		cta: "Explore",
		ctaVariant: "default" as const,
	},
];

// ════════════════════════════════════════════════════════════
// STREAMS AWAITING INFORMATION (Zone 3) - Triage table
// ════════════════════════════════════════════════════════════

const awaitingInfoStreams = [
	{
		id: "str-001",
		material: "Infectious Solid Waste",
		client: "City Medical Hub",
		site: "Downtown Facility",
		complianceStatus: "Blocked",
		missingDoc: "Transport manifest",
		strategicAction: "EOD deadline",
		priority: "critical",
	},
	{
		id: "str-002",
		material: "Oily Water Mixture",
		client: "Heavy Gear Mfg",
		site: "Plant A",
		complianceStatus: "Pending",
		missingDoc: "SDS + disposal cert",
		strategicAction: "Schedule call",
		priority: "high",
	},
	{
		id: "str-003",
		material: "Spent Coolant Blend",
		client: "Apex Manufacturing",
		site: "Main Facility",
		complianceStatus: "Action Required",
		missingDoc: "Generator signature",
		strategicAction: "Email reminder",
		priority: "medium",
	},
	{
		id: "str-004",
		material: "Catalyst Slurry",
		client: "Zenith Industrial",
		site: "Processing Plant",
		complianceStatus: "Review",
		missingDoc: "Analysis sheet",
		strategicAction: "Request update",
		priority: "medium",
	},
	{
		id: "str-005",
		material: "Acid Etch Solution",
		client: "BioTech Solutions",
		site: "Lab Complex",
		complianceStatus: "Missing Info",
		missingDoc: "Waste profile",
		strategicAction: "Schedule site visit",
		priority: "low",
	},
];

// ════════════════════════════════════════════════════════════
// DAILY STRATEGIC FOCUS (Zone 4) - Editorial priority card
// ════════════════════════════════════════════════════════════

const dailyProgress = {
	completed: 3,
	total: 5,
	tasks: [
		{ id: 1, label: "Review blocked streams", completed: true },
		{ id: 2, label: "Follow up on Apex deal", completed: true },
		{ id: 3, label: "Update compliance docs", completed: true },
		{ id: 4, label: "Schedule Zenith site visit", completed: false },
		{ id: 5, label: "Prepare Q2 forecast", completed: false },
	],
};

function getComplianceStatusVariant(status: string) {
	switch (status) {
		case "Blocked":
			return "critical" as const;
		case "Pending":
		case "Action Required":
			return "warning" as const;
		case "Review":
			return "info" as const;
		case "Missing Info":
		default:
			return "neutral" as const;
	}
}

// ════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════

function KpiCard({
	title,
	value,
	change,
	changeType,
	subtitle,
	gaugeValue,
}: {
	title: string;
	value: string;
	change: string;
	changeType: "positive" | "negative" | "neutral";
	subtitle: string;
	gaugeValue: number;
}) {
	return (
		<Card className="border-0 bg-surface-container-lowest shadow-xs">
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1 min-w-0">
						<p className="text-[0.7rem] uppercase tracking-[0.08em] text-secondary">
							{title}
						</p>
						<div className="mt-1 flex items-baseline gap-2">
							<span className="font-display text-2xl font-semibold text-foreground">
								{value}
							</span>
							<span
								className={cn(
									"text-xs font-medium",
									changeType === "positive" && "text-success",
									changeType === "negative" && "text-destructive",
									changeType === "neutral" && "text-muted-foreground",
								)}
							>
								{change}
							</span>
						</div>
						<p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
					</div>
					<div className="ml-4 shrink-0">
						<CircularGauge
							value={gaugeValue}
							size="sm"
							color="hsl(var(--primary))"
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function CriticalActionCard({
	severity,
	label,
	client,
	description,
	cta,
	ctaVariant,
}: {
	severity: "critical" | "warning" | "success";
	label: string;
	client: string;
	description: string;
	cta: string;
	ctaVariant: "destructive" | "secondary" | "default";
}) {
	const severityStyles = {
		critical: {
			border: "border-destructive/20",
			bg: "bg-destructive/5",
			iconBg: "bg-destructive/15",
			iconColor: "text-destructive",
			badge: "bg-destructive/15 text-destructive",
		},
		warning: {
			border: "border-warning/20",
			bg: "bg-warning/5",
			iconBg: "bg-warning/15",
			iconColor: "text-warning",
			badge: "bg-warning/15 text-warning",
		},
		success: {
			border: "border-success/20",
			bg: "bg-success/5",
			iconBg: "bg-success/15",
			iconColor: "text-success",
			badge: "bg-success/15 text-success",
		},
	};

	const styles = severityStyles[severity];
	const Icon =
		severity === "critical"
			? AlertCircle
			: severity === "warning"
				? Clock
				: Sparkles;

	return (
		<Card className={cn("border", styles.border, styles.bg, "shadow-xs")}>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
							styles.iconBg,
						)}
					>
						<Icon className={cn("h-4 w-4", styles.iconColor)} />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<Badge
								variant="secondary"
								className={cn("rounded-full text-[0.65rem]", styles.badge)}
							>
								{label}
							</Badge>
							<span className="text-xs text-muted-foreground">{client}</span>
						</div>
						<p className="mt-1 text-sm text-foreground">{description}</p>
						<Button size="sm" variant={ctaVariant} className="mt-2">
							{cta}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ════════════════════════════════════════════════════════════

export default function AgentDashboardPage() {
	const { isOrgAdmin, isSuperAdmin } = useAuth();
	const discoveryWizard = useDiscoveryWizard();

	if (isOrgAdmin || isSuperAdmin) {
		return <AdminDashboardPageContent />;
	}
	const now = new Date();
	const greeting =
		now.getHours() < 12
			? "Good morning"
			: now.getHours() < 18
				? "Good afternoon"
				: "Good evening";

	const progressPercent = (dailyProgress.completed / dailyProgress.total) * 100;

	return (
		<div className="flex flex-col gap-8">
			{/* ════════════════════════════════════════════════════════════
			      ZONE 1: HEADER + EXECUTIVE SUMMARY KPIs
			      ════════════════════════════════════════════════════════════ */}
			<section className="space-y-6">
				{/* Header */}
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							{greeting}, Alex
						</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Here&apos;s what needs your attention today across{" "}
							{executiveKpis[0]?.value ?? "$640K"} in active pipeline.
						</p>
					</div>
					<Button onClick={() => discoveryWizard.open()}>
						<Plus className="mr-2 h-4 w-4" />
						New Discovery
					</Button>
				</div>

				{/* KPI Grid */}
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{executiveKpis.map((kpi) => (
						<KpiCard key={kpi.title} {...kpi} />
					))}
				</div>
			</section>

			{/* ════════════════════════════════════════════════════════════
			      ZONE 2: IMMEDIATE ACTION REQUIRED
			      ════════════════════════════════════════════════════════════ */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<Zap className="h-5 w-5 text-warning" />
					<h2 className="font-display text-xl font-semibold">
						Immediate Action Required
					</h2>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					{criticalActions.map((action) => (
						<CriticalActionCard key={action.id} {...action} />
					))}
				</div>
			</section>

			{/* ════════════════════════════════════════════════════════════
			      ZONE 3: STREAMS AWAITING INFORMATION (Triage Table)
			      ════════════════════════════════════════════════════════════ */}
			<section className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Layers3 className="h-5 w-5 text-primary" />
						<h2 className="font-display text-xl font-semibold">
							Streams Awaiting Information
						</h2>
					</div>
					<Button variant="outline" size="sm" asChild>
						<Link href="/streams">
							View All
							<ArrowRight className="ml-2 h-4 w-4" />
						</Link>
					</Button>
				</div>

				<Card className="border-0 bg-surface-container-lowest shadow-xs overflow-hidden">
					{/* Table Header */}
					<div className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1.2fr_auto] gap-4 px-4 py-3 bg-surface-container-low border-b border-border/50">
						<span className="text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
							Material
						</span>
						<span className="text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
							Client / Site
						</span>
						<span className="text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
							Status
						</span>
						<span className="text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
							Missing
						</span>
						<span className="text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
							Next Action
						</span>
						<span className="sr-only">Actions</span>
					</div>

					{/* Table Rows */}
					<div className="divide-y divide-border/50">
						{awaitingInfoStreams.map((stream, index) => (
							<div
								key={stream.id}
								className={cn(
									"grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1.2fr_auto] gap-4 px-4 py-3 items-center transition-colors hover:bg-surface-container-low/50",
									index % 2 === 0
										? "bg-surface"
										: "bg-surface-container-low/30",
								)}
							>
								{/* Material */}
								<div className="min-w-0">
									<p className="text-sm font-medium text-foreground truncate">
										{stream.material}
									</p>
								</div>

								{/* Client / Site */}
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarFallback className="bg-primary/10 text-[0.6rem] text-primary">
												{stream.client
													.split(" ")
													.map((n) => n[0])
													.join("")
													.slice(0, 2)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0">
											<p className="text-sm text-foreground truncate">
												{stream.client}
											</p>
											<p className="text-xs text-muted-foreground truncate">
												{stream.site}
											</p>
										</div>
									</div>
								</div>

								{/* Status */}
								<div>
									<StatusBadge
										variant={getComplianceStatusVariant(
											stream.complianceStatus,
										)}
									>
										{stream.complianceStatus}
									</StatusBadge>
								</div>

								{/* Missing Doc */}
								<div className="min-w-0">
									<p className="text-sm text-muted-foreground truncate">
										{stream.missingDoc}
									</p>
								</div>

								{/* Strategic Action */}
								<div className="min-w-0">
									<Badge
										variant="outline"
										className={cn(
											"text-xs",
											stream.priority === "critical" &&
												"border-destructive/30 text-destructive",
											stream.priority === "high" &&
												"border-warning/30 text-warning",
											stream.priority === "medium" &&
												"border-primary/30 text-primary",
											stream.priority === "low" && "border-muted-foreground/30",
										)}
									>
										{stream.strategicAction}
									</Badge>
								</div>

								{/* Actions */}
								<div className="flex items-center justify-end gap-2">
									<Button size="sm" variant="ghost" className="h-8 w-8 p-0">
										<MoreHorizontal className="h-4 w-4" />
									</Button>
									<Button size="sm">Resolve</Button>
								</div>
							</div>
						))}
					</div>
				</Card>
			</section>

			{/* ════════════════════════════════════════════════════════════
			      ZONE 4: TODAY'S STRATEGIC FOCUS (Editorial Card)
			      ════════════════════════════════════════════════════════════ */}
			<section>
				<Card className="border-0 bg-gradient-to-br from-surface-container-lowest to-surface-container-low shadow-xs">
					<CardHeader className="pb-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Building2 className="h-5 w-5 text-primary" />
								<CardTitle className="font-display text-xl font-semibold">
									Today&apos;s Strategic Focus
								</CardTitle>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span className="font-medium text-foreground">
									{dailyProgress.completed}
								</span>
								<span>/</span>
								<span>{dailyProgress.total}</span>
								<span>completed</span>
							</div>
						</div>
						<CardDescription className="mt-2">
							High-impact priorities to move the needle on your active deals.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Progress Bar */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">Daily progress</span>
								<span className="font-medium text-foreground">
									{Math.round(progressPercent)}%
								</span>
							</div>
							<Progress value={progressPercent} className="h-2" />
						</div>

						{/* Task List */}
						<div className="space-y-3">
							{dailyProgress.tasks.map((task) => (
								<div
									key={task.id}
									className={cn(
										"flex items-center gap-3 rounded-lg p-3 transition-colors",
										task.completed
											? "bg-success/5"
											: "bg-surface-container-low",
									)}
								>
									<div
										className={cn(
											"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
											task.completed
												? "border-success bg-success text-success-foreground"
												: "border-muted-foreground/30",
										)}
									>
										{task.completed && <CheckCircle2 className="h-3 w-3" />}
									</div>
									<span
										className={cn(
											"text-sm",
											task.completed
												? "text-muted-foreground line-through"
												: "text-foreground",
										)}
									>
										{task.label}
									</span>
								</div>
							))}
						</div>

						{/* CTAs */}
						<div className="flex flex-wrap gap-3 pt-2">
							<Button>
								<RefreshCw className="mr-2 h-4 w-4" />
								Sync Workspace
							</Button>
							<Button variant="outline" asChild>
								<Link href="/streams">Review All Streams</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
