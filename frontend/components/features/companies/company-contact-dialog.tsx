"use client";

/**
 * CompanyContactDialog - Add/edit a company contact.
 *
 * Identity rule: at least one of name, email, or phone required.
 * TanStack Form + Zod safety net on submit.
 * Pattern matches create-location-dialog (gold standard).
 */

import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { ConfirmModal } from "@/components/patterns/dialogs/modal";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
import {
	DialogFormActions,
	DialogFormBody,
	DialogFormContent,
	DialogFormFooter,
	DialogFormHeader,
} from "@/components/shared/forms/dialog-form-primitives";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	companyContactSchema,
	isValidEmail,
	isValidPhone,
} from "@/lib/forms/schemas";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import type { CompanyContact } from "@/lib/types/company";

interface CompanyContactDialogProps {
	contact?: CompanyContact;
	trigger: React.ReactNode;
	onSubmit: (data: {
		name?: string;
		email?: string;
		phone?: string;
		title?: string;
		notes?: string;
		isPrimary: boolean;
	}) => Promise<void>;
}

const EMPTY_CONTACT = {
	name: "",
	email: "",
	phone: "",
	title: "",
	notes: "",
	isPrimary: false,
};

/** Fields that can have onBlur validators and participate in submit-time focus */
const VALIDATABLE_FIELDS = ["name", "email", "phone"] as const;
type ValidatableField = (typeof VALIDATABLE_FIELDS)[number];

function isValidatableField(value: unknown): value is ValidatableField {
	return (
		typeof value === "string" && VALIDATABLE_FIELDS.some((f) => f === value)
	);
}

export function CompanyContactDialog({
	contact,
	trigger,
	onSubmit,
}: CompanyContactDialogProps) {
	const [open, setOpen] = useState(false);
	const [identityError, setIdentityError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const isEditMode = Boolean(contact);

	const form = useForm({
		defaultValues: EMPTY_CONTACT,
		onSubmit: async ({ value }) => {
			setIdentityError(null);
			setSubmitError(null);

			const result = companyContactSchema.safeParse(value);
			if (!result.success) {
				for (const err of result.error.errors) {
					const path = err.path[0];
					if (path === "_identity") {
						setIdentityError(err.message);
						// Focus first identity field
						document.getElementById("company-contact-name")?.focus();
						continue;
					}
					if (typeof path === "string" && isValidatableField(path)) {
						const fieldId = `company-contact-${path}`;
						form.setFieldMeta(path, (meta) => ({
							...meta,
							isTouched: true,
						}));
						form.validateField(path, "blur");
						// Focus first errored field
						if (err === result.error.errors[0]) {
							document.getElementById(fieldId)?.focus();
						}
					}
				}
				return;
			}

			try {
				const trimmedName = value.name.trim();
				const trimmedEmail = value.email.trim();
				const trimmedPhone = value.phone.trim();
				const trimmedTitle = value.title.trim();
				const trimmedNotes = value.notes.trim();

				await onSubmit({
					...(trimmedName ? { name: trimmedName } : {}),
					...(trimmedEmail ? { email: trimmedEmail } : {}),
					...(trimmedPhone ? { phone: trimmedPhone } : {}),
					...(trimmedTitle ? { title: trimmedTitle } : {}),
					...(trimmedNotes ? { notes: trimmedNotes } : {}),
					isPrimary: value.isPrimary,
				});
				setOpen(false);
				form.reset();
			} catch (error) {
				setSubmitError(
					error instanceof Error ? error.message : "Failed to save contact",
				);
			}
		},
	});

	// Populate form on open (edit mode) or reset (create mode).
	// Uses form.reset() so contact values become the baseline —
	// isDirty stays false until the user actually changes something.
	useEffect(() => {
		if (!open) return;
		setIdentityError(null);
		setSubmitError(null);
		if (contact) {
			form.reset({
				name: contact.name ?? "",
				email: contact.email ?? "",
				phone: contact.phone ?? "",
				title: contact.title ?? "",
				notes: contact.notes ?? "",
				isPrimary: contact.isPrimary,
			});
		} else {
			form.reset();
		}
	}, [open, contact, form]);

	// Clear identity error when any identity field changes
	const nameValue = form.state.values.name;
	const emailValue = form.state.values.email;
	const phoneValue = form.state.values.phone;
	useEffect(() => {
		if (identityError) {
			if (nameValue.trim() || emailValue.trim() || phoneValue.trim()) {
				setIdentityError(null);
			}
		}
	}, [identityError, nameValue, emailValue, phoneValue]);

	const closeAndReset = () => {
		setOpen(false);
		form.reset();
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
				<DialogTrigger asChild>{trigger}</DialogTrigger>
				<DialogFormContent size="md">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						<DialogFormHeader>
							<DialogTitle>
								{isEditMode ? "Edit Contact" : "Add Contact"}
							</DialogTitle>
							<DialogDescription>
								{isEditMode
									? "Update company contact details."
									: "Add a new contact to this company."}
							</DialogDescription>
						</DialogFormHeader>

						<DialogFormBody>
							{/* Name */}
							<form.Field name="name">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor="company-contact-name">Name</Label>
										<Input
											id="company-contact-name"
											placeholder="Full name"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											aria-describedby={
												identityError ? "identity-error" : undefined
											}
										/>
									</div>
								)}
							</form.Field>

							{/* Job Title */}
							<form.Field name="title">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor="company-contact-title">Job Title</Label>
										<Input
											id="company-contact-title"
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
											<Label htmlFor="company-contact-email">Email</Label>
											<Input
												id="company-contact-email"
												type="email"
												placeholder="name@company.com"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												aria-invalid={hasError}
												aria-describedby={
													hasError
														? "company-contact-email-error"
														: identityError
															? "identity-error"
															: undefined
												}
											/>
											{hasError && (
												<p
													id="company-contact-email-error"
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
											<Label htmlFor="company-contact-phone">Phone</Label>
											<Input
												id="company-contact-phone"
												type="tel"
												placeholder="(555) 123-4567"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												aria-invalid={hasError}
												aria-describedby={
													hasError
														? "company-contact-phone-error"
														: identityError
															? "identity-error"
															: undefined
												}
											/>
											{hasError && (
												<p
													id="company-contact-phone-error"
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
										<Label htmlFor="company-contact-notes">Notes</Label>
										<Textarea
											id="company-contact-notes"
											placeholder="Additional context about this contact..."
											rows={3}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</div>
								)}
							</form.Field>

							{/* Primary Contact Toggle */}
							<div className="flex items-center justify-between rounded-md border p-3">
								<div>
									<p className="text-sm font-medium">Primary contact</p>
									<p className="text-xs text-muted-foreground">
										Only one primary contact is allowed. Unset the current
										primary contact first.
									</p>
								</div>
								<form.Field name="isPrimary">
									{(field) => (
										<Switch
											checked={field.state.value}
											onCheckedChange={(checked) => field.handleChange(checked)}
										/>
									)}
								</form.Field>
							</div>

							{/* Identity rule error */}
							{identityError && (
								<p
									id="identity-error"
									className="text-xs text-destructive"
									role="alert"
								>
									{identityError}
								</p>
							)}

							{/* Server/submit error */}
							{submitError && (
								<p
									id="company-contact-submit-error"
									className="text-xs text-destructive"
									role="alert"
								>
									{submitError}
								</p>
							)}
						</DialogFormBody>

						<DialogFormFooter>
							<form.Subscribe selector={(state) => state.isSubmitting}>
								{(isSubmitting) => (
									<DialogFormActions>
										<Button
											type="button"
											variant="outline"
											onClick={guardClose}
											disabled={isSubmitting}
										>
											Cancel
										</Button>
										<LoadingButton type="submit" loading={isSubmitting}>
											{isEditMode ? "Save Changes" : "Add Contact"}
										</LoadingButton>
									</DialogFormActions>
								)}
							</form.Subscribe>
						</DialogFormFooter>
					</form>
				</DialogFormContent>
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
