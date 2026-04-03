"use client";

import { Building2, Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { companiesAPI } from "@/lib/api/companies";
import type { ClientProfile } from "@/lib/mappers/company-client";

type EditClientModalProps = {
	profile: ClientProfile;
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
};

type FormState = {
	companyName: string;
	industry: string;
	contactName: string;
	contactTitle: string;
	contactEmail: string;
	contactPhone: string;
};

function getInitialForm(profile: ClientProfile): FormState {
	return {
		companyName: profile.name,
		industry: profile.industry,
		contactName: profile.primaryContact?.name ?? "",
		contactTitle: profile.primaryContact?.title ?? "",
		contactEmail: profile.primaryContact?.email ?? "",
		contactPhone: profile.primaryContact?.phone ?? "",
	};
}

export function EditClientModal({
	profile,
	open,
	onClose,
	onSaved,
}: EditClientModalProps) {
	const [form, setForm] = useState<FormState>(() => getInitialForm(profile));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setForm(getInitialForm(profile));
			setError(null);
		}
	}, [profile, open]);

	function updateField(field: keyof FormState, value: string) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	async function handleSave() {
		try {
			setSaving(true);
			setError(null);

			// Update company fields
			await companiesAPI.update(profile.id, {
				name: form.companyName,
				industry: form.industry,
			});

			// Update primary contact if one exists
			if (profile.primaryContact) {
				const contactPayload: Record<string, string> = {};
				if (form.contactName) contactPayload.name = form.contactName;
				if (form.contactTitle) contactPayload.title = form.contactTitle;
				if (form.contactEmail) contactPayload.email = form.contactEmail;
				if (form.contactPhone) contactPayload.phone = form.contactPhone;

				await companiesAPI.updateContact(
					profile.id,
					profile.primaryContact.id,
					contactPayload,
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

				<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
					{/* Company fields */}
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="edit-client-company">Company Name</Label>
							<Input
								id="edit-client-company"
								value={form.companyName}
								onChange={(event) =>
									updateField("companyName", event.target.value)
								}
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="edit-client-industry">Industry</Label>
							<Input
								id="edit-client-industry"
								value={form.industry}
								onChange={(event) =>
									updateField("industry", event.target.value)
								}
								className="bg-surface"
							/>
						</div>
					</div>

					{/* Primary contact fields */}
					{profile.primaryContact ? (
						<>
							<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary mt-2">
								Primary contact
							</p>
							<div className="grid gap-4 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="edit-client-contact-name">Name</Label>
									<Input
										id="edit-client-contact-name"
										value={form.contactName}
										onChange={(event) =>
											updateField("contactName", event.target.value)
										}
										className="bg-surface"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="edit-client-contact-title">Title</Label>
									<Input
										id="edit-client-contact-title"
										value={form.contactTitle}
										onChange={(event) =>
											updateField("contactTitle", event.target.value)
										}
										className="bg-surface"
									/>
								</div>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="edit-client-email">Email</Label>
									<Input
										id="edit-client-email"
										type="email"
										value={form.contactEmail}
										onChange={(event) =>
											updateField("contactEmail", event.target.value)
										}
										className="bg-surface"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="edit-client-phone">Phone</Label>
									<Input
										id="edit-client-phone"
										value={form.contactPhone}
										onChange={(event) =>
											updateField("contactPhone", event.target.value)
										}
										className="bg-surface"
									/>
								</div>
							</div>
						</>
					) : (
						<p className="rounded-xl bg-surface p-4 text-sm text-muted-foreground">
							No primary contact to edit. Assign a primary contact from the
							admin panel.
						</p>
					)}

					{/* Locations (read-only) */}
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
						<Button variant="ghost" onClick={onClose} disabled={saving}>
							Cancel
						</Button>
						<Button type="button" onClick={handleSave} disabled={saving}>
							{saving && <Loader2 className="mr-2 size-4 animate-spin" />}
							Save Changes
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
