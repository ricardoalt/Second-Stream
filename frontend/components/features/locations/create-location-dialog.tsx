"use client";

import { useForm } from "@tanstack/react-form";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	ConfirmModal,
	getModalWidthClass,
} from "@/components/patterns/dialogs/modal";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
} from "@/components/ui";
import { isForbiddenError } from "@/lib/api/client";
import { buildLocationFormDefaults } from "@/lib/forms/client-form-mappers";
import { locationSchema } from "@/lib/forms/schemas";
import { useToast } from "@/lib/hooks/use-toast";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { useLocationStore } from "@/lib/stores/location-store";
import {
	type AddressType,
	isAddressType,
	type LocationSummary,
} from "@/lib/types/company";

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

	const defaultValues = useMemo(
		() => buildLocationFormDefaults(locationToEdit),
		[locationToEdit],
	);

	const form = useForm({
		defaultValues,
		onSubmit: async ({ value }) => {
			const result = locationSchema.safeParse(value);

			if (!result.success) {
				const errorPaths = new Set(result.error.errors.map((e) => e.path[0]));

				for (const err of result.error.errors) {
					const path = err.path[0];
					if (typeof path === "string") {
						form.setFieldMeta(path as keyof typeof defaultValues, (meta) => ({
							...meta,
							isTouched: true,
						}));
						form.validateField(path as keyof typeof defaultValues, "blur");
					}
				}

				let firstErrorField: string | undefined;
				for (const fieldName of REQUIRED_FIELDS) {
					if (errorPaths.has(fieldName)) {
						firstErrorField = fieldName;
						break;
					}
				}
				if (!firstErrorField) {
					const first = result.error.errors[0]?.path[0];
					if (typeof first === "string") firstErrorField = first;
				}
				if (firstErrorField) {
					document.getElementById(firstErrorField)?.focus();
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

	useEffect(() => {
		if (open) {
			form.reset(defaultValues);
		}
	}, [defaultValues, open, form]);

	const closeAndReset = () => {
		setOpen(false);
		form.reset(defaultValues);
		if (isEditMode) {
			onSuccess?.(null);
		}
	};

	const { showDiscardConfirm, guardClose, confirmDiscard, cancelDiscard } =
		useUnsavedChanges({
			isDirty: form.state.isDirty,
			onDiscard: closeAndReset,
		});

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (nextOpen) setOpen(true);
					else guardClose();
				}}
			>
				{!isEditMode && (
					<DialogTrigger asChild>
						{trigger ?? (
							<Button>
								<MapPin className="mr-2 h-4 w-4" />
								New Location
							</Button>
						)}
					</DialogTrigger>
				)}

				<DialogContent className={getModalWidthClass("sm")}>
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
							<form.Field
								name="name"
								validators={{
									onBlur: ({ value }) =>
										!value.trim() ? "Location name is required" : undefined,
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
												placeholder="e.g. Main Plant, Warehouse #3"
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
												>
													{field.state.meta.errors[0]}
												</p>
											)}
										</div>
									);
								}}
							</form.Field>

							<form.Field
								name="addressType"
								validators={{
									onBlur: ({ value }) =>
										!value ? "Please select an address type" : undefined,
								}}
							>
								{(field) => {
									const hasError =
										field.state.meta.isTouched &&
										field.state.meta.errors.length > 0;
									return (
										<div className="grid gap-2">
											<Label htmlFor={field.name}>
												Address Type <span className="text-destructive">*</span>
											</Label>
											<Select
												value={field.state.value}
												onValueChange={(value) => {
													if (isAddressType(value)) {
														field.handleChange(value);
													}
												}}
											>
												<SelectTrigger
													id={field.name}
													aria-invalid={hasError}
													aria-describedby={
														hasError ? `${field.name}-error` : undefined
													}
													onBlur={field.handleBlur}
												>
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
											{hasError && (
												<p
													id={`${field.name}-error`}
													className="text-xs text-destructive"
												>
													{field.state.meta.errors[0]}
												</p>
											)}
										</div>
									);
								}}
							</form.Field>

							<form.Field name="address">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>Address</Label>
										<Input
											id={field.name}
											placeholder="123 Main Street"
											autoComplete="street-address"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</div>
								)}
							</form.Field>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-4">
								<div className="col-span-1 md:col-span-2">
									<form.Field
										name="city"
										validators={{
											onBlur: ({ value }) =>
												!value.trim() ? "City is required" : undefined,
										}}
									>
										{(field) => {
											const hasError =
												field.state.meta.isTouched &&
												field.state.meta.errors.length > 0;
											return (
												<div className="grid gap-2">
													<Label htmlFor={field.name}>
														City <span className="text-destructive">*</span>
													</Label>
													<Input
														id={field.name}
														placeholder="Los Angeles"
														autoComplete="address-level2"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														aria-invalid={hasError}
														aria-describedby={
															hasError ? `${field.name}-error` : undefined
														}
													/>
													{hasError && (
														<p
															id={`${field.name}-error`}
															className="text-xs text-destructive"
														>
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											);
										}}
									</form.Field>
								</div>

								<form.Field
									name="state"
									validators={{
										onBlur: ({ value }) =>
											!value.trim() ? "State is required" : undefined,
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
													placeholder="CA"
													autoComplete="address-level1"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													aria-invalid={hasError}
													aria-describedby={
														hasError ? `${field.name}-error` : undefined
													}
												/>
												{hasError && (
													<p
														id={`${field.name}-error`}
														className="text-xs text-destructive"
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
										onBlur: ({ value }) =>
											!value.trim() ? "ZIP code is required" : undefined,
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
													aria-describedby={
														hasError ? `${field.name}-error` : undefined
													}
												/>
												{hasError && (
													<p
														id={`${field.name}-error`}
														className="text-xs text-destructive"
													>
														{field.state.meta.errors[0]}
													</p>
												)}
											</div>
										);
									}}
								</form.Field>
							</div>

							<form.Field name="notes">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>Notes</Label>
										<Textarea
											id={field.name}
											placeholder="Site-specific notes..."
											rows={3}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</div>
								)}
							</form.Field>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={guardClose}
								disabled={form.state.isSubmitting}
							>
								Cancel
							</Button>
							<LoadingButton type="submit" loading={form.state.isSubmitting}>
								{isEditMode ? "Update Location" : "Create Location"}
							</LoadingButton>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<ConfirmModal
				open={showDiscardConfirm}
				onOpenChange={(next) => {
					if (!next) cancelDiscard();
				}}
				title="Discard unsaved changes?"
				description="Your changes will be lost if you close without saving."
				confirmText="Discard"
				variant="destructive"
				onConfirm={confirmDiscard}
			/>
		</>
	);
}
