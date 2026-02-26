"use client";

import { useForm } from "@tanstack/react-form";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isForbiddenError } from "@/lib/api/client";
import { locationSchema } from "@/lib/forms/schemas";
import { useToast } from "@/lib/hooks/use-toast";
import { useLocationStore } from "@/lib/stores/location-store";
import type { AddressType, LocationSummary } from "@/lib/types/company";

const isAddressType = (value: string): value is AddressType => {
	return (
		value === "headquarters" ||
		value === "pickup" ||
		value === "delivery" ||
		value === "billing"
	);
};

interface CreateLocationDialogProps {
	companyId: string;
	onSuccess?: (location: LocationSummary | null) => void;
	trigger?: React.ReactNode;
	locationToEdit?: {
		id: string;
		name: string;
		addressType: AddressType;
		city: string;
		state: string;
		address?: string;
		zipCode?: string | null;
		notes?: string;
	};
}

/**
 * CreateLocationDialog - Modal for creating locations
 * Uses TanStack Form + Zod for type-safe validation
 */
export function CreateLocationDialog({
	companyId,
	onSuccess,
	trigger,
	locationToEdit,
}: CreateLocationDialogProps) {
	const isEditMode = Boolean(locationToEdit);
	const [open, setOpen] = useState(isEditMode);
	const { createLocation, updateLocation } = useLocationStore();
	const { toast } = useToast();

	const form = useForm({
		defaultValues: {
			name: locationToEdit?.name ?? "",
			addressType: locationToEdit?.addressType ?? "headquarters",
			city: locationToEdit?.city ?? "",
			state: locationToEdit?.state ?? "",
			address: locationToEdit?.address ?? "",
			zipCode: locationToEdit?.zipCode ?? "",
			notes: locationToEdit?.notes ?? "",
		},
		onSubmit: async ({ value }) => {
			// Validate with Zod before submit
			const result = locationSchema.safeParse(value);
			if (!result.success) {
				toast({
					title: "Validation Error",
					description:
						result.error.errors[0]?.message || "Please check your input",
					variant: "destructive",
				});
				return;
			}

			try {
				if (isEditMode && locationToEdit) {
					const location = await updateLocation(locationToEdit.id, {
						...result.data,
						zipCode: result.data.zipCode.trim(),
					});
					toast({
						title: "Location updated",
						description: `${result.data.name} has been updated successfully.`,
					});
					setOpen(false);
					form.reset();
					onSuccess?.(location);
					return;
				}

				const location = await createLocation(companyId, {
					...result.data,
					zipCode: result.data.zipCode.trim(),
					companyId,
				});

				toast({
					title: "Location created",
					description: `${result.data.name} has been created successfully.`,
				});
				setOpen(false);
				form.reset();
				onSuccess?.(location);
			} catch (error) {
				if (!isForbiddenError(error)) {
					toast({
						title: "Error",
						description:
							error instanceof Error
								? error.message
								: "Failed to create location",
						variant: "destructive",
					});
				}
			}
		},
	});

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			setOpen(false);
			if (isEditMode) {
				onSuccess?.(null);
			}
			return;
		}
		setOpen(true);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{!isEditMode && (
				<DialogTrigger asChild>
					{trigger || (
						<Button>
							<MapPin className="mr-2 h-4 w-4" />
							New Location
						</Button>
					)}
				</DialogTrigger>
			)}

			<DialogContent className="sm:max-w-[500px]">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>
							{isEditMode ? "Edit Location" : "Create New Location"}
						</DialogTitle>
						<DialogDescription>
							{isEditMode
								? "Update location information."
								: "Add a new location/site for this company."}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Location Name */}
						<form.Field name="name">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										Location Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs text-destructive">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.Field>

						{/* Address Type */}
						<form.Field name="addressType">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										Address Type <span className="text-destructive">*</span>
									</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) => {
											if (!isAddressType(v)) {
												return;
											}
											field.handleChange(v);
										}}
									>
										<SelectTrigger id={field.name}>
											<SelectValue placeholder="Select type…" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="headquarters">Headquarters</SelectItem>
											<SelectItem value="pickup">Pick-up</SelectItem>
											<SelectItem value="delivery">Delivery</SelectItem>
											<SelectItem value="billing">Billing</SelectItem>
										</SelectContent>
									</Select>
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs text-destructive">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.Field>

						{/* City & State */}
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="city">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>
											City <span className="text-destructive">*</span>
										</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors.length > 0 && (
											<p className="text-xs text-destructive">
												{field.state.meta.errors.join(", ")}
											</p>
										)}
									</div>
								)}
							</form.Field>

							<form.Field name="state">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>
											State <span className="text-destructive">*</span>
										</Label>
										<Input
											id={field.name}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors.length > 0 && (
											<p className="text-xs text-destructive">
												{field.state.meta.errors.join(", ")}
											</p>
										)}
									</div>
								)}
							</form.Field>
						</div>

						{/* Address */}
						<form.Field name="address">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Address</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>

						{/* ZIP Code */}
						<form.Field name="zipCode">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										ZIP Code <span className="text-destructive">*</span>
									</Label>
									<Input
										id={field.name}
										type="text"
										inputMode="text"
										autoComplete="postal-code"
										placeholder="e.g. 90210"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs text-destructive">
											{field.state.meta.errors.join(", ")}
										</p>
									)}
								</div>
							)}
						</form.Field>

						{/* Notes */}
						<form.Field name="notes">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Notes</Label>
									<Textarea
										id={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										rows={3}
									/>
								</div>
							)}
						</form.Field>
					</div>

					<DialogFooter>
						<form.Subscribe
							selector={(state) => ({
								canSubmit: Boolean(
									state.values.name?.trim() &&
										state.values.addressType &&
										state.values.city?.trim() &&
										state.values.state?.trim() &&
										state.values.zipCode?.trim(),
								),
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setOpen(false);
											if (isEditMode) {
												onSuccess?.(null);
											}
										}}
										disabled={isSubmitting}
									>
										Cancel
									</Button>
									<LoadingButton
										type="submit"
										loading={isSubmitting}
										disabled={!canSubmit}
									>
										{isEditMode ? "Update Location" : "Create Location"}
									</LoadingButton>
								</>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
