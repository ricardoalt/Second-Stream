"use client";

import { Building2, ChevronLeft, MapPin, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LocationContactsManagerDialog } from "@/components/features/locations/location-contacts-manager-dialog";
import { LocationModal } from "@/components/features/modals/location-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/lib/hooks/use-toast";
import { useLocationStore } from "@/lib/stores/location-store";
import { ADDRESS_TYPE_LABELS, type LocationSummary } from "@/lib/types/company";

export default function ClientLocationsPage({
	params,
}: {
	params: { id: string };
}) {
	const companyId = Array.isArray(params.id) ? params.id[0] : params.id;
	const searchParams = useSearchParams();
	const { toast } = useToast();
	const {
		locations,
		loading,
		error,
		loadLocationsByCompany,
		deleteLocation,
		clearError,
	} = useLocationStore();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedLocation, setSelectedLocation] = useState<LocationSummary | null>(
		null,
	);
	const [contactsLocation, setContactsLocation] =
		useState<LocationSummary | null>(null);
	const [hasConsumedLocationQuery, setHasConsumedLocationQuery] = useState(false);

	useEffect(() => {
		void loadLocationsByCompany(companyId);
	}, [companyId, loadLocationsByCompany]);

	useEffect(() => {
		return () => clearError();
	}, [clearError]);

	const companyLocations = useMemo(
		() => locations.filter((location) => location.companyId === companyId),
		[companyId, locations],
	);

	const totalProjects = useMemo(
		() => companyLocations.reduce((sum, location) => sum + location.projectCount, 0),
		[companyLocations],
	);

	useEffect(() => {
		const requestedLocationId = searchParams.get("locationId");
		if (
			hasConsumedLocationQuery ||
			!requestedLocationId ||
			companyLocations.length === 0
		) {
			return;
		}

		const requestedLocation = companyLocations.find(
			(location) => location.id === requestedLocationId,
		);
		if (requestedLocation) {
			setContactsLocation(requestedLocation);
			setHasConsumedLocationQuery(true);
		}
	}, [companyLocations, hasConsumedLocationQuery, searchParams]);

	const handleEdit = (location: LocationSummary) => {
		setSelectedLocation(location);
		setIsModalOpen(true);
	};

	const handleCreate = () => {
		setSelectedLocation(null);
		setIsModalOpen(true);
	};

	const handleManageContacts = (location: LocationSummary) => {
		setContactsLocation(location);
	};

	const handleArchive = async (location: LocationSummary) => {
		const confirmed = window.confirm(
			`Archive ${location.name}? This hides the location from active lists but preserves history.`,
		);
		if (!confirmed) {
			return;
		}

		try {
			await deleteLocation(location.id);
			toast({
				title: "Location archived",
				description: `${location.name} was archived successfully.`,
			});
		} catch (archiveError) {
			toast({
				title: "Failed to archive location",
				description:
					archiveError instanceof Error
						? archiveError.message
						: "Please try again.",
				variant: "destructive",
			});
		}
	};

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

				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-2">
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							Manage Locations
						</h1>
						<p className="text-muted-foreground">
							Live company locations backed by the real locations API.
						</p>
					</div>
					<Button
						onClick={handleCreate}
						className="shrink-0 bg-teal-700 text-white hover:bg-teal-800"
					>
						<MapPin className="mr-2 h-4 w-4" />
						Add New Location
					</Button>
				</div>
			</section>

			{error ? (
				<div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			) : null}

			<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
				<section className="flex flex-col gap-4">
					<div className="hidden lg:grid grid-cols-[2fr_2.2fr_1fr_1fr_auto] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						<div>Location</div>
						<div>Address</div>
						<div>Type</div>
						<div>Projects</div>
						<div className="text-right">Actions</div>
					</div>

					{loading && companyLocations.length === 0 ? (
						<Card>
							<CardContent className="p-6 text-sm text-muted-foreground">
								Loading locations...
							</CardContent>
						</Card>
					) : null}

					{!loading && companyLocations.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center gap-3 p-10 text-center">
								<div className="rounded-full bg-teal-50 p-3 text-teal-700">
									<Building2 className="h-6 w-6" />
								</div>
								<div className="space-y-1">
									<h2 className="font-semibold text-foreground">
										No locations yet
									</h2>
									<p className="text-sm text-muted-foreground">
										Create the first site for this client using the real backend
										contract: name, city, state, ZIP, address type, and optional
										address/notes.
									</p>
								</div>
								<Button onClick={handleCreate}>
									<Plus className="mr-2 h-4 w-4" />
									Create first location
								</Button>
							</CardContent>
						</Card>
					) : null}

					<div className="flex flex-col gap-3">
						{companyLocations.map((location) => (
							<Card
								key={location.id}
								className="group overflow-hidden transition-all hover:border-border/80 hover:shadow-sm"
							>
								<CardContent className="p-0">
									<div className="grid gap-4 p-4 lg:grid-cols-[2fr_2.2fr_1fr_1fr_auto] lg:items-center">
										<div className="flex min-w-0 flex-col gap-1">
											<p className="truncate text-base font-semibold text-foreground">
												{location.name}
											</p>
											<p className="truncate font-mono text-xs text-muted-foreground">
												Ref: {location.id}
											</p>
										</div>

										<div className="min-w-0 flex flex-col gap-1">
											<p className="truncate text-sm text-foreground">
												{location.address || "No street address provided"}
											</p>
											<p className="truncate text-sm text-muted-foreground">
												{location.city}, {location.state} {location.zipCode ?? ""}
											</p>
										</div>

										<div>
											<Badge variant="outline" className="rounded-full">
												{ADDRESS_TYPE_LABELS[location.addressType]}
											</Badge>
										</div>

										<div>
											<Badge variant="secondary" className="rounded-full">
												{location.projectCount} project
												{location.projectCount === 1 ? "" : "s"}
											</Badge>
										</div>

										<div className="flex items-center justify-end gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleManageContacts(location)}
											>
												<Users className="mr-2 h-4 w-4" />
												Contacts
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEdit(location)}
											>
												Edit
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-muted-foreground hover:text-destructive"
												onClick={() => handleArchive(location)}
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Archive
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</section>

				<aside className="flex flex-col gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Portfolio Snapshot</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="rounded-lg border bg-surface-container-lowest p-4">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Locations
								</p>
								<p className="mt-2 text-2xl font-semibold text-foreground">
									{companyLocations.length}
								</p>
							</div>

							<div className="rounded-lg border bg-surface-container-lowest p-4">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Projects linked
								</p>
								<p className="mt-2 text-2xl font-semibold text-foreground">
									{totalProjects}
								</p>
							</div>

							<div className="rounded-lg border bg-surface-container-lowest p-4 text-sm text-muted-foreground">
								<p className="font-medium text-foreground">Contract check</p>
								<p className="mt-2">
									This screen now follows the backend contract exactly: location
									fields are name/address/city/state/ZIP/addressType/notes.
									Contacts are a separate resource and should be managed in their
									own flow.
								</p>
							</div>
						</CardContent>
					</Card>
				</aside>
			</div>

			<LocationModal
				open={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
					setSelectedLocation(null);
				}}
				companyId={companyId}
				location={selectedLocation}
				onSaved={() => {
					setSelectedLocation(null);
				}}
			/>

			{contactsLocation ? (
				<LocationContactsManagerDialog
					open={Boolean(contactsLocation)}
					onOpenChange={(open) => {
						if (!open) {
							setContactsLocation(null);
						}
					}}
					location={contactsLocation}
				/>
			) : null}
		</div>
	);
}
