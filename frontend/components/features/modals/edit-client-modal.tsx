"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
} from "@/components/ui";
import { companiesAPI } from "@/lib/api/companies";
import {
	buildEditClientContactPayload,
	buildEditClientInitialValues,
	type EditClientFormValues,
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
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const form = useForm<EditClientFormValues>({
		resolver: zodResolver(editClientSchema),
		defaultValues: buildEditClientInitialValues(profile),
	});

	useEffect(() => {
		if (open) {
			form.reset(buildEditClientInitialValues(profile));
			setError(null);
		}
	}, [profile, open, form]);

	async function handleSave(values: EditClientFormValues) {
		try {
			setSaving(true);
			setError(null);

			await companiesAPI.update(profile.id, {
				name: values.companyName.trim(),
				industry: values.industry.trim(),
			});

			if (profile.primaryContact) {
				await companiesAPI.updateContact(
					profile.id,
					profile.primaryContact.id,
					buildEditClientContactPayload(values),
				);
			}

			onClose();
			onSaved?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save changes");
		} finally {
			setSaving(false);
		}
	}

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

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSave)}>
						<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="companyName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Company Name</FormLabel>
											<FormControl>
												<Input className="bg-surface" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="industry"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Industry</FormLabel>
											<FormControl>
												<Input className="bg-surface" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{profile.primaryContact ? (
								<>
									<p className="mt-2 text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
										Primary contact
									</p>

									<div className="grid gap-4 md:grid-cols-2">
										<FormField
											control={form.control}
											name="contactName"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Name</FormLabel>
													<FormControl>
														<Input className="bg-surface" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="contactTitle"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Title</FormLabel>
													<FormControl>
														<Input className="bg-surface" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<FormField
											control={form.control}
											name="contactEmail"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Email</FormLabel>
													<FormControl>
														<Input
															type="email"
															className="bg-surface"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="contactPhone"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Phone</FormLabel>
													<FormControl>
														<Input className="bg-surface" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
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
									<p className="text-sm font-semibold text-foreground">Locations</p>
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
								<Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
									Cancel
								</Button>
								<Button type="submit" disabled={saving}>
									{saving && <Loader2 className="mr-2 size-4 animate-spin" />}
									Save Changes
								</Button>
							</div>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
