"use client";

import {
	Building2,
	Edit3,
	Factory,
	MapPin,
	Phone,
	Plus,
	Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClientCreateBanner } from "@/components/features/clients/client-create-banner";
import {
	KpiCard,
	PageHeader,
	PageShell,
	StatRail,
} from "@/components/patterns";
import {
	HoverLift,
	Pressable,
} from "@/components/patterns/animations/motion-components";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { companiesAPI } from "@/lib/api/companies";
import { projectsAPI } from "@/lib/api/projects";
import type { ClientProfile } from "@/lib/mappers/company-client";
import { toClientProfile } from "@/lib/mappers/company-client";
import { resolveCompanyDetailRedirect } from "@/lib/routing/company-detail-redirect";

const EditClientModal = dynamic(
	() =>
		import("@/components/features/modals/edit-client-modal").then(
			(mod) => mod.EditClientModal,
		),
	{ ssr: false, loading: () => null },
);

export default function LeadDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const searchParams = useSearchParams();
	const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
	const createState = searchParams.get("create");

	const [profile, setProfile] = useState<ClientProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [creatingStream, setCreatingStream] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);

	const fetchProfile = useCallback(async () => {
		if (!companyId) return;
		try {
			setLoading(true);
			setError(null);
			const companyDetail = await companiesAPI.get(companyId);
			setProfile(toClientProfile(companyDetail));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load lead");
		} finally {
			setLoading(false);
		}
	}, [companyId]);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	useEffect(() => {
		const redirectTarget = resolveCompanyDetailRedirect({
			companyId: profile?.id,
			accountStatus: profile?.accountStatus,
			origin: "lead",
		});
		if (redirectTarget) router.replace(redirectTarget);
	}, [profile, router]);

	const handleCreateFirstStream = useCallback(async () => {
		if (!profile || creatingStream) return;
		const firstLocation = profile.locations[0];
		if (!firstLocation) {
			setError("Add at least one location before creating the first stream.");
			return;
		}

		try {
			setCreatingStream(true);
			await projectsAPI.createProject({
				locationId: firstLocation.id,
				name: `${profile.name} - First Stream`,
			});
			router.push(`/clients/${profile.id}`);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create first stream",
			);
		} finally {
			setCreatingStream(false);
		}
	}, [profile, creatingStream, router]);

	if (loading) {
		return <PageShell>Loading lead…</PageShell>;
	}

	if (error || !profile) {
		return (
			<PageShell>
				<div className="flex flex-col items-center gap-3 py-24">
					<p className="text-sm text-destructive">
						{error ?? "Lead not found"}
					</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/leads")}
					>
						Back to leads
					</Button>
				</div>
			</PageShell>
		);
	}

	const redirectTarget = resolveCompanyDetailRedirect({
		companyId: profile.id,
		accountStatus: profile.accountStatus,
		origin: "lead",
	});

	if (redirectTarget) {
		return null;
	}

	const primaryContact = profile.primaryContact;

	return (
		<PageShell>
			<ClientCreateBanner createState={createState} />

			<EditClientModal
				profile={profile}
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				onSaved={fetchProfile}
			/>

			<PageHeader
				title={profile.name}
				subtitle={profile.industry}
				icon={Factory}
				badge="Lead"
				breadcrumbs={[
					{ label: "Leads", href: "/leads" },
					{ label: profile.name },
				]}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Pressable>
							<Button
								onClick={handleCreateFirstStream}
								disabled={creatingStream}
							>
								<Plus className="mr-1.5 h-4 w-4" />
								Create first stream
							</Button>
						</Pressable>
						<Pressable>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEditModalOpen(true)}
							>
								<Edit3 className="mr-1.5 h-4 w-4" />
								Edit
							</Button>
						</Pressable>
						<Pressable>
							<Button variant="outline" size="sm" asChild>
								<Link href={`/clients/${companyId}/locations`}>
									<MapPin className="mr-1.5 h-4 w-4" />
									Locations
								</Link>
							</Button>
						</Pressable>
						<Pressable>
							<Button variant="outline" size="sm" asChild>
								<Link href={`/clients/${companyId}/contacts`}>
									<Users className="mr-1.5 h-4 w-4" />
									Contacts
								</Link>
							</Button>
						</Pressable>
					</div>
				}
			/>

			<StatRail columns={2}>
				<HoverLift>
					<KpiCard
						title="Locations"
						value={profile.locations.length}
						subtitle="Lead facilities"
						icon={MapPin}
						variant="default"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Lifecycle"
						value="Lead"
						subtitle="Converts on first stream"
						icon={Building2}
						variant="warning"
					/>
				</HoverLift>
			</StatRail>

			{error ? <p className="text-sm text-destructive">{error}</p> : null}

			<section className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base font-semibold">
							Primary Contact
						</CardTitle>
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
									{primaryContact.title ? (
										<p className="text-sm text-muted-foreground">
											{primaryContact.title}
										</p>
									) : null}
									{primaryContact.phone ? (
										<p className="flex items-center gap-2 text-sm text-muted-foreground">
											<Phone className="h-3.5 w-3.5" />
											{primaryContact.phone}
										</p>
									) : null}
								</div>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								No primary contact assigned. Edit the profile to assign one.
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base font-semibold">
							First Stream
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Leads cannot use stream workflows until their first stream is
							created. Create the first stream to convert this lead into an
							active client.
						</p>
						<Button onClick={handleCreateFirstStream} disabled={creatingStream}>
							<Plus className="mr-1.5 h-4 w-4" />
							Create first stream
						</Button>
					</CardContent>
				</Card>
			</section>
		</PageShell>
	);
}
