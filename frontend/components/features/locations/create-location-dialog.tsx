"use client";

import { useForm } from "@tanstack/react-form";
import { MapPin } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const REQUIRED_FIELDS = ["name", "city", "state", "zipCode"] as const;

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
 * CreateLocationDialog - Modal for creating/editing locations.
 * Uses TanStack Form with field-level onBlur validators for UX
 * and Zod (locationSchema) as final safety net on submit.
 */
export function CreateLocationDialog({
	companyId,
	onSuccess,
	trigger,
	locationToEdit,
}: CreateLocationDialogProps) {
	const isEditMode = Boolean(locationToEdit);
	const [open, setOpen] = useState(isEditMode);
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
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
			const result = locationSchema.safeParse(value);
			if (!result.success) {
				const errorPaths = new Set(result.error.errors.map((e) => e.path[0]));
				for (const fieldName of REQUIRED_FIELDS) {
					if (errorPaths.has(fieldName)) {
						// Mark touched so the field renders its error state
						form.setFieldMeta(fieldName, (meta) => ({
							...meta,
							isTouched: true,
						}));
						// Trigger onBlur validator to populate errorMap → errors array
						form.validateField(fieldName, "blur");
					}
				}

				const firstErrorPath = result.error.errors[0]?.path[0];
				if (typeof firstErrorPath === "string") {
					document.getElementById(firstErrorPath)?.focus();
				}
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
			if (form.state.isDirty) {
				setShowDiscardConfirm(true);
				return;
			}
			setOpen(false);
			form.reset();
			if (isEditMode) {
				onSuccess?.(null);
			}
			return;
		}
		setOpen(true);
	};

	const handleDiscardConfirm = () => {
		setShowDiscardConfirm(false);
		setOpen(false);
		form.reset();
		if (isEditMode) {
			onSuccess?.(null);
		}
	};

	return (
		<>
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
							<form.Field
								name="name"
								validators={{
									onBlur: ({ value }) => {
										if (!value?.trim()) return "Location name is required";
										return undefined;
									},
								}}
							>
								{(field) => {
									const hasError =
										field.state.meta.isTouched &&
										field.state.meta.errors.length > 0;

									return (
										<div className="grid gap-2">
											<Label htmlFor={field.name}>
												Location Name{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Input
												id={field.name}
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												aria-invalid={hasError}
												aria-required="true"
												aria-describedby={
													hasError ? `${field.name}-error` : undefined
												}
											/>
											{hasError && (
												<p
													id={`${field.name}-error`}
													className="text-xs text-destructive"
													role="alert"
												>
													{field.state.meta.errors[0]}
												</p>
											)}
										</div>
									);
								}}
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
												<SelectItem value="headquarters">
													Headquarters
												</SelectItem>
												<SelectItem value="pickup">Pick-up</SelectItem>
												<SelectItem value="delivery">Delivery</SelectItem>
												<SelectItem value="billing">Billing</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</form.Field>

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
											autoComplete="street-address"
										/>
									</div>
								)}
							</form.Field>

							{/* City, State & ZIP */}
							<div className="grid grid-cols-4 gap-3">
								<form.Field
									name="city"
									validators={{
										onBlur: ({ value }) => {
											if (!value?.trim()) return "Required";
											return undefined;
										},
									}}
								>
									{(field) => {
										const hasError =
											field.state.meta.isTouched &&
											field.state.meta.errors.length > 0;

										return (
											<div className="col-span-2 grid gap-2">
												<Label htmlFor={field.name}>
													City <span className="text-destructive">*</span>
												</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													aria-invalid={hasError}
													aria-required="true"
													autoComplete="address-level2"
													aria-describedby={
														hasError ? `${field.name}-error` : undefined
													}
												/>
												{hasError && (
													<p
														id={`${field.name}-error`}
														className="text-xs text-destructive"
														role="alert"
													>
														{field.state.meta.errors[0]}
													</p>
												)}
											</div>
										);
									}}
								</form.Field>

								<form.Field
									name="state"
									validators={{
										onBlur: ({ value }) => {
											if (!value?.trim()) return "Required";
											return undefined;
										},
									}}
								>
									{(field) => {
										const hasError =
											field.state.meta.isTouched &&
											field.state.meta.errors.length > 0;

										return (
											<div className="grid gap-2">
												<Label htmlFor={field.name}>
													State <span className="text-destructive">*</span>
												</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													aria-invalid={hasError}
													aria-required="true"
													autoComplete="address-level1"
													aria-describedby={
														hasError ? `${field.name}-error` : undefined
													}
												/>
												{hasError && (
													<p
														id={`${field.name}-error`}
														className="text-xs text-destructive"
														role="alert"
													>
														{field.state.meta.errors[0]}
													</p>
												)}
											</div>
										);
									}}
								</form.Field>

								<form.Field
									name="zipCode"
									validators={{
										onBlur: ({ value }) => {
											const trimmed = value?.trim() ?? "";
											if (!trimmed) return "Required";
											if (!/^\d{5}(-\d{4})?$/.test(trimmed)) {
												return "Use 12345 or 12345-6789";
											}
											return undefined;
										},
									}}
								>
									{(field) => {
										const hasError =
											field.state.meta.isTouched &&
											field.state.meta.errors.length > 0;

										return (
											<div className="grid gap-2">
												<Label htmlFor={field.name}>
													ZIP <span className="text-destructive">*</span>
												</Label>
												<Input
													id={field.name}
													type="text"
													inputMode="text"
													autoComplete="postal-code"
													placeholder="90210"
													maxLength={10}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													aria-invalid={hasError}
													aria-required="true"
													aria-describedby={
														hasError ? `${field.name}-error` : undefined
													}
												/>
												{hasError && (
													<p
														id={`${field.name}-error`}
														className="text-xs text-destructive"
														role="alert"
													>
														{field.state.meta.errors[0]}
													</p>
												)}
											</div>
										);
									}}
								</form.Field>
							</div>

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
							<form.Subscribe selector={(state) => state.isSubmitting}>
								{(isSubmitting) => (
									<>
										<Button
											type="button"
											variant="outline"
											onClick={() => handleOpenChange(false)}
											disabled={isSubmitting}
										>
											Cancel
										</Button>
										<LoadingButton type="submit" loading={isSubmitting}>
											{isEditMode ? "Update Location" : "Create Location"}
										</LoadingButton>
									</>
								)}
							</form.Subscribe>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={showDiscardConfirm}
				onOpenChange={setShowDiscardConfirm}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
						<AlertDialogDescription>
							Your changes will be lost if you close without saving.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep editing</AlertDialogCancel>
						<AlertDialogAction onClick={handleDiscardConfirm}>
							Discard
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
