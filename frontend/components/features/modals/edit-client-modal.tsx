"use client";

import { useForm } from "@tanstack/react-form";
import { Building2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
} from "@/components/ui";
import { Label } from "@/components/ui/label";
import { companiesAPI } from "@/lib/api/companies";
import {
	buildEditClientContactPayload,
	buildEditClientInitialValues,
} from "@/lib/forms/client-form-mappers";
import { isValidEmail, isValidPhone } from "@/lib/forms/schemas";
import type { ClientProfile } from "@/lib/mappers/company-client";

const editClientSchema = z.object({
	companyName: z
		.string()
		.trim()
		.min(1, "Company name is required")
		.max(255, "Company name must be 255 characters or fewer"),
	industry: z.string().max(255, "Industry must be 255 characters or fewer"),
	contactName: z.string(),
	contactTitle: z.string(),
	contactEmail: z.string().refine((value) => {
		const trimmed = value.trim();
		return trimmed.length === 0 || isValidEmail(trimmed);
	}, "Enter a valid email address."),
	contactPhone: z.string().refine((value) => {
		const trimmed = value.trim();
		return trimmed.length === 0 || isValidPhone(trimmed);
	}, "Phone must be 3-50 characters and include at least one digit."),
});

type EditClientModalProps = {
	profile: ClientProfile;
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
};

export function EditClientModal({
	profile,
	open,
	onClose,
	onSaved,
}: EditClientModalProps) {
	const [error, setError] = useState<string | null>(null);

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
				await companiesAPI.update(profile.id, {
					name: result.data.companyName.trim(),
					industry: result.data.industry.trim(),
				});

				if (profile.primaryContact) {
					await companiesAPI.updateContact(
						profile.id,
						profile.primaryContact.id,
						buildEditClientContactPayload(result.data),
					);
				}

				onClose();
				onSaved?.();
			} catch (err) {
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

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent className="w-[min(92vw,900px)] max-w-none rounded-xl border border-border/40 bg-surface-container-lowest p-0 shadow-lg">
				<DialogHeader className="flex flex-col gap-2 bg-surface-container-low px-6 py-5 text-left">
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
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
						<div className="grid gap-4 md:grid-cols-2">
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
											<Label htmlFor={field.name}>Company Name</Label>
											<Input
												id={field.name}
												className="bg-surface"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
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

							<form.Field name="industry">
								{(field) => (
									<div className="grid gap-1.5">
										<Label htmlFor={field.name}>Industry</Label>
										<Input
											id={field.name}
											className="bg-surface"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</div>
								)}
							</form.Field>
						</div>

						{profile.primaryContact ? (
							<>
								<p className="mt-2 text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Primary contact
								</p>

								<div className="grid gap-4 md:grid-cols-2">
									<form.Field name="contactName">
										{(field) => (
											<div className="grid gap-1.5">
												<Label htmlFor={field.name}>Name</Label>
												<Input
													id={field.name}
													className="bg-surface"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="contactTitle">
										{(field) => (
											<div className="grid gap-1.5">
												<Label htmlFor={field.name}>Title</Label>
												<Input
													id={field.name}
													className="bg-surface"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
												/>
											</div>
										)}
									</form.Field>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
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
													<Label htmlFor={field.name}>Email</Label>
													<Input
														id={field.name}
														type="email"
														className="bg-surface"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
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
													<Label htmlFor={field.name}>Phone</Label>
													<Input
														id={field.name}
														className="bg-surface"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
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
							</>
						) : (
							<p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
								No primary contact to edit. Assign a primary contact from the
								admin panel.
							</p>
						)}

						<div className="rounded-xl bg-surface p-4">
							<div className="mb-3 flex items-center gap-2">
								<MapPin aria-hidden className="size-4 text-primary" />
								<p className="text-sm font-semibold text-foreground">
									Locations
								</p>
							</div>
							<div className="flex flex-col gap-2">
								{profile.locations.length === 0 ? (
									<p className="text-xs text-muted-foreground">
										No locations registered.
									</p>
								) : (
									profile.locations.map((location) => (
										<div
											key={location.id}
											className="flex items-start justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"
										>
											<div>
												<p className="text-sm font-medium text-foreground">
													{location.name}
												</p>
												<p className="text-xs text-muted-foreground">
													{location.address ? `${location.address} · ` : ""}
													{location.city}, {location.state}
												</p>
											</div>
											<Badge variant="outline" className="rounded-full text-xs">
												{location.projectCount} project
												{location.projectCount !== 1 ? "s" : ""}
											</Badge>
										</div>
									))
								)}
							</div>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}
					</div>

					<DialogFooter className="bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-end">
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								type="button"
								onClick={onClose}
								disabled={submitting}
							>
								Cancel
							</Button>
							<LoadingButton type="submit" loading={submitting}>
								Save Changes
							</LoadingButton>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
