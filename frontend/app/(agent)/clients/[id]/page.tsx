"use client";

import {
	Building2,
	Factory,
	Loader2,
	Mail,
	MapPin,
	PenSquare,
	Phone,
	Shapes,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClientCreateBanner } from "@/components/features/clients/client-create-banner";
import { ClientSummaryStatCard } from "@/components/features/clients/components/client-summary-stat-card";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { companiesAPI } from "@/lib/api/companies";
import { projectsAPI } from "@/lib/api/projects";
import type { ClientProfile } from "@/lib/mappers/company-client";
import {
	formatOffersCountSignal,
	toClientProfile,
} from "@/lib/mappers/company-client";
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

	return (
		<div className="flex flex-col gap-8">
			<ClientCreateBanner createState={createState} />

			<EditClientModal
				profile={profile}
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				onSaved={fetchProfile}
			/>

			{/* ── Header ── */}
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex flex-col gap-2">
						<p className="text-xs uppercase tracking-[0.08em] text-secondary">
							Clients
						</p>
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							{profile.name}
						</h1>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							{profile.industry && (
								<span className="inline-flex items-center gap-1">
									<Factory aria-hidden="true" className="size-3.5" />
									{profile.industry}
								</span>
							)}
							{profile.sector && (
								<Badge
									variant="secondary"
									className="rounded-full text-[0.68rem]"
								>
									{profile.sector}
								</Badge>
							)}
						</div>
						{profile.notes && (
							<p className="max-w-3xl text-sm text-muted-foreground">
								{profile.notes}
							</p>
						)}
					</div>

					<div className="flex flex-wrap gap-2">
						<Button variant="outline" onClick={() => setEditModalOpen(true)}>
							<PenSquare data-icon="inline-start" aria-hidden="true" />
							Edit Profile
						</Button>
					</div>
				</div>
			</section>

			{/* ── Summary stats ── */}
			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<ClientSummaryStatCard
					label="Locations"
					value={`${profile.locationCount}`}
					subtitle="Registered facilities"
					icon={MapPin}
				/>
				<ClientSummaryStatCard
					label="Waste streams"
					value={`${projects.length}`}
					subtitle="Associated projects"
					icon={Shapes}
				/>
				<ClientSummaryStatCard
					label="Contacts"
					value={`${profile.contacts.length}`}
					subtitle="Company contacts"
					icon={Building2}
				/>
			</section>

			{/* ── Contact + Locations ── */}
			<section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
				{/* Contact information */}
				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold">
							Primary contact
						</CardTitle>
						<CardDescription>
							Main point of contact for this account.
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						{primaryContact ? (
							<div className="rounded-xl bg-surface p-4">
								<div className="flex items-start gap-3">
									<Avatar className="size-9">
										<AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
											{primaryContact.name
												.split(" ")
												.map((part) => part[0])
												.join("")
												.slice(0, 2)
												.toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex min-w-0 flex-1 flex-col gap-1">
										<p className="text-sm font-semibold text-foreground">
											{primaryContact.name || "—"}
										</p>
										{primaryContact.title && (
											<p className="text-xs text-muted-foreground">
												{primaryContact.title}
											</p>
										)}
										{primaryContact.phone && (
											<p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
												<Phone aria-hidden="true" className="size-3.5" />
												{primaryContact.phone}
											</p>
										)}
										{primaryContact.email && (
											<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
												<Mail aria-hidden="true" className="size-3.5" />
												{primaryContact.email}
											</p>
										)}
									</div>
								</div>
							</div>
						) : (
							<p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
								No primary contact assigned. Edit the profile to assign one.
							</p>
						)}
					</CardContent>
				</Card>

				{/* Locations */}
				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold">
							Locations
						</CardTitle>
						<CardDescription>
							Registered facilities for this company.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2 pt-0">
						{profile.locations.length === 0 ? (
							<p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
								No locations registered yet.
							</p>
						) : (
							profile.locations.map((location, index) => (
								<div
									key={location.id}
									className={
										index % 2 === 0
											? "rounded-xl bg-surface p-3"
											: "rounded-xl bg-surface-container-low p-3"
									}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="text-sm font-semibold text-foreground">
												{location.name}
											</p>
											{location.address && (
												<p className="mt-1 text-xs text-muted-foreground">
													{location.address}
												</p>
											)}
											<p className="text-xs text-muted-foreground">
												{location.city}, {location.state}
											</p>
										</div>
										<Badge variant="outline" className="rounded-full">
											{location.projectCount} project
											{location.projectCount !== 1 ? "s" : ""}
										</Badge>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</section>

			{/* ── Associated waste streams (from Projects) ── */}
			<Card className="bg-surface-container-lowest shadow-sm">
				<CardHeader>
					<CardTitle className="font-display text-xl font-semibold">
						Associated waste streams
					</CardTitle>
					<CardDescription>Projects tracked for this account.</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">
					{projects.length === 0 ? (
						<p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
							No waste streams associated with this client yet. Use the
							Discovery Wizard to add new streams.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="bg-surface-container-low">
									<TableHead className="px-4 py-3 text-[0.68rem]">
										Name
									</TableHead>
									<TableHead className="px-4 py-3 text-[0.68rem]">
										Location
									</TableHead>
									<TableHead className="px-4 py-3 text-[0.68rem]">
										Offers
									</TableHead>
									<TableHead className="px-4 py-3 text-right text-[0.68rem]">
										Updated
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{projects.map((project, index) => (
									<TableRow
										key={project.id}
										onClick={() => router.push(`/streams/${project.id}`)}
										className={
											index % 2 === 0
												? "cursor-pointer bg-surface transition-colors hover:bg-surface-container"
												: "cursor-pointer bg-surface-container-low transition-colors hover:bg-surface-container"
										}
									>
										<TableCell className="px-4 py-3">
											<p className="text-sm font-medium text-foreground">
												{project.name}
											</p>
											<p className="text-xs text-muted-foreground">
												{project.id.slice(0, 8)}
											</p>
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground">
											{project.locationName ?? project.location ?? "—"}
										</TableCell>
										<TableCell className="px-4 py-3">
											<Badge
												variant="outline"
												className="rounded-full text-[0.65rem]"
											>
												{formatOffersCountSignal(project.proposalsCount)}
											</Badge>
										</TableCell>
										<TableCell className="px-4 py-3 text-right text-sm text-muted-foreground">
											{new Date(project.updatedAt).toLocaleDateString()}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
