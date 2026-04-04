"use client";

/**
 * LocationContactDialog - Add/edit a location contact.
 *
 * Name is required. Email/phone validated onBlur when provided.
 * TanStack Form with accessible inline errors.
 * Pattern matches create-location-dialog (gold standard).
 */

import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
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
import { Textarea } from "@/components/ui/textarea";
import { isValidEmail, isValidPhone } from "@/lib/forms/schemas";
import { useToast } from "@/lib/hooks/use-toast";
import type { LocationContact } from "@/lib/types/company";

interface LocationContactDialogProps {
	contact?: LocationContact;
	trigger: React.ReactNode;
	onSubmit: (data: {
		name: string;
		email?: string;
		phone?: string;
		title?: string;
		notes?: string;
	}) => Promise<void>;
}

const EMPTY_CONTACT = {
	name: "",
	email: "",
	phone: "",
	title: "",
	notes: "",
};

const REQUIRED_FIELDS = ["name"] as const;

export function LocationContactDialog({
	contact,
	trigger,
	onSubmit,
}: LocationContactDialogProps) {
	const [open, setOpen] = useState(false);
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
	const { toast } = useToast();
	const isEditMode = Boolean(contact);

	const form = useForm({
		defaultValues: EMPTY_CONTACT,
		onSubmit: async ({ value }) => {
			if (!value.name.trim()) {
				// Mark touched + trigger blur validator so error renders
				for (const fieldName of REQUIRED_FIELDS) {
					form.setFieldMeta(fieldName, (meta) => ({
						...meta,
						isTouched: true,
					}));
					form.validateField(fieldName, "blur");
				}
				document.getElementById("name")?.focus();
				return;
			}

			// Validate email/phone if provided
			const trimmedEmail = value.email.trim();
			if (trimmedEmail && !isValidEmail(trimmedEmail)) {
				form.setFieldMeta("email", (meta) => ({
					...meta,
					isTouched: true,
				}));
				form.validateField("email", "blur");
				document.getElementById("email")?.focus();
				return;
			}

			const trimmedPhone = value.phone.trim();
			if (trimmedPhone && !isValidPhone(trimmedPhone)) {
				form.setFieldMeta("phone", (meta) => ({
					...meta,
					isTouched: true,
				}));
				form.validateField("phone", "blur");
				document.getElementById("phone")?.focus();
				return;
			}

			try {
				const payload: Parameters<typeof onSubmit>[0] = {
					name: value.name.trim(),
				};
				if (trimmedEmail) payload.email = trimmedEmail;
				if (trimmedPhone) payload.phone = trimmedPhone;
				const title = value.title.trim();
				if (title) payload.title = title;
				const notes = value.notes.trim();
				if (notes) payload.notes = notes;

				await onSubmit(payload);
				setOpen(false);
				form.reset();
			} catch (error) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to save contact",
					variant: "destructive",
				});
			}
		},
	});

	useEffect(() => {
		if (!open) return;
		if (contact) {
			form.reset({
				name: contact.name || "",
				email: contact.email || "",
				phone: contact.phone || "",
				title: contact.title || "",
				notes: contact.notes || "",
			});
		} else {
			form.reset();
		}
	}, [open, contact, form]);

	const dialogTitle = isEditMode ? "Edit Contact" : "Add Contact";
	const dialogDescription = isEditMode
		? "Update contact details for this location."
		: "Add a new contact for this location.";

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			if (form.state.isDirty) {
				setShowDiscardConfirm(true);
				return;
			}
			setOpen(false);
			form.reset();
			return;
		}
		setOpen(true);
	};

	const handleDiscardConfirm = () => {
		setShowDiscardConfirm(false);
		setOpen(false);
		form.reset();
	};

	return (
		<>
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogTrigger asChild>{trigger}</DialogTrigger>
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
							{/* Name (required) */}
							<form.Field
								name="name"
								validators={{
									onBlur: ({ value }) => {
										if (!value.trim()) return "Contact name is required";
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
												Name <span className="text-destructive">*</span>
											</Label>
											<Input
												id={field.name}
												placeholder="Full name"
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

							{/* Job Title */}
							<form.Field name="title">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>Job Title</Label>
										<Input
											id={field.name}
											placeholder="e.g. Plant Manager, Operations Director"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</div>
								)}
							</form.Field>

							{/* Email */}
							<form.Field
								name="email"
								validators={{
									onBlur: ({ value }) => {
										const trimmed = value.trim();
										if (trimmed && !isValidEmail(trimmed))
											return "Enter a valid email address.";
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
											<Label htmlFor={field.name}>Email</Label>
											<Input
												type="email"
												id={field.name}
												placeholder="name@company.com"
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
													role="alert"
												>
													{field.state.meta.errors[0]}
												</p>
											)}
										</div>
									);
								}}
							</form.Field>

							{/* Phone */}
							<form.Field
								name="phone"
								validators={{
									onBlur: ({ value }) => {
										const trimmed = value.trim();
										if (trimmed && !isValidPhone(trimmed))
											return "Phone must be 3-50 characters and include at least one digit.";
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
											<Label htmlFor={field.name}>Phone</Label>
											<Input
												type="tel"
												id={field.name}
												placeholder="(555) 123-4567"
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
													role="alert"
												>
													{field.state.meta.errors[0]}
												</p>
											)}
										</div>
									);
								}}
							</form.Field>

							{/* Notes */}
							<form.Field name="notes">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>Notes</Label>
										<Textarea
											id={field.name}
											placeholder="Additional context about this contact..."
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
											{isEditMode ? "Save Changes" : "Add Contact"}
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
