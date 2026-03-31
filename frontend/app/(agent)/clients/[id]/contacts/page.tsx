"use client";

import { ChevronLeft, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CompanyContactsCard } from "@/components/features/companies/company-contacts-card";
import { LocationContactsManagerDialog } from "@/components/features/locations/location-contacts-manager-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { companiesAPI, locationsAPI } from "@/lib/api/companies";
import { useAuth } from "@/lib/contexts/auth-context";
import type { CompanyDetail, LocationDetail } from "@/lib/types/company";

export default function ClientContactsPage({
	params,
}: {
	params: { id: string };
}) {
	const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
	const searchParams = useSearchParams();
	const { user } = useAuth();
	const [company, setCompany] = useState<CompanyDetail | null>(null);
	const [locations, setLocations] = useState<LocationDetail[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedLocation, setSelectedLocation] =
		useState<LocationDetail | null>(null);
	const [hasConsumedLocationQuery, setHasConsumedLocationQuery] = useState(false);

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
			const locationSummaries = await locationsAPI.listByCompany(companyId, "active");
			const locationDetails = await Promise.all(
				locationSummaries.map((location) => locationsAPI.get(location.id, "active")),
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
		<div className="flex flex-col gap-8">
			<section className="flex flex-col gap-4">
				<Button
					variant="ghost"
					size="sm"
					asChild
					className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
				>
					<Link href={`/clients/${companyId}`}>
						<ChevronLeft className="mr-1 h-4 w-4" />
						Back to Client Profile
					</Link>
				</Button>

				<div className="flex flex-col gap-2">
					<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
						Client Contacts
					</h1>
					<p className="text-muted-foreground">
						Company-wide contacts live here. Location-specific contacts stay tied
						to each site, but you can manage them from this hub.
					</p>
				</div>
			</section>

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

					<div className="flex flex-col gap-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-xl font-semibold">
									<MapPin className="h-5 w-5 text-primary" />
									Location contact coverage
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{locations.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No active locations found for this client.
									</p>
								) : (
									locations.map((location) => {
										const contactsCount = location.contacts?.length ?? 0;
										return (
											<div
												key={location.id}
												className="rounded-lg border bg-surface-container-lowest p-4"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="space-y-2">
														<div className="flex items-center gap-2">
															<p className="font-medium text-foreground">
																{location.name}
															</p>
															<Badge variant="outline" className="rounded-full">
																{contactsCount} contact{contactsCount === 1 ? "" : "s"}
															</Badge>
														</div>
														<p className="text-sm text-muted-foreground">
															{location.fullAddress || "No address available"}
														</p>
														{contactsCount > 0 ? (
															<div className="space-y-1 pt-1">
																{location.contacts?.slice(0, 2).map((contact) => (
																	<div
																		key={contact.id}
																		className="text-sm text-muted-foreground"
																	>
																		<span className="font-medium text-foreground">
																			{contact.name}
																		</span>
																		{contact.title ? ` · ${contact.title}` : ""}
																	</div>
																))}
															</div>
														) : (
															<p className="text-sm text-muted-foreground">
																No location contacts yet.
															</p>
														)}
													</div>

													<Button
														variant="outline"
														size="sm"
														onClick={() => setSelectedLocation(location)}
													>
														<Users className="mr-2 h-4 w-4" />
														Manage
													</Button>
												</div>
											</div>
										);
									})
								)}
							</CardContent>
						</Card>

						<Card>
							<CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
								<p className="font-medium text-foreground">Recommended workflow</p>
								<p>
									Use this hub to manage company-wide contacts, then attach
									operational contacts to each location where the work actually
									happens.
								</p>
								<p>
									Waste stream screens should stay focused on finding the right
									person fast, not editing the master contact records.
								</p>
							</CardContent>
						</Card>
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
		</div>
	);
}
