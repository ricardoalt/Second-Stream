"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFirstError, locationSchema } from "@/lib/forms/schemas";
import { useToast } from "@/lib/hooks/use-toast";
import { useLocationStore } from "@/lib/stores/location-store";
import {
	type AddressType,
	ADDRESS_TYPE_LABELS,
	type LocationDetail,
	type LocationSummary,
} from "@/lib/types/company";

type LocationFormValues = {
	name: string;
	address: string;
	city: string;
	state: string;
	zipCode: string;
	addressType: AddressType;
	notes: string;
};

type LocationModalProps = {
	open: boolean;
	onClose: () => void;
	companyId: string;
	location?: LocationSummary | null;
	onSaved?: (location: LocationSummary | LocationDetail) => void;
};

const EMPTY_FORM: LocationFormValues = {
	name: "",
	address: "",
	city: "",
	state: "",
	zipCode: "",
	addressType: "headquarters",
	notes: "",
};

export function LocationModal({
	open,
	onClose,
	companyId,
	location,
	onSaved,
}: LocationModalProps) {
	const isEdit = Boolean(location);
	const { toast } = useToast();
	const { createLocation, updateLocation } = useLocationStore();
	const [form, setForm] = useState<LocationFormValues>(EMPTY_FORM);
	const [errors, setErrors] = useState<Partial<Record<keyof LocationFormValues, string>>>(
		{},
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!open) {
			return;
		}

		if (!location) {
			setForm(EMPTY_FORM);
			setErrors({});
			return;
		}

		setForm({
			name: location.name,
			address: location.address ?? "",
			city: location.city,
			state: location.state,
			zipCode: location.zipCode ?? "",
			addressType: location.addressType,
			notes: location.notes ?? "",
		});
		setErrors({});
	}, [open, location]);

	const title = useMemo(
		() => (isEdit ? "Edit Location" : "Add New Location"),
		[isEdit],
	);

	const description = useMemo(
		() =>
			isEdit
				? "Update the operational site details stored for this client."
				: "Create a new operational site for this client using the real backend contract.",
		[isEdit],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const result = locationSchema.safeParse(form);
		if (!result.success) {
			const nextErrors: Partial<Record<keyof LocationFormValues, string>> = {};
			for (const issue of result.error.errors) {
				const field = issue.path[0];
				if (typeof field === "string" && !(field in nextErrors)) {
					nextErrors[field as keyof LocationFormValues] = issue.message;
				}
			}
			setErrors(nextErrors);
			toast({
				title: "Invalid location data",
				description: getFirstError(result) ?? "Review the required fields.",
				variant: "destructive",
			});
			return;
		}

		setErrors({});
		setIsSubmitting(true);

		try {
			if (location) {
				const updated = await updateLocation(location.id, result.data);
				onSaved?.(updated);
				toast({
					title: "Location updated",
					description: `${updated.name} was saved successfully.`,
				});
			} else {
				const created = await createLocation(companyId, {
					...result.data,
					companyId,
				});
				onSaved?.(created);
				toast({
					title: "Location created",
					description: `${created.name} was added successfully.`,
				});
			}

			onClose();
		} catch (error) {
			toast({
				title: isEdit ? "Failed to update location" : "Failed to create location",
				description:
					error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderError = (field: keyof LocationFormValues) => {
		const message = errors[field];
		if (!message) return null;
		return <p className="text-xs text-destructive">{message}</p>;
	};

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent className="max-w-2xl">
				<form className="space-y-6" onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="location-name">Location Name</Label>
							<Input
								id="location-name"
								value={form.name}
								onChange={(event) =>
									setForm((current) => ({ ...current, name: event.target.value }))
								}
								placeholder="e.g. Houston Main Plant"
							/>
							{renderError("name")}
						</div>

						<div className="space-y-2">
							<Label htmlFor="location-address-type">Address Type</Label>
							<Select
								value={form.addressType}
								onValueChange={(value) =>
									setForm((current) => ({
										...current,
										addressType: value as AddressType,
									}))
								}
							>
								<SelectTrigger id="location-address-type">
									<SelectValue placeholder="Select an address type" />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(ADDRESS_TYPE_LABELS).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{renderError("addressType")}
						</div>

						<div className="space-y-2 md:col-span-2">
							<Label htmlFor="location-address">Street Address</Label>
							<Input
								id="location-address"
								value={form.address}
								onChange={(event) =>
									setForm((current) => ({ ...current, address: event.target.value }))
								}
								placeholder="123 Industrial Blvd"
							/>
							{renderError("address")}
						</div>

						<div className="space-y-2">
							<Label htmlFor="location-city">City</Label>
							<Input
								id="location-city"
								value={form.city}
								onChange={(event) =>
									setForm((current) => ({ ...current, city: event.target.value }))
								}
								placeholder="Houston"
							/>
							{renderError("city")}
						</div>

						<div className="space-y-2">
							<Label htmlFor="location-state">State</Label>
							<Input
								id="location-state"
								value={form.state}
								onChange={(event) =>
									setForm((current) => ({ ...current, state: event.target.value }))
								}
								placeholder="TX"
							/>
							{renderError("state")}
						</div>

						<div className="space-y-2">
							<Label htmlFor="location-zip-code">ZIP Code</Label>
							<Input
								id="location-zip-code"
								value={form.zipCode}
								onChange={(event) =>
									setForm((current) => ({ ...current, zipCode: event.target.value }))
								}
								placeholder="77002"
							/>
							{renderError("zipCode")}
						</div>

						<div className="space-y-2 md:col-span-2">
							<Label htmlFor="location-notes">Notes</Label>
							<Textarea
								id="location-notes"
								value={form.notes}
								onChange={(event) =>
									setForm((current) => ({ ...current, notes: event.target.value }))
								}
								placeholder="Optional operational notes for this site"
								rows={4}
							/>
							{renderError("notes")}
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting
								? isEdit
									? "Saving..."
									: "Creating..."
								: isEdit
									? "Save Changes"
									: "Add Location"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
