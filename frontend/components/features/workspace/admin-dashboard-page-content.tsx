"use client";

import {
	AlertTriangle,
	ArrowRight,
	BarChart3,
	Layers,
	Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KPI_SUMMARY = [
	{
		label: "Open opportunities",
		value: "38",
		note: "+6 this week",
		icon: Layers,
	},
	{
		label: "Team utilization",
		value: "82%",
		note: "4 agents near capacity",
		icon: Users,
	},
	{
		label: "At-risk streams",
		value: "7",
		note: "Need action in 24h",
		icon: AlertTriangle,
	},
	{
		label: "Win rate (30d)",
		value: "31%",
		note: "+3 pts vs prior",
		icon: BarChart3,
	},
];

const TEAM_ALERTS = [
	"2 members require role updates",
	"1 pending invite expiring today",
	"3 inactive users this month",
];

type AdminDashboardPageContentProps = {
	streamsPath?: string;
	teamPath?: string;
};

export function AdminDashboardPageContent({
	streamsPath = "/admin/streams",
	teamPath = "/admin/team",
}: AdminDashboardPageContentProps) {
	return (
		<div className="space-y-6">
			<section className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
				<p className="text-sm text-muted-foreground">
					Supervision view for organization performance, team activity, and
					stream health.
				</p>
			</section>

			<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{KPI_SUMMARY.map((item) => {
					const Icon = item.icon;
					return (
						<Card key={item.label}>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm font-medium text-muted-foreground">
										{item.label}
									</CardTitle>
									<Icon className="h-4 w-4 text-muted-foreground" />
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-2xl font-semibold">{item.value}</p>
								<p className="text-xs text-muted-foreground">{item.note}</p>
							</CardContent>
						</Card>
					);
				})}
			</section>

			<section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Streams by agent</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>
							Monitor workload and unblock delayed streams from Team Management
							and Streams.
						</p>
						<div className="flex flex-wrap gap-2">
							<Badge variant="outline">Ana · 12 streams</Badge>
							<Badge variant="outline">Marco · 9 streams</Badge>
							<Badge variant="outline">Lu · 8 streams</Badge>
						</div>
						<div className="flex flex-wrap gap-2 pt-1">
							<Button asChild size="sm" variant="outline">
								<Link href={streamsPath}>Open streams board</Link>
							</Button>
							<Button asChild size="sm">
								<Link href={teamPath}>
									Team Management
									<ArrowRight className="ml-1.5 h-4 w-4" />
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Team alerts</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2 text-sm">
							{TEAM_ALERTS.map((alert) => (
								<li key={alert} className="text-muted-foreground">
									• {alert}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
