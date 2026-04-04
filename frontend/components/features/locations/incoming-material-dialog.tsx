"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/hooks/use-toast";
import type {
	IncomingMaterial,
	IncomingMaterialCategory,
} from "@/lib/types/company";
import {
	INCOMING_MATERIAL_CATEGORIES,
	INCOMING_MATERIAL_CATEGORY_LABELS,
} from "@/lib/types/company";

interface IncomingMaterialDialogProps {
	material?: IncomingMaterial;
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSubmit: (data: {
		name: string;
		category: IncomingMaterialCategory;
		volumeFrequency: string;
		qualitySpec?: string;
		currentSupplier?: string;
		notes?: string;
	}) => Promise<void>;
}

const EMPTY_MATERIAL = {
	name: "",
	category: "" as IncomingMaterialCategory,
	volumeFrequency: "",
	qualitySpec: "",
	currentSupplier: "",
	notes: "",
};

export function IncomingMaterialDialog({
	material,
	trigger,
	open: controlledOpen,
	onOpenChange,
	onSubmit,
}: IncomingMaterialDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const { toast } = useToast();
	const isEditMode = Boolean(material);

	// Support both controlled and uncontrolled modes
	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;
	const setOpen = (value: boolean) => {
		if (isControlled) {
			onOpenChange?.(value);
		} else {
			setInternalOpen(value);
		}
	};

	const form = useForm({
		defaultValues: EMPTY_MATERIAL,
		onSubmit: async ({ value }) => {
			if (!value.name.trim()) {
				toast({
					title: "Validation Error",
					description: "Material name is required",
					variant: "destructive",
				});
				return;
			}

			if (!value.category) {
				toast({
					title: "Validation Error",
					description: "Category is required",
					variant: "destructive",
				});
				return;
			}

			if (!value.volumeFrequency.trim()) {
				toast({
					title: "Validation Error",
					description: "Volume/frequency is required",
					variant: "destructive",
				});
				return;
			}

			try {
				const payload: Parameters<typeof onSubmit>[0] = {
					name: value.name.trim(),
					category: value.category,
					volumeFrequency: value.volumeFrequency.trim(),
				};
				const qualitySpec = value.qualitySpec?.trim();
				if (qualitySpec) payload.qualitySpec = qualitySpec;
				const currentSupplier = value.currentSupplier?.trim();
				if (currentSupplier) payload.currentSupplier = currentSupplier;
				const notes = value.notes?.trim();
				if (notes) payload.notes = notes;

				await onSubmit(payload);
				setOpen(false);
			} catch (error) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to save material",
					variant: "destructive",
				});
			}
		},
	});

	useEffect(() => {
		if (!open) return;
		if (material) {
			form.setFieldValue("name", material.name || "");
			form.setFieldValue("category", material.category);
			form.setFieldValue("volumeFrequency", material.volumeFrequency || "");
			form.setFieldValue("qualitySpec", material.qualitySpec || "");
			form.setFieldValue("currentSupplier", material.currentSupplier || "");
			form.setFieldValue("notes", material.notes || "");
		} else {
			form.reset();
		}
	}, [open, material, form]);

	const dialogTitle = isEditMode
		? "Edit Incoming Material"
		: "Add Incoming Material";
	const dialogDescription = isEditMode
		? "Update incoming material details for this location."
		: "Add a new incoming material for this location.";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="sm:max-w-[520px]">
				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>{dialogTitle}</DialogTitle>
						<DialogDescription>{dialogDescription}</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<form.Field name="name">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										Name <span className="text-destructive">*</span>
									</Label>
									<Input
										id={field.name}
										placeholder="e.g., Sulfuric Acid, Steel Sheets"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
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

						<form.Field name="category">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										Category <span className="text-destructive">*</span>
									</Label>
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value as IncomingMaterialCategory)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a category" />
										</SelectTrigger>
										<SelectContent>
											{INCOMING_MATERIAL_CATEGORIES.map((category) => (
												<SelectItem key={category} value={category}>
													{INCOMING_MATERIAL_CATEGORY_LABELS[category]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>

						<form.Field name="volumeFrequency">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										Volume / Frequency{" "}
										<span className="text-destructive">*</span>
									</Label>
									<Input
										id={field.name}
										placeholder="e.g., 500 kg/month, weekly delivery"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="qualitySpec">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Quality Specification</Label>
									<Input
										id={field.name}
										placeholder="e.g., 98% purity, Grade A"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="currentSupplier">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Current Supplier</Label>
									<Input
										id={field.name}
										placeholder="e.g., ACME Corp"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="notes">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Notes</Label>
									<Textarea
										id={field.name}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
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
										state.values.category &&
										state.values.volumeFrequency?.trim(),
								),
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<>
									<Button
										type="button"
										variant="outline"
										onClick={() => setOpen(false)}
										disabled={isSubmitting}
									>
										Cancel
									</Button>
									<LoadingButton
										type="submit"
										loading={isSubmitting}
										disabled={!canSubmit}
									>
										{isEditMode ? "Save Changes" : "Add Material"}
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
