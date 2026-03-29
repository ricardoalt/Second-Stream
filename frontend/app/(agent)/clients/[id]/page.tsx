"use client";

import {
	AlertTriangle,
	CircleAlert,
	Factory,
	FileText,
	Globe,
	Mail,
	MapPin,
	PenSquare,
	Phone,
	Shapes,
	Sparkles,
	Target,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ClientActivityTimeline } from "@/components/features/clients/components/client-activity-timeline";
import { ClientStatusBadge } from "@/components/features/clients/components/client-status-badge";
import { ClientSummaryStatCard } from "@/components/features/clients/components/client-summary-stat-card";
import { getClientDetail } from "@/components/features/clients/mock-data";
import { CallClientModal } from "@/components/features/modals/call-client-modal";
import { EditClientModal } from "@/components/features/modals/edit-client-modal";
import { LogActivityModal } from "@/components/features/modals/log-activity-modal";
import { SendEmailModal } from "@/components/features/modals/send-email-modal";
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
import { StatusBadge } from "@/components/ui/status-badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

function getStreamStatusBadge(status: "active" | "draft" | "missing_info") {
	return <StatusBadge status={status} className="text-[0.65rem]" />;
}

function getOfferStatusBadge(
	status: "draft" | "sent" | "negotiation" | "won" | "pending",
) {
	return <StatusBadge status={status} className="text-[0.65rem]" />;
}

export default function ClientDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
	const client = getClientDetail(clientId);
	const [callOpen, setCallOpen] = useState<boolean>(false);
	const [emailOpen, setEmailOpen] = useState<boolean>(false);
	const [logOpen, setLogOpen] = useState<boolean>(false);
	const [editModalOpen, setEditModalOpen] = useState(false);

	const callContacts = client.keyContacts.map((contact) => ({
		id: contact.id,
		name: contact.name,
		role: contact.role,
		phone: contact.phone,
	}));

	const relatedStreams = client.streams.map((stream) => ({
		id: stream.id,
		label: `${stream.material} (${stream.id})`,
	}));

	return (
		<div className="flex flex-col gap-8">
			<CallClientModal
				open={callOpen}
				onOpenChange={setCallOpen}
				contacts={callContacts}
			/>
			<SendEmailModal
				open={emailOpen}
				onOpenChange={setEmailOpen}
				defaultTo={client.contactEmail}
			/>
			<LogActivityModal
				open={logOpen}
				onOpenChange={setLogOpen}
				relatedStreams={relatedStreams}
			/>
			<EditClientModal
				client={client}
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
			/>
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex flex-col gap-2">
						<p className="text-xs uppercase tracking-[0.08em] text-secondary">
							Clients · {client.accountId}
						</p>
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							{client.name}
						</h1>
						<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							<span className="inline-flex items-center gap-1">
								<Factory aria-hidden="true" className="size-3.5" />
								{client.industry}
							</span>
							<ClientStatusBadge status={client.status} />
						</div>
						<p className="max-w-3xl text-sm text-muted-foreground">
							{client.summary}
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button variant="outline" onClick={() => setEditModalOpen(true)}>
							<PenSquare data-icon="inline-start" aria-hidden="true" />
							Edit Profile
						</Button>
						<Button variant="secondary" onClick={() => setCallOpen(true)}>
							<Phone data-icon="inline-start" aria-hidden="true" />
							Call
						</Button>
						<Button variant="secondary" onClick={() => setEmailOpen(true)}>
							<Mail data-icon="inline-start" aria-hidden="true" />
							Email
						</Button>
						<Button onClick={() => setLogOpen(true)}>
							<FileText data-icon="inline-start" aria-hidden="true" />
							Log Activity
						</Button>
					</div>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<ClientSummaryStatCard
					label="Total streams"
					value={`${client.stats.totalStreams}`}
					subtitle="Across all facilities"
					icon={Shapes}
				/>
				<ClientSummaryStatCard
					label="Active offers"
					value={`${client.stats.activeOffers}`}
					subtitle="In pending or negotiation"
					icon={FileText}
				/>
				<ClientSummaryStatCard
					label="Open issues"
					value={`${client.stats.openIssues}`}
					subtitle="Documentation and stale drafts"
					icon={CircleAlert}
				/>
				<ClientSummaryStatCard
					label="Win rate"
					value={`${client.stats.winRate}%`}
					subtitle="Trailing 12 months"
					icon={TrendingUp}
				/>
			</section>

			{/* Stitch pattern: Strategic Intelligence section */}
			<section className="grid gap-4 xl:grid-cols-3">
				<div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 shadow-sm">
					<div className="mb-3 flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
						<h3 className="font-display text-lg font-semibold text-foreground">
							Critical Alerts
						</h3>
					</div>
					<div className="space-y-3">
						<div className="rounded-xl bg-surface-container-lowest p-3 shadow-sm">
							<p className="text-sm font-medium text-foreground">
								Infectious Solid Waste — Compliance Blocked
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Updated transport manifest required by EOD
							</p>
							<Button size="sm" variant="destructive" className="mt-2 w-full">
								Resolve Now
							</Button>
						</div>
					</div>
				</div>

				<div className="rounded-2xl bg-primary/5 p-5 shadow-sm border border-primary/20">
					<div className="mb-3 flex items-center gap-2">
						<Target className="h-5 w-5 text-primary" aria-hidden />
						<h3 className="font-display text-lg font-semibold text-foreground">
							Strategic Next Steps
						</h3>
					</div>
					<div className="space-y-2">
						<div className="flex items-start gap-2">
							<div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
							<div>
								<p className="text-sm text-foreground">
									Schedule site visit for Catalyst Slurry assessment
								</p>
								<p className="text-xs text-muted-foreground">
									Priority: High • Due: This week
								</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
							<div>
								<p className="text-sm text-foreground">
									Present solvent recovery ROI to operations team
								</p>
								<p className="text-xs text-muted-foreground">
									Priority: Medium • Awaiting approval
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
					<div className="mb-3 flex items-center gap-2">
						<Sparkles className="h-5 w-5 text-warning" aria-hidden />
						<h3 className="font-display text-lg font-semibold text-foreground">
							Account Intelligence
						</h3>
					</div>
					<div className="rounded-xl bg-warning/5 p-3 border border-warning/20">
						<p className="text-xs font-medium text-warning uppercase tracking-wide">
							AI Insight
						</p>
						<p className="text-sm text-foreground mt-2">
							{client.name} has 2 additional facilities in the region with
							similar waste profiles. Expansion opportunity detected.
						</p>
						<Button size="sm" variant="outline" className="mt-3 w-full">
							Explore Expansion
						</Button>
					</div>
				</div>
			</section>

			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="mb-4 flex items-center gap-2">
					<MapPin aria-hidden className="size-5 text-primary" />
					<h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
						Locations
					</h2>
				</div>
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{client.locations.map((location) => (
						<div
							key={location.id}
							className="rounded-xl bg-surface-container-lowest p-4 shadow-sm"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="text-sm font-semibold text-foreground">
										{location.name}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{location.address}
									</p>
									<p className="text-xs text-muted-foreground">
										{location.city}, {location.state}
									</p>
								</div>
								<Badge variant="outline" className="rounded-full">
									{location.streamCount} streams
								</Badge>
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold">
							Contact information
						</CardTitle>
						<CardDescription>
							Primary account details and communication channels.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 pt-0 sm:grid-cols-2">
						<div className="rounded-xl bg-surface p-4">
							<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
								Address
							</p>
							<p className="mt-2 inline-flex items-start gap-2 text-sm text-foreground">
								<MapPin aria-hidden="true" className="mt-0.5 size-4" />
								{client.address}
							</p>
						</div>
						<div className="rounded-xl bg-surface p-4">
							<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
								Primary contact
							</p>
							<p className="mt-2 text-sm font-semibold text-foreground">
								{client.contactName}
							</p>
							<p className="text-xs text-muted-foreground">
								{client.contactRole}
							</p>
							<p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
								<Phone aria-hidden="true" className="size-3.5" />
								{client.contactPhone}
							</p>
							<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
								<Mail aria-hidden="true" className="size-3.5" />
								{client.contactEmail}
							</p>
							<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
								<Globe aria-hidden="true" className="size-3.5" />
								<Link
									href={client.website}
									target="_blank"
									className="text-primary hover:underline"
								>
									{client.website}
								</Link>
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold">
							Key people
						</CardTitle>
						<CardDescription>
							Stakeholders and on-site contacts for account execution.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2 pt-0">
						{client.keyContacts.map((contact, index) => (
							<div
								key={contact.id}
								className={
									index % 2 === 0
										? "rounded-xl bg-surface p-3"
										: "rounded-xl bg-surface-container-low p-3"
								}
							>
								<div className="flex items-start gap-3">
									<Avatar className="size-9">
										<AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
											{contact.name
												.split(" ")
												.map((part) => part[0])
												.join("")
												.slice(0, 2)
												.toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex min-w-0 flex-1 flex-col gap-1">
										<p className="text-sm font-semibold text-foreground">
											{contact.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{contact.role}
										</p>
										<p className="text-xs text-muted-foreground">
											{contact.email}
										</p>
										<p className="text-xs text-muted-foreground">
											{contact.phone}
										</p>
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold">
							Associated waste streams
						</CardTitle>
						<CardDescription>
							Material lines currently tracked for this account.
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<Table>
							<TableHeader>
								<TableRow className="bg-surface-container-low">
									<TableHead className="px-4 py-3 text-[0.68rem]">
										Material
									</TableHead>
									<TableHead className="px-4 py-3 text-[0.68rem]">
										Location
									</TableHead>
									<TableHead className="px-4 py-3 text-[0.68rem]">
										Status
									</TableHead>
									<TableHead className="px-4 py-3 text-[0.68rem]">
										Volume
									</TableHead>
									<TableHead className="px-4 py-3 text-right text-[0.68rem]">
										Last updated
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{client.streams.map((stream, index) => (
									<TableRow
										key={stream.id}
										onClick={() => router.push(`/streams/${stream.id}`)}
										className={
											index % 2 === 0
												? "cursor-pointer bg-surface transition-colors hover:bg-surface-container"
												: "cursor-pointer bg-surface-container-low transition-colors hover:bg-surface-container"
										}
									>
										<TableCell className="px-4 py-3">
											<p className="text-sm font-medium text-foreground">
												{stream.material}
											</p>
											<p className="text-xs text-muted-foreground">
												{stream.id}
											</p>
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground">
											{stream.location}
										</TableCell>
										<TableCell className="px-4 py-3">
											{getStreamStatusBadge(stream.status)}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground">
											{stream.volume} · {stream.frequency}
										</TableCell>
										<TableCell className="px-4 py-3 text-right text-sm text-muted-foreground">
											{stream.lastUpdated}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold">
							Offers
						</CardTitle>
						<CardDescription>
							Commercial opportunities linked to this account.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2 pt-0">
						{client.offers.map((offer, index) => (
							<div
								key={offer.id}
								className={
									index % 2 === 0
										? "rounded-xl bg-surface p-3"
										: "rounded-xl bg-surface-container-low p-3"
								}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex min-w-0 flex-1 flex-col gap-1">
										<p className="text-sm font-semibold text-foreground">
											{offer.title}
										</p>
										<p className="text-xs text-muted-foreground">
											{offer.id} · {offer.stage}
										</p>
										<p className="text-xs text-muted-foreground">
											Updated {offer.updatedAt}
										</p>
									</div>
									<div className="flex flex-col items-end gap-2">
										{getOfferStatusBadge(offer.status)}
										<p className="text-sm font-semibold text-foreground">
											{currencyFormatter.format(offer.value)}
										</p>
									</div>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</section>

			<ClientActivityTimeline items={client.activityTimeline} />
		</div>
	);
}
