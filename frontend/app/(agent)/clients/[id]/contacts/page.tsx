"use client";

import { MapPin, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { CompanyContactsCard } from "@/components/features/companies/company-contacts-card";
import { LocationContactsManagerDialog } from "@/components/features/locations/location-contacts-manager-dialog";
import { PageHeader, PageShell } from "@/components/patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { companiesAPI, locationsAPI } from "@/lib/api/companies";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { useAuth } from "@/lib/contexts/auth-context";
import type { CompanyDetail, LocationDetail } from "@/lib/types/company";

export default function ClientContactsPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = use(props.params);
	const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
	const searchParams = useSearchParams();
	const { user } = useAuth();
	const [company, setCompany] = useState<CompanyDetail | null>(null);
	const [locations, setLocations] = useState<LocationDetail[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedLocation, setSelectedLocation] =
		useState<LocationDetail | null>(null);
	const [hasConsumedLocationQuery, setHasConsumedLocationQuery] =
		useState(false);

	const canManageCompanyContacts = useMemo(
		() =>
			Boolean(
				user?.permissions?.includes(PERMISSIONS.COMPANY_CONTACT_CREATE) ||
					user?.permissions?.includes(PERMISSIONS.COMPANY_CONTACT_UPDATE) ||
					user?.permissions?.includes(PERMISSIONS.COMPANY_CONTACT_DELETE),
			),
		[user?.permissions],
	);

	const loadContactsHub = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const companyDetail = await companiesAPI.get(companyId);
			const locationSummaries = await locationsAPI.listByCompany(
				companyId,
				"active",
			);
			const locationDetails = await Promise.all(
				locationSummaries.map((location) =>
					locationsAPI.get(location.id, "active"),
				),
			);

			setCompany(companyDetail);
			setLocations(locationDetails);
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Could not load contacts for this client.",
			);
		} finally {
			setLoading(false);
		}
	}, [companyId]);

	useEffect(() => {
		void loadContactsHub();
	}, [loadContactsHub]);

	useEffect(() => {
		const requestedLocationId = searchParams.get("locationId");
		if (
			hasConsumedLocationQuery ||
			!requestedLocationId ||
			locations.length === 0
		) {
			return;
		}

		const requestedLocation = locations.find(
			(location) => location.id === requestedLocationId,
		);
		if (requestedLocation) {
			setSelectedLocation(requestedLocation);
			setHasConsumedLocationQuery(true);
		}
	}, [hasConsumedLocationQuery, locations, searchParams]);

	return (
		<PageShell gap="lg">
			<PageHeader
				title="Client Contacts"
				subtitle="Manage company-wide contacts and monitor coverage across all operational locations."
				icon={Users}
				breadcrumbs={[
					{ label: "Clients", href: "/clients" },
					{
						label: company?.name ?? "Client",
						href: `/clients/${companyId}`,
					},
					{ label: "Contacts" },
				]}
			/>

			{loading ? (
				<Card>
					<CardContent className="p-6 text-sm text-muted-foreground">
						Loading contacts hub...
					</CardContent>
				</Card>
			) : error ? (
				<Card>
					<CardContent className="space-y-4 p-6">
						<p className="text-sm text-destructive">{error}</p>
						<Button variant="outline" onClick={() => void loadContactsHub()}>
							Retry
						</Button>
					</CardContent>
				</Card>
			) : company ? (
				<div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
					<div className="flex flex-col gap-6">
						<CompanyContactsCard
							companyId={company.id}
							contacts={company.contacts}
							canManageContacts={canManageCompanyContacts}
							onContactsUpdated={loadContactsHub}
						/>
					</div>

					<div className="flex flex-col gap-10 md:border-l md:pl-10">
						<section className="flex flex-col gap-6">
							<header className="flex items-center gap-2">
								<MapPin className="h-5 w-5 text-primary" />
								<h2 className="text-xl font-semibold text-foreground tracking-tight">
									Location coverage
								</h2>
							</header>

							<div className="flex flex-col divide-y">
								{locations.length === 0 ? (
									<div className="flex items-center justify-center rounded-xl border border-dashed py-12 px-6 text-center">
										<p className="text-sm text-muted-foreground">
											No active locations found for this client.
										</p>
									</div>
								) : (
									locations.map((location) => {
										const contactsCount = location.contacts?.length ?? 0;
										return (
											<div
												key={location.id}
												className="group flex flex-col gap-4 py-5 transition-colors hover:bg-muted/30 px-2 sm:px-4 -mx-2 sm:-mx-4 rounded-xl"
											>
												<div className="flex items-start justify-between gap-4">
													<div className="space-y-1.5 min-w-0">
														<div className="flex flex-wrap items-center gap-2">
															<p className="truncate font-semibold text-foreground">
																{location.name}
															</p>
															<Badge
																variant="secondary"
																className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase"
															>
																{contactsCount} contact
																{contactsCount === 1 ? "" : "s"}
															</Badge>
														</div>
														<p className="truncate text-sm text-muted-foreground">
															{location.fullAddress || "No address available"}
														</p>
													</div>

													<Button
														variant="ghost"
														size="sm"
														className="shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
														onClick={() => setSelectedLocation(location)}
													>
														<Users className="mr-2 h-4 w-4" />
														Manage
													</Button>
												</div>

												{contactsCount > 0 ? (
													<div className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
														{location.contacts?.slice(0, 4).map((contact) => (
															<div
																key={contact.id}
																className="flex flex-col gap-0.5 text-sm"
															>
																<span className="truncate font-medium text-foreground">
																	{contact.name}
																</span>
																{contact.title ? (
																	<span className="truncate text-muted-foreground text-[10px] uppercase tracking-wider">
																		{contact.title}
																	</span>
																) : null}
															</div>
														))}
													</div>
												) : null}
											</div>
										);
									})
								)}
							</div>
						</section>

						<section className="rounded-xl bg-muted/40 p-6 text-sm text-muted-foreground">
							<h3 className="mb-2 font-medium text-foreground">
								How contacts work
							</h3>
							<div className="space-y-2 leading-relaxed">
								<p>
									Keep executive and corporate contacts at the company level.
									Assign site-specific contacts directly to their operational
									locations.
								</p>
								<p>
									This ensures the right people are surfaced automatically when
									managing waste streams for specific sites.
								</p>
							</div>
						</section>
					</div>
				</div>
			) : null}

			{selectedLocation ? (
				<LocationContactsManagerDialog
					open={Boolean(selectedLocation)}
					onOpenChange={(nextOpen) => {
						if (!nextOpen) {
							setSelectedLocation(null);
							void loadContactsHub();
						}
					}}
					location={selectedLocation}
				/>
			) : null}
		</PageShell>
	);
}
