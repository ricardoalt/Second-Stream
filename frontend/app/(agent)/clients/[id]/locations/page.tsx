"use client";

import { Building2, ChevronLeft, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { LocationContactsManagerDialog } from "@/components/features/locations/location-contacts-manager-dialog";
import { LocationModal } from "@/components/features/modals/location-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/use-toast";
import { useLocationStore } from "@/lib/stores/location-store";
import { ADDRESS_TYPE_LABELS, type LocationSummary } from "@/lib/types/company";

export default function ClientLocationsPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = use(props.params);
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
	const [selectedLocation, setSelectedLocation] =
		useState<LocationSummary | null>(null);
	const [contactsLocation, setContactsLocation] =
		useState<LocationSummary | null>(null);
	const [hasConsumedLocationQuery, setHasConsumedLocationQuery] =
		useState(false);

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
		() =>
			companyLocations.reduce(
				(sum, location) => sum + location.projectCount,
				0,
			),
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

				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-2">
						<h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
							Manage Locations
						</h1>
						<p className="max-w-2xl text-lg text-muted-foreground">
							Add and organize operational sites for this client, and track
							associated projects.
						</p>
					</div>
					<Button
						onClick={handleCreate}
						size="lg"
						className="shrink-0 bg-teal-700 text-white hover:bg-teal-800"
					>
						<Plus className="mr-2 h-4 w-4" />
						New Location
					</Button>
				</div>
			</section>

			{error ? (
				<div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			) : null}

			<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
				<section className="flex flex-col">
					<div className="hidden border-b pb-3 lg:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						<div>Location Details</div>
						<div>Primary Address</div>
						<div>Type</div>
						<div>Active Projects</div>
						<div className="text-right pr-2">Actions</div>
					</div>

					{loading && companyLocations.length === 0 ? (
						<div className="py-10 text-center text-sm text-muted-foreground">
							Loading locations...
						</div>
					) : null}

					{!loading && companyLocations.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
							<div className="rounded-full bg-teal-50 p-4 text-teal-700">
								<Building2 className="h-6 w-6" />
							</div>
							<div className="space-y-1 max-w-sm">
								<h2 className="text-lg font-semibold tracking-tight text-foreground">
									No locations recorded
								</h2>
								<p className="text-sm text-muted-foreground">
									Add the first physical site for this client to start tracking
									projects and assigning local contacts.
								</p>
							</div>
							<Button onClick={handleCreate} className="mt-2" variant="outline">
								<Plus className="mr-2 h-4 w-4" />
								Add first location
							</Button>
						</div>
					) : null}

					<div className="flex flex-col divide-y">
						{companyLocations.map((location) => (
							<div
								key={location.id}
								className="group flex flex-col gap-4 py-5 lg:grid lg:grid-cols-[2fr_2fr_1fr_1fr_auto] lg:items-center transition-colors hover:bg-muted/30 px-2 sm:px-4 -mx-2 sm:-mx-4 rounded-xl"
							>
								<div className="flex min-w-0 flex-col gap-1 pr-4">
									<p className="truncate text-base font-semibold text-foreground">
										{location.name}
									</p>
									<p className="truncate font-mono text-[10px] tracking-wider text-muted-foreground/50">
										ID: {location.id.slice(-8)}
									</p>
								</div>

								<div className="min-w-0 flex flex-col gap-1 pr-4">
									<p className="truncate text-sm text-foreground">
										{location.address || "No street address provided"}
									</p>
									<p className="truncate text-sm text-muted-foreground">
										{location.city}, {location.state} {location.zipCode ?? ""}
									</p>
								</div>

								<div>
									<Badge
										variant="secondary"
										className="rounded-full px-2.5 py-0.5 text-xs font-normal"
									>
										{ADDRESS_TYPE_LABELS[location.addressType]}
									</Badge>
								</div>

								<div>
									<span className="text-sm font-medium text-foreground">
										{location.projectCount}
									</span>
									<span className="text-sm text-muted-foreground ml-1.5">
										project{location.projectCount === 1 ? "" : "s"}
									</span>
								</div>

								<div className="flex flex-wrap items-center justify-start lg:justify-end gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity mt-2 lg:mt-0">
									<Button
										variant="ghost"
										size="sm"
										className="h-8 shadow-sm lg:shadow-none bg-surface-container-lowest lg:bg-transparent border lg:border-transparent"
										onClick={() => handleManageContacts(location)}
									>
										<Users className="mr-2 h-4 w-4" />
										Contacts
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 shadow-sm lg:shadow-none bg-surface-container-lowest lg:bg-transparent border lg:border-transparent"
										onClick={() => handleEdit(location)}
									>
										Edit
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 text-muted-foreground hover:text-destructive shadow-sm lg:shadow-none bg-surface-container-lowest lg:bg-transparent border lg:border-transparent"
										onClick={() => handleArchive(location)}
									>
										<Trash2 className="h-4 w-4 lg:mr-0 mr-2" />
										<span className="lg:sr-only">Archive</span>
									</Button>
								</div>
							</div>
						))}
					</div>
				</section>

				<aside className="flex flex-col gap-8 md:border-l md:pl-6 lg:pl-10">
					<section className="space-y-6">
						<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							Snapshot
						</h2>
						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
							<div className="space-y-1">
								<p className="text-sm font-medium text-muted-foreground">
									Total Locations
								</p>
								<p className="font-display text-4xl font-semibold text-foreground tracking-tight">
									{companyLocations.length}
								</p>
							</div>

							<div className="space-y-1">
								<p className="text-sm font-medium text-muted-foreground">
									Linked Projects
								</p>
								<p className="font-display text-4xl font-semibold text-foreground tracking-tight">
									{totalProjects}
								</p>
							</div>
						</div>
					</section>

					<section className="rounded-xl bg-muted/40 p-6 text-sm text-muted-foreground">
						<h3 className="mb-2 font-medium text-foreground">
							How locations work
						</h3>
						<div className="space-y-2 leading-relaxed">
							<p>
								Locations represent the physical sites where work happens. Keep
								address details accurate for seamless mapping and logistics.
							</p>
							<p>
								You can assign dedicated site managers and coordinators directly
								to each location's contact list.
							</p>
						</div>
					</section>
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
