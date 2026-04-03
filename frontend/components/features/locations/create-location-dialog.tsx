"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
	LoadingButton,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
} from "@/components/ui";
import { isForbiddenError } from "@/lib/api/client";
import { buildLocationFormDefaults } from "@/lib/forms/client-form-mappers";
import { type LocationFormData, locationSchema } from "@/lib/forms/schemas";
import { useToast } from "@/lib/hooks/use-toast";
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
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
	const { createLocation, updateLocation } = useLocationStore();
	const { toast } = useToast();

	const defaultValues = useMemo(
		() => buildLocationFormDefaults(locationToEdit),
		[locationToEdit],
	);

	const form = useForm<LocationFormData>({
		resolver: zodResolver(locationSchema),
		defaultValues,
		mode: "onBlur",
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

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			if (form.formState.isDirty) {
				setShowDiscardConfirm(true);
				return;
			}
			closeAndReset();
			return;
		}
		setOpen(true);
	};

	const handleDiscardConfirm = () => {
		setShowDiscardConfirm(false);
		closeAndReset();
	};

	const handleInvalidSubmit = (errors: FieldErrors<LocationFormData>) => {
		const firstRequiredField = REQUIRED_FIELDS.find((field) => errors[field]);
		const firstField = firstRequiredField ?? Object.keys(errors)[0];
		if (firstField) {
			form.setFocus(firstField as keyof LocationFormData);
		}
	};

	const handleSubmit = async (values: LocationFormData) => {
		try {
			if (isEditMode && locationToEdit) {
				const location = await updateLocation(locationToEdit.id, {
					...values,
					zipCode: values.zipCode.trim(),
				});

				toast({
					title: "Location updated",
					description: `${values.name} has been updated successfully.`,
				});

				setOpen(false);
				form.reset(defaultValues);
				onSuccess?.(location);
				return;
			}

			const location = await createLocation(companyId, {
				...values,
				zipCode: values.zipCode.trim(),
				companyId,
			});

			toast({
				title: "Location created",
				description: `${values.name} has been created successfully.`,
			});

			setOpen(false);
			form.reset(defaultValues);
			onSuccess?.(location);
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to create location",
					variant: "destructive",
				});
			}
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
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)}
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
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Location Name <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													placeholder="e.g. Main Plant, Warehouse #3"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="addressType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Address Type <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={(value) => {
														if (isAddressType(value)) {
															field.onChange(value);
														}
													}}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select type…" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="headquarters">Headquarters</SelectItem>
														<SelectItem value="pickup">Pick-up</SelectItem>
														<SelectItem value="delivery">Delivery</SelectItem>
														<SelectItem value="billing">Billing</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="address"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Address</FormLabel>
											<FormControl>
												<Input
													placeholder="123 Main Street"
													autoComplete="street-address"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-1 gap-3 md:grid-cols-4">
									<div className="col-span-1 md:col-span-2">
										<FormField
											control={form.control}
											name="city"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														City <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															placeholder="Los Angeles"
															autoComplete="address-level2"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<FormField
										control={form.control}
										name="state"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													State <span className="text-destructive">*</span>
												</FormLabel>
												<FormControl>
													<Input
														placeholder="CA"
														autoComplete="address-level1"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="zipCode"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													ZIP <span className="text-destructive">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="text"
														inputMode="text"
														autoComplete="postal-code"
														placeholder="90210"
														maxLength={10}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={form.control}
									name="notes"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Notes</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Site-specific notes..."
													rows={3}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={form.formState.isSubmitting}
								>
									Cancel
								</Button>
								<LoadingButton type="submit" loading={form.formState.isSubmitting}>
									{isEditMode ? "Update Location" : "Create Location"}
								</LoadingButton>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			<AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
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
