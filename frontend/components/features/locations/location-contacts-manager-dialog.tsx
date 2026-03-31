"use client";

import { Loader2, MapPin, Users } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { LocationContactsCard } from "@/components/features/locations/location-contacts-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { locationsAPI } from "@/lib/api/companies";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { useAuth } from "@/lib/contexts/auth-context";
import type { LocationDetail, LocationSummary } from "@/lib/types/company";

interface LocationContactsManagerDialogProps {
	location: Pick<
		LocationSummary,
		"id" | "name" | "fullAddress" | "address" | "city" | "state" | "zipCode"
	>;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
}

export function LocationContactsManagerDialog({
	location,
	open,
	onOpenChange,
	trigger,
}: LocationContactsManagerDialogProps) {
	const { user } = useAuth();
	const [internalOpen, setInternalOpen] = useState(false);
	const [locationDetail, setLocationDetail] = useState<LocationDetail | null>(
		null,
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dialogOpen = open ?? internalOpen;
	const setDialogOpen = onOpenChange ?? setInternalOpen;

	const canWriteContacts = useMemo(
		() =>
			Boolean(
				user?.permissions?.includes(PERMISSIONS.LOCATION_CONTACT_CREATE) ||
					user?.permissions?.includes(PERMISSIONS.LOCATION_CONTACT_UPDATE),
			),
		[user?.permissions],
	);

	const canDeleteContacts = useMemo(
		() =>
			Boolean(user?.permissions?.includes(PERMISSIONS.LOCATION_CONTACT_DELETE)),
		[user?.permissions],
	);

	const loadLocation = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const detail = await locationsAPI.get(location.id, "active");
			setLocationDetail(detail);
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Failed to load location contacts.",
			);
		} finally {
			setLoading(false);
		}
	}, [location.id]);

	useEffect(() => {
		if (!dialogOpen) {
			return;
		}
		void loadLocation();
	}, [dialogOpen, loadLocation]);

	const addressLabel =
		locationDetail?.fullAddress ||
		location.fullAddress ||
		[location.address, location.city, location.state, location.zipCode]
			.filter(Boolean)
			.join(", ");

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-3xl">
				<DialogHeader className="space-y-4 pb-4 border-b">
					<div className="flex flex-col gap-1.5">
						<div className="mb-1 flex items-center gap-2">
							<Badge
								variant="secondary"
								className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase"
							>
								<Users className="mr-1.5 h-3 w-3" />
								Site Operations
							</Badge>
						</div>
						<DialogTitle className="text-2xl font-semibold tracking-tight">
							{location.name}
						</DialogTitle>
						<DialogDescription className="flex items-center gap-2 text-base text-foreground/80">
							<MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
							<span className="truncate">
								{addressLabel || "No address available"}
							</span>
						</DialogDescription>
						<p className="text-sm text-muted-foreground pt-1">
							Manage the people responsible for operations at this specific
							site.
						</p>
					</div>
				</DialogHeader>

				{loading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading contacts...
					</div>
				) : error ? (
					<div className="space-y-4 py-4">
						<p className="text-sm text-destructive">{error}</p>
						<Button variant="outline" onClick={() => void loadLocation()}>
							Retry
						</Button>
					</div>
				) : locationDetail ? (
					<LocationContactsCard
						contacts={locationDetail.contacts ?? []}
						locationId={location.id}
						canWriteContacts={canWriteContacts}
						canDeleteContacts={canDeleteContacts}
						onContactsUpdated={loadLocation}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
