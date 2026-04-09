"use client";

import { useForm } from "@tanstack/react-form";
import { Building2, Mail, MapPin, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
	AccountStatusToggle,
	ClientFieldLabel as FieldLabel,
	ClientInputWithIcon as InputWithIcon,
} from "@/components/features/clients/client-form-primitives";
import { ConfirmModal } from "@/components/patterns/dialogs/modal";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
import {
	DialogFormActions,
	DialogFormBody,
	DialogFormContent,
	DialogFormFooter,
	DialogFormHeader,
} from "@/components/shared/forms/dialog-form-primitives";
import {
	IndustryPicker,
	SubIndustryPicker,
} from "@/components/shared/forms/industry-pickers";
import {
	Badge,
	Button,
	Dialog,
	DialogDescription,
	DialogTitle,
	Input,
	Textarea,
} from "@/components/ui";
import { APIClientError } from "@/lib/api/client";
import { companiesAPI } from "@/lib/api/companies";
import {
	buildEditClientCompanyPayload,
	buildEditClientContactPayload,
	buildEditClientInitialValues,
	hasEditClientPrimaryContactDraft,
} from "@/lib/forms/client-form-mappers";
import {
	editClientSchema,
	isValidEmail,
	isValidPhone,
} from "@/lib/forms/schemas";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import type { ClientProfile } from "@/lib/mappers/company-client";
import { type Sector, sectorsConfig } from "@/lib/sectors-config";
import { cn } from "@/lib/utils";
import { getLocationsSectionMeta } from "./edit-client-modal.layout";

type EditClientModalProps = {
	profile: ClientProfile;
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
};

const isSector = (value: string): value is Sector => {
	return sectorsConfig.some((sector) => sector.id === value);
};

export function EditClientModal({
	profile,
	open,
	onClose,
	onSaved,
}: EditClientModalProps) {
	const [error, setError] = useState<string | null>(null);

	const applyBackendValidationErrors = (err: APIClientError): boolean => {
		if (err.code !== "VALIDATION_ERROR") {
			return false;
		}

		const rawDetails = (err.details as { errors?: unknown } | undefined)?.errors;
		if (!Array.isArray(rawDetails)) {
			return false;
		}

		let appliedAny = false;

		for (const issue of rawDetails) {
			if (typeof issue !== "object" || issue === null) {
				continue;
			}

			const path = (issue as { loc?: unknown }).loc;
			const message = (issue as { msg?: unknown }).msg;
			if (!Array.isArray(path) || typeof message !== "string") {
				continue;
			}

			const fieldName = path[path.length - 1];
			if (typeof fieldName !== "string") {
				continue;
			}

			const resolvedFieldName =
				fieldName === "name"
					? "companyName"
					: fieldName === "account_status"
						? "accountStatus"
						: fieldName;

			if (
				resolvedFieldName === "subsector" ||
				resolvedFieldName === "sector" ||
				resolvedFieldName === "companyName" ||
				resolvedFieldName === "accountStatus"
			) {
				form.setFieldMeta(
					resolvedFieldName as keyof ReturnType<
						typeof buildEditClientInitialValues
					>,
					(meta) => ({ ...meta, isTouched: true, errors: [message] }),
				);
				appliedAny = true;
			}
		}

		return appliedAny;
	};

	const form = useForm({
		defaultValues: buildEditClientInitialValues(profile),
		onSubmit: async ({ value }) => {
			setError(null);

			const result = editClientSchema.safeParse(value);
			if (!result.success) {
				for (const err of result.error.errors) {
					const path = err.path[0];
					if (typeof path === "string") {
						form.setFieldMeta(
							path as keyof ReturnType<typeof buildEditClientInitialValues>,
							(meta) => ({ ...meta, isTouched: true, errors: [err.message] }),
						);
					}
				}
				return;
			}

			try {
				await companiesAPI.update(
					profile.id,
					buildEditClientCompanyPayload(result.data),
				);

				if (profile.primaryContact) {
					await companiesAPI.updateContact(
						profile.id,
						profile.primaryContact.id,
						buildEditClientContactPayload(result.data),
					);
				} else if (hasEditClientPrimaryContactDraft(result.data)) {
					await companiesAPI.createContact(profile.id, {
						...buildEditClientContactPayload(result.data),
						isPrimary: true,
					});
				}

				onClose();
				onSaved?.();
			} catch (err) {
				if (err instanceof APIClientError) {
					if (applyBackendValidationErrors(err)) {
						setError("Please review the highlighted fields and try again.");
						return;
					}
					setError(err.message);
					return;
				}

				setError(err instanceof Error ? err.message : "Failed to save changes");
			}
		},
	});

	useEffect(() => {
		if (open) {
			form.reset(buildEditClientInitialValues(profile));
			setError(null);
		}
	}, [profile, open, form]);

	const submitting = form.state.isSubmitting;
	const locationsMeta = getLocationsSectionMeta(profile.locations.length);

	const closeAndReset = () => {
		onClose();
		form.reset(buildEditClientInitialValues(profile));
		setError(null);
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
					if (!nextOpen) guardClose();
				}}
			>
				<DialogFormContent
					size="lg"
					className={cn(
						"w-[min(94vw,780px)] max-w-none",
						"flex max-h-[min(92vh,860px)] flex-col overflow-hidden rounded-2xl border border-border/40 bg-surface-container-lowest p-0 shadow-lg",
					)}
				>
					<DialogFormHeader className="flex flex-col gap-2 bg-surface-container-low px-6 py-5 text-left">
						<div className="flex items-center gap-2">
							<Building2 aria-hidden className="text-primary" />
							<Badge variant="secondary" className="rounded-full">
								Client profile
							</Badge>
						</div>
						<DialogTitle className="font-display text-2xl font-semibold tracking-tight">
							Edit Client Profile
						</DialogTitle>
						<DialogDescription>
							Update company information and primary contact details.
						</DialogDescription>
					</DialogFormHeader>

					<form
						className="flex min-h-0 flex-1 flex-col"
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						<DialogFormBody className="min-h-0 flex-1 gap-0 overflow-y-auto bg-surface-container-lowest px-6 py-5">
							<div className="flex flex-col gap-5">
								<div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
									<form.Field
										name="companyName"
										validators={{
											onBlur: ({ value }) =>
												!value.trim() ? "Company name is required" : undefined,
										}}
									>
										{(field) => {
											const hasError =
												field.state.meta.isTouched &&
												field.state.meta.errors.length > 0;
											return (
												<div className="grid gap-1.5">
													<FieldLabel required htmlFor={field.name}>
														Company name
													</FieldLabel>
													<InputWithIcon
														id={field.name}
														icon={<Building2 className="size-4" />}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														aria-invalid={hasError}
														aria-required="true"
													/>
													{hasError && (
														<p className="text-xs text-destructive">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											);
										}}
									</form.Field>

									<form.Field
										name="sector"
										validators={{
											onBlur: ({ value }) =>
												!value.trim() ? "Please select a sector" : undefined,
										}}
									>
										{(field) => {
											const hasError =
												field.state.meta.isTouched &&
												field.state.meta.errors.length > 0;
											return (
												<div className="grid gap-1.5">
													<FieldLabel required htmlFor={field.name}>
														Industry type
													</FieldLabel>
													<IndustryPicker
														id={field.name}
														value={field.state.value}
														onValueChange={(value) => {
															field.handleChange(value);
															form.setFieldValue("subsector", "");
														}}
														triggerClassName="bg-surface"
														aria-invalid={hasError}
													/>
													{hasError && (
														<p className="text-xs text-destructive">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											);
										}}
									</form.Field>
								</div>

								<div className="grid gap-4">
									<form.Field name="subsector">
										{(field) => {
											const hasError =
												field.state.meta.isTouched &&
												field.state.meta.errors.length > 0;
											return (
												<div className="grid min-w-0 gap-1.5">
													<FieldLabel htmlFor={field.name}>Sub-industry</FieldLabel>
													<SubIndustryPicker
														id={field.name}
														value={field.state.value}
														onValueChange={(value) => field.handleChange(value)}
														sector={
															isSector(form.state.values.sector)
																? form.state.values.sector
																: ""
														}
														triggerClassName="bg-surface"
														aria-invalid={hasError}
													/>
													{hasError && (
														<p className="text-xs text-destructive">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											);
										}}
									</form.Field>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<form.Field name="accountStatus">
											{(field) => (
												<div className="grid min-w-0 gap-1.5">
													<FieldLabel htmlFor="edit-client-account-status-toggle">
														Account status
													</FieldLabel>
													<AccountStatusToggle
														aria-label="Account status"
														id="edit-client-account-status-toggle"
														value={field.state.value}
														onValueChange={field.handleChange}
														className="w-full"
													/>
												</div>
											)}
										</form.Field>

										<form.Field name="companyNotes">
											{(field) => (
												<div className="grid gap-1.5">
													<FieldLabel htmlFor={field.name}>Notes</FieldLabel>
													<Textarea
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														rows={2}
														placeholder="Internal notes about this client…"
														className="resize-none bg-surface-container-low/60 text-sm"
													/>
												</div>
											)}
										</form.Field>
									</div>
								</div>

								<p className="mt-2 text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Primary contact
								</p>

								<div className="flex flex-col gap-5">
									<div className="flex flex-col gap-4">
										<div className="grid gap-4 xl:grid-cols-2">
											<form.Field name="contactName">
												{(field) => (
													<div className="grid gap-1.5">
														<FieldLabel htmlFor={field.name}>
															Full legal name
														</FieldLabel>
														<InputWithIcon
															id={field.name}
															icon={<User className="size-4" />}
															placeholder="Full legal name"
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															onBlur={field.handleBlur}
														/>
													</div>
												)}
											</form.Field>

											<form.Field name="contactTitle">
												{(field) => (
													<div className="grid gap-1.5">
														<FieldLabel htmlFor={field.name}>Title</FieldLabel>
														<Input
															id={field.name}
															className="bg-surface-container-low/60"
															placeholder="e.g. Operations Manager"
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															onBlur={field.handleBlur}
														/>
													</div>
												)}
											</form.Field>
										</div>

										<div className="grid gap-4 xl:grid-cols-2">
											<form.Field
												name="contactEmail"
												validators={{
													onBlur: ({ value }) => {
														const trimmed = value.trim();
														if (trimmed && !isValidEmail(trimmed)) {
															return "Enter a valid email address.";
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
														<div className="grid gap-1.5">
															<FieldLabel htmlFor={field.name}>
																Email address
															</FieldLabel>
															<InputWithIcon
																id={field.name}
																type="email"
																icon={<Mail className="size-4" />}
																placeholder="contact@company.com"
																value={field.state.value}
																onChange={(e) =>
																	field.handleChange(e.target.value)
																}
																onBlur={field.handleBlur}
																aria-invalid={hasError}
															/>
															{hasError && (
																<p className="text-xs text-destructive">
																	{field.state.meta.errors[0]}
																</p>
															)}
														</div>
													);
												}}
											</form.Field>

											<form.Field
												name="contactPhone"
												validators={{
													onBlur: ({ value }) => {
														const trimmed = value.trim();
														if (trimmed && !isValidPhone(trimmed)) {
															return "Phone must be 3-50 characters and include at least one digit.";
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
														<div className="grid gap-1.5">
															<FieldLabel htmlFor={field.name}>
																Phone number
															</FieldLabel>
															<InputWithIcon
																id={field.name}
																icon={<Phone className="size-4" />}
																placeholder="+1 (555) 000-0000"
																value={field.state.value}
																onChange={(e) =>
																	field.handleChange(e.target.value)
																}
																onBlur={field.handleBlur}
																aria-invalid={hasError}
															/>
															{hasError && (
																<p className="text-xs text-destructive">
																	{field.state.meta.errors[0]}
																</p>
															)}
														</div>
													);
												}}
											</form.Field>
										</div>

										{!profile.primaryContact && (
											<p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
												No primary contact exists yet. Filling contact fields
												will create one as the primary contact.
											</p>
										)}
									</div>

									<div className="rounded-xl bg-surface p-4">
										<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<MapPin aria-hidden className="size-4 text-primary" />
												<p className="text-sm font-semibold text-foreground">
													Locations
												</p>
											</div>
											<Badge variant="outline" className="rounded-full text-xs">
												{locationsMeta.countLabel}
											</Badge>
										</div>
										<p className="text-xs text-muted-foreground">
											Locations are read-only in this modal.
										</p>
										<div
											className={cn(
												"mt-2 flex flex-col gap-2",
												locationsMeta.isCompact &&
													"max-h-56 overflow-y-auto pr-1",
											)}
										>
											{profile.locations.length === 0 ? (
												<p className="text-xs text-muted-foreground">
													{locationsMeta.emptyMessage}
												</p>
											) : (
												profile.locations.map((location) => (
													<div
														key={location.id}
														className={cn(
															"flex items-start justify-between gap-3 rounded-lg bg-surface-container-low",
															locationsMeta.isCompact
																? "px-2.5 py-1.5"
																: "px-3 py-2",
														)}
													>
														<div className="min-w-0">
															<p className="truncate text-sm font-medium text-foreground">
																{location.name}
															</p>
															<p className="truncate text-xs text-muted-foreground">
																{location.address
																	? `${location.address} · `
																	: ""}
																{location.city}, {location.state}
															</p>
														</div>
														<div className="flex shrink-0 items-center gap-2">
															<Badge
																variant="outline"
																className="rounded-full text-xs"
															>
																Read-only
															</Badge>
															<Badge
																variant="outline"
																className="rounded-full text-xs"
															>
																{location.projectCount} project
																{location.projectCount !== 1 ? "s" : ""}
															</Badge>
														</div>
													</div>
												))
											)}
										</div>
									</div>
								</div>

								{error && <p className="text-sm text-destructive">{error}</p>}
							</div>
						</DialogFormBody>

						<DialogFormFooter className="border-t border-border/15 bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-end">
							<DialogFormActions className="flex-row items-center gap-2">
								<Button
									variant="ghost"
									type="button"
									onClick={guardClose}
									disabled={submitting}
								>
									Cancel
								</Button>
								<LoadingButton type="submit" loading={submitting}>
									Save Changes
								</LoadingButton>
							</DialogFormActions>
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
