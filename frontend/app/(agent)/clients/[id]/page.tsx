"use client";

import {
	Activity,
	AlertTriangle,
	Building2,
	CheckCircle,
	ChevronLeft,
	Clock,
	DollarSign,
	Edit3,
	Factory,
	FileWarning,
	Flag,
	FlaskConical,
	Loader2,
	Mail,
	MapPin,
	MessageSquare,
	MoreVertical,
	Phone,
	Shapes,
	Sparkles,
	Target,
	TrendingUp,
	Users,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClientCreateBanner } from "@/components/features/clients/client-create-banner";
import { EditClientModal } from "@/components/features/modals/edit-client-modal";
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
import { MetricCard } from "@/components/ui/metric-card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { companiesAPI } from "@/lib/api/companies";
import { projectsAPI } from "@/lib/api/projects";
import type { ClientProfile } from "@/lib/mappers/company-client";
import { toClientProfile } from "@/lib/mappers/company-client";
import type { ProjectSummary } from "@/lib/project-types";

export default function ClientDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const searchParams = useSearchParams();
	const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
	const createState = searchParams.get("create");

	const [profile, setProfile] = useState<ClientProfile | null>(null);
	const [projects, setProjects] = useState<ProjectSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editModalOpen, setEditModalOpen] = useState(false);

	const fetchProfile = useCallback(async () => {
		if (!companyId) return;
		try {
			setLoading(true);
			setError(null);

			const [companyDetail, projectsResponse] = await Promise.all([
				companiesAPI.get(companyId),
				projectsAPI.getProjects({ companyId, size: 100 }),
			]);

			setProfile(toClientProfile(companyDetail));
			setProjects(projectsResponse.items ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load client");
		} finally {
			setLoading(false);
		}
	}, [companyId]);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	if (loading) {
		return (
			<div className="flex items-center justify-center gap-3 px-6 py-24">
				<Loader2 className="size-5 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Loading client…</p>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="flex flex-col items-center gap-3 px-6 py-24">
				<p className="text-sm text-destructive">
					{error ?? "Client not found"}
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push("/clients")}
				>
					Back to portfolio
				</Button>
			</div>
		);
	}

	const primaryContact = profile.primaryContact;

	// Mock data for new UI elements (visual placeholders)
	const mockRevenue = "$840k";
	const mockRevenueTrend = "+12%";
	const mockHealthIndex = 94;
	const mockAvgAccepted = "94.2%";
	const mockDiscoveryScore = 88;

	// Mock alerts for visual demonstration
	const mockAlerts = [
		{
			id: 1,
			severity: "critical" as const,
			title: "Missing Documentation",
			description:
				"SDS/COA required for Benzene Solvent Recovery (#PR-8828) or 12 days.",
			icon: FileWarning,
		},
		{
			id: 2,
			severity: "warning" as const,
			title: "Stalemate Deal 15",
			description:
				"Sent Addie Bodman (#TR-44-12) five times in draft for 5 days.",
			icon: Clock,
		},
		{
			id: 3,
			severity: "info" as const,
			title: "Pending Offer",
			description:
				"Mixed Hydrocarbon Sludge (S18-#8-#9) awaiting final approval for 6 days.",
			icon: MessageSquare,
		},
	];

	// Mock next steps for visual demonstration
	const mockNextSteps = [
		{
			id: "step-1",
			text: "Upload SDS for Benzene Solvent Recovery to unlock upcoming pickup.",
		},
		{
			id: "step-2",
			text: "Complete Phase 3 Discovery for Nitric Acid stream in Building 4C.",
		},
		{
			id: "step-3",
			text: "Follow up on Pending Offer #PR-8821 with Facility Manager Thorne.",
		},
	];

	return (
		<div className="flex flex-col gap-6">
			<ClientCreateBanner createState={createState} />

			<EditClientModal
				profile={profile}
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				onSaved={fetchProfile}
			/>

			{/* ── Header ── */}
			<section className="flex flex-col gap-4">
				{/* Breadcrumb */}
				<Button
					variant="ghost"
					size="sm"
					className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
					onClick={() => router.push("/clients")}
				>
					<ChevronLeft className="mr-1 h-4 w-4" />
					Clients
				</Button>

				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex flex-col gap-3">
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							{profile.name}
						</h1>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="muted" className="gap-1">
								<Factory className="h-3 w-3" />
								Industry: {profile.industry}
							</Badge>
							<Badge variant="muted">Account: #{companyId?.slice(-4)}</Badge>
							<Badge
								variant="success"
								className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
							>
								Active
							</Badge>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setEditModalOpen(true)}
						>
							<Edit3 className="mr-1.5 h-4 w-4" />
							Edit
						</Button>
						<Button variant="outline" size="sm">
							<MapPin className="mr-1.5 h-4 w-4" />
							Locations
						</Button>
						<Button size="sm">
							<Users className="mr-1.5 h-4 w-4" />
							Contacts
						</Button>
					</div>
				</div>
			</section>

			{/* ── KPI Stats Cards (4 columns) ── */}
			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="relative overflow-hidden">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Total Revenue
							</p>
							<div className="rounded-lg bg-amber-100 p-1.5">
								<DollarSign className="h-4 w-4 text-amber-600" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-baseline gap-2">
							<p className="text-3xl font-bold tracking-tight">{mockRevenue}</p>
							<Badge variant="success" className="rounded-full text-xs">
								{mockRevenueTrend}
							</Badge>
						</div>
					</CardContent>
				</Card>

				<MetricCard
					icon={Activity}
					label="Active Streams"
					value={projects.length}
					subtitle={`Across ${profile.locations.length} facilities`}
					variant="primary"
				/>

				<Card className="relative overflow-hidden">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Average Accepted
							</p>
							<div className="rounded-lg bg-emerald-100 p-1.5">
								<CheckCircle className="h-4 w-4 text-emerald-600" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-baseline gap-2">
							<p className="text-3xl font-bold tracking-tight">
								{mockAvgAccepted}
							</p>
						</div>
						<p className="text-xs text-muted-foreground mt-1">Target: 92%</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden">
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Discovery Score
							</p>
							<div className="rounded-lg bg-cyan-100 p-1.5">
								<Target className="h-4 w-4 text-cyan-600" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<p className="text-3xl font-bold tracking-tight">
								{mockDiscoveryScore}
							</p>
							<TrendingUp className="h-5 w-5 text-emerald-500" />
						</div>
					</CardContent>
				</Card>
			</section>

			{/* ── Three Column Insights Grid ── */}
			<section className="grid gap-4 lg:grid-cols-3">
				{/* Account Insights */}
				<Card className="flex flex-col">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="rounded-lg bg-primary/10 p-1.5">
								<Building2 className="h-4 w-4 text-primary" />
							</div>
							<CardTitle className="text-base font-semibold">
								Account Insights
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex-1 space-y-4">
						<p className="text-sm text-muted-foreground leading-relaxed">
							{profile.notes ||
								`${profile.name} currently maintains ${projects.length} active streams distributed across ${profile.locations.length} primary facilities. Overall efficiency is high, but administrative overhead is increasing.`}
						</p>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">Stream Health Index</span>
								<span className="text-emerald-600 font-medium">
									Excellent ({mockHealthIndex}%)
								</span>
							</div>
							<Progress value={mockHealthIndex} className="h-2" />
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<div>
									<span className="font-medium">Documentation Status</span>
									<p className="text-xs text-muted-foreground">
										Action Required
									</p>
								</div>
								<span className="text-destructive font-medium text-sm">
									Action Required
								</span>
							</div>
							<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
								<div className="h-full w-[65%] bg-emerald-500 rounded-full" />
							</div>
							<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
								<div className="h-full w-[35%] bg-destructive rounded-full" />
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Critical Alerts */}
				<Card className="flex flex-col border-l-4 border-l-amber-500">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="rounded-lg bg-amber-100 p-1.5">
								<AlertTriangle className="h-4 w-4 text-amber-600" />
							</div>
							<CardTitle className="text-base font-semibold">
								Critical Alerts
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex-1 space-y-3">
						{mockAlerts.map((alert) => (
							<div key={alert.id} className="rounded-lg border p-3 space-y-1">
								<div className="flex items-start gap-2">
									<alert.icon
										className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
											alert.severity === "critical"
												? "text-destructive"
												: alert.severity === "warning"
													? "text-amber-500"
													: "text-blue-500"
										}`}
									/>
									<div className="space-y-0.5">
										<p
											className={`text-xs font-semibold uppercase tracking-wide ${
												alert.severity === "critical"
													? "text-destructive"
													: alert.severity === "warning"
														? "text-amber-600"
														: "text-blue-600"
											}`}
										>
											{alert.title}
										</p>
										<p className="text-xs text-muted-foreground leading-relaxed">
											{alert.description}
										</p>
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				{/* Strategic Next Steps */}
				<Card className="flex flex-col bg-teal-700 text-white border-teal-600">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-2">
							<div className="rounded-lg bg-teal-600 p-1.5">
								<Flag className="h-4 w-4 text-white" />
							</div>
							<CardTitle className="text-base font-semibold text-white">
								Strategic Next Steps
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="flex-1 flex flex-col">
						<ol className="space-y-3 flex-1">
							{mockNextSteps.map((step) => (
								<li key={step.id} className="flex gap-3">
									<span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-medium">
										{mockNextSteps.indexOf(step) + 1}
									</span>
									<p className="text-sm leading-relaxed text-teal-50">
										{step.text}
									</p>
								</li>
							))}
						</ol>
						<Button
							variant="secondary"
							className="mt-4 w-full bg-white text-teal-700 hover:bg-teal-50"
						>
							<Sparkles className="mr-1.5 h-4 w-4" />
							Launch Discovery Wizard
						</Button>
					</CardContent>
				</Card>
			</section>

			{/* ── Contact + Locations ── */}
			<section className="grid gap-4 lg:grid-cols-2">
				{/* Contact information */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base font-semibold">
							Primary Contact
						</CardTitle>
						<CardDescription>
							Main point of contact for this account
						</CardDescription>
					</CardHeader>
					<CardContent>
						{primaryContact ? (
							<div className="flex items-start gap-4">
								<Avatar className="h-10 w-10">
									<AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
										{primaryContact.name
											.split(" ")
											.map((part) => part[0])
											.join("")
											.slice(0, 2)
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="space-y-1">
									<p className="font-medium">{primaryContact.name}</p>
									{primaryContact.title && (
										<p className="text-sm text-muted-foreground">
											{primaryContact.title}
										</p>
									)}
									<div className="pt-2 space-y-1">
										{primaryContact.phone && (
											<p className="flex items-center gap-2 text-sm text-muted-foreground">
												<Phone className="h-3.5 w-3.5" />
												{primaryContact.phone}
											</p>
										)}
										{primaryContact.email && (
											<p className="flex items-center gap-2 text-sm text-muted-foreground">
												<Mail className="h-3.5 w-3.5" />
												{primaryContact.email}
											</p>
										)}
									</div>
								</div>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								No primary contact assigned. Edit the profile to assign one.
							</p>
						)}
					</CardContent>
				</Card>

				{/* Locations */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base font-semibold">Locations</CardTitle>
						<CardDescription>
							Registered facilities for this company
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{profile.locations.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No locations registered yet.
							</p>
						) : (
							profile.locations.slice(0, 3).map((location) => (
								<div
									key={location.id}
									className="flex items-start justify-between gap-3 rounded-lg border p-3"
								>
									<div className="min-w-0">
										<p className="font-medium text-sm">{location.name}</p>
										{location.address && (
											<p className="text-xs text-muted-foreground">
												{location.address}
											</p>
										)}
										<p className="text-xs text-muted-foreground">
											{location.city}, {location.state}
										</p>
									</div>
									<Badge
										variant="outline"
										className="rounded-full text-xs flex-shrink-0"
									>
										{location.projectCount} project
										{location.projectCount !== 1 ? "s" : ""}
									</Badge>
								</div>
							))
						)}
						{profile.locations.length > 3 && (
							<Button variant="ghost" size="sm" className="w-full">
								View all {profile.locations.length} locations
							</Button>
						)}
					</CardContent>
				</Card>
			</section>

			{/* ── Streams Table with Tabs ── */}
			<Card>
				<CardHeader className="pb-0">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle className="text-base font-semibold">
								Waste Streams
							</CardTitle>
							<CardDescription>
								Projects tracked for this account
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm">
								<Shapes className="mr-1.5 h-4 w-4" />
								Filter
							</Button>
							<Button variant="outline" size="sm">
								Download
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="pt-6">
					<Tabs defaultValue="all" className="w-full">
						<TabsList className="w-fit mb-4">
							<TabsTrigger value="all">All Streams</TabsTrigger>
							<TabsTrigger value="drafts">Drafts</TabsTrigger>
							<TabsTrigger value="missing">Missing Information</TabsTrigger>
						</TabsList>

						<TabsContent value="all" className="mt-0">
							{projects.length === 0 ? (
								<div className="rounded-lg border border-dashed p-8 text-center">
									<p className="text-sm text-muted-foreground">
										No waste streams associated with this client yet.
									</p>
									<Button className="mt-4" size="sm">
										<Sparkles className="mr-1.5 h-4 w-4" />
										Launch Discovery Wizard
									</Button>
								</div>
							) : (
								<div className="rounded-lg border">
									<Table>
										<TableHeader>
											<TableRow className="bg-muted/50 hover:bg-muted/50">
												<TableHead className="w-[280px]">Material</TableHead>
												<TableHead>Location</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Volume</TableHead>
												<TableHead>Frequency</TableHead>
												<TableHead className="w-[50px]"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{projects.map((project) => (
												<TableRow
													key={project.id}
													className="cursor-pointer"
													onClick={() => router.push(`/streams/${project.id}`)}
												>
													<TableCell>
														<div className="flex items-center gap-3">
															<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
																<FlaskConical className="h-4 w-4 text-primary" />
															</div>
															<div>
																<p className="font-medium">{project.name}</p>
																<p className="text-xs text-muted-foreground">
																	ID: {project.id.slice(0, 8)}
																</p>
															</div>
														</div>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{project.locationName ?? project.location ?? "—"}
													</TableCell>
													<TableCell>
														<StatusBadge
															status={
																project.proposalsCount > 0 ? "OPEN" : "DRAFT"
															}
														/>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														14,200 L
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														Monthly
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															onClick={(e) => {
																e.stopPropagation();
															}}
														>
															<MoreVertical className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
							<div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
								<p>
									Showing {Math.min(projects.length, 10)} of {projects.length}{" "}
									active streams
								</p>
								<div className="flex items-center gap-1">
									<Button variant="ghost" size="icon" className="h-7 w-7">
										&lt;
									</Button>
									<span>1</span>
									<Button variant="ghost" size="icon" className="h-7 w-7">
										&gt;
									</Button>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="drafts" className="mt-0">
							<div className="rounded-lg border border-dashed p-8 text-center">
								<p className="text-sm text-muted-foreground">
									No drafts found for this client.
								</p>
							</div>
						</TabsContent>

						<TabsContent value="missing" className="mt-0">
							<div className="rounded-lg border border-dashed p-8 text-center">
								<p className="text-sm text-muted-foreground">
									No streams with missing information.
								</p>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}
