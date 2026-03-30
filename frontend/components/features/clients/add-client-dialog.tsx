"use client";

import { Building2, Loader2, MapPin, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
	buildClientCreateHandoffUrl,
	runAddClientFlow,
} from "@/lib/add-client-flow";
import { type AddClientFormData, addClientSchema } from "@/lib/forms/schemas";
import type { Sector } from "@/lib/sectors-config";
import { getSubsectors, sectorsConfig } from "@/lib/sectors-config";
import { useCompanyStore } from "@/lib/stores/company-store";

const DEFAULT_FORM: AddClientFormData = {
	name: "",
	sector: "",
	subsector: "",
	customerType: "generator",
	accountStatus: "active",
	companyNotes: "",
	contactName: "",
	contactTitle: "",
	contactEmail: "",
	contactPhone: "",
	locationName: "",
	locationAddress: "",
	locationCity: "",
	locationState: "",
	locationZipCode: "",
};

type Props = {
	onSubmitted?: () => void;
};

const isSector = (value: string): value is Sector => {
	return sectorsConfig.some((sector) => sector.id === value);
};

export function AddClientDialog({ onSubmitted }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<AddClientFormData>(DEFAULT_FORM);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const { createCompany, createCompanyContact, createLocation } =
		useCompanyStore();
	const availableSubsectors = isSector(form.sector)
		? getSubsectors(form.sector)
		: [];

	function updateField<K extends keyof AddClientFormData>(
		field: K,
		value: AddClientFormData[K],
	) {
		setForm((current) => ({ ...current, [field]: value }));
		setErrors((current) => {
			if (!current[field]) return current;
			const next = { ...current };
			delete next[field];
			return next;
		});
	}

	function reset() {
		setForm(DEFAULT_FORM);
		setErrors({});
		setSubmitError(null);
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const parsed = addClientSchema.safeParse(form);
		if (!parsed.success) {
			const nextErrors = parsed.error.errors.reduce<Record<string, string>>(
				(acc, error) => {
					const path = error.path[0];
					if (typeof path === "string" && !acc[path]) {
						acc[path] = error.message;
					}
					return acc;
				},
				{},
			);
			setErrors(nextErrors);
			return;
		}

		setSubmitting(true);
		setSubmitError(null);

		try {
			const result = await runAddClientFlow(parsed.data, {
				createCompany,
				createCompanyContact,
				createLocation,
			});

			setOpen(false);
			reset();
			onSubmitted?.();
			router.push(
				buildClientCreateHandoffUrl(result.companyId, result.createState),
			);
		} catch {
			setSubmitError("We couldn't create this client. No data was saved.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) {
					reset();
				}
			}}
		>
			<DialogTrigger asChild>
				<Button>
					<Building2 data-icon="inline-start" aria-hidden="true" />
					Add New Client
				</Button>
			</DialogTrigger>

			<DialogContent className="w-[min(94vw,960px)] max-w-none rounded-xl border-0 bg-white/85 p-0 backdrop-blur-xl max-h-[92vh] overflow-y-auto">
				<form onSubmit={onSubmit}>
					<DialogHeader className="flex flex-col gap-2 bg-surface-container-low px-6 py-5 text-left">
						<div className="flex items-center gap-2">
							<Building2 aria-hidden className="text-primary" />
							<Badge variant="secondary" className="rounded-full">
								Client onboarding
							</Badge>
						</div>
						<DialogTitle className="font-display text-2xl font-semibold tracking-tight">
							Add New Client
						</DialogTitle>
						<DialogDescription>
							Create company, primary contact, and first logistics location.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-6 bg-surface-container-lowest px-6 py-5">
						<section className="space-y-4">
							<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
								Company
							</p>
							<div className="grid gap-4">
								<FormField
									id="add-client-name"
									label="Client name"
									required
									error={errors.name}
								>
									<Input
										id="add-client-name"
										value={form.name}
										onChange={(event) =>
											updateField("name", event.target.value)
										}
										className="bg-surface"
									/>
								</FormField>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									id="add-client-sector"
									label="Industry"
									required
									error={errors.sector}
								>
									<Select
										value={form.sector}
										onValueChange={(value) => {
											updateField("sector", value);
											updateField("subsector", "");
										}}
									>
										<SelectTrigger
											id="add-client-sector"
											className="bg-surface"
										>
											<SelectValue placeholder="Select industry" />
										</SelectTrigger>
										<SelectContent>
											{sectorsConfig.map((sector) => (
												<SelectItem key={sector.id} value={sector.id}>
													{sector.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormField>
								<FormField
									id="add-client-subsector"
									label="Sub-Industry"
									required
									error={errors.subsector}
								>
									<Select
										value={form.subsector}
										onValueChange={(value) => updateField("subsector", value)}
										disabled={!form.sector}
									>
										<SelectTrigger
											id="add-client-subsector"
											className="bg-surface"
										>
											<SelectValue
												placeholder={
													form.sector
														? "Select sub-industry"
														: "Select industry first"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{availableSubsectors.map((subsector) => (
												<SelectItem key={subsector.id} value={subsector.id}>
													{subsector.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormField>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									id="add-client-customer-type"
									label="Customer type"
									required
									error={errors.customerType}
								>
									<Select
										value={form.customerType}
										onValueChange={(value) =>
											updateField(
												"customerType",
												value as AddClientFormData["customerType"],
											)
										}
									>
										<SelectTrigger
											id="add-client-customer-type"
											className="bg-surface"
										>
											<SelectValue placeholder="Select customer type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="buyer">Buyer</SelectItem>
											<SelectItem value="generator">Generator</SelectItem>
											<SelectItem value="both">Both</SelectItem>
										</SelectContent>
									</Select>
								</FormField>

								<FormField
									id="add-client-account-status"
									label="Status"
									required
									error={errors.accountStatus}
								>
									<Select
										value={form.accountStatus}
										onValueChange={(value) =>
											updateField(
												"accountStatus",
												value as AddClientFormData["accountStatus"],
											)
										}
									>
										<SelectTrigger
											id="add-client-account-status"
											className="bg-surface"
										>
											<SelectValue placeholder="Select account status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="prospect">Prospect</SelectItem>
										</SelectContent>
									</Select>
								</FormField>
							</div>

							<FormField
								id="add-client-notes"
								label="Notes"
								error={errors.companyNotes}
							>
								<Textarea
									id="add-client-notes"
									value={form.companyNotes ?? ""}
									onChange={(event) =>
										updateField("companyNotes", event.target.value)
									}
									rows={3}
									className="bg-surface"
								/>
							</FormField>
						</section>

						<section className="space-y-4 rounded-xl bg-surface p-4">
							<div className="flex items-center gap-2">
								<Phone aria-hidden className="size-4 text-primary" />
								<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Primary contact
								</p>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									id="add-contact-name"
									label="Name"
									error={errors.contactName}
								>
									<Input
										id="add-contact-name"
										value={form.contactName}
										onChange={(event) =>
											updateField("contactName", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
								<FormField
									id="add-contact-title"
									label="Title"
									error={errors.contactTitle}
								>
									<Input
										id="add-contact-title"
										value={form.contactTitle}
										onChange={(event) =>
											updateField("contactTitle", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									id="add-contact-email"
									label="Email"
									required
									error={errors.contactEmail}
								>
									<Input
										id="add-contact-email"
										type="email"
										value={form.contactEmail}
										onChange={(event) =>
											updateField("contactEmail", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
								<FormField
									id="add-contact-phone"
									label="Phone"
									required
									error={errors.contactPhone}
								>
									<Input
										id="add-contact-phone"
										value={form.contactPhone}
										onChange={(event) =>
											updateField("contactPhone", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
							</div>
						</section>

						<section className="space-y-4 rounded-xl bg-surface p-4">
							<div className="flex items-center gap-2">
								<MapPin aria-hidden className="size-4 text-primary" />
								<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
									Shipping location & logistics hub
								</p>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									id="add-location-name"
									label="Location name"
									required
									error={errors.locationName}
								>
									<Input
										id="add-location-name"
										value={form.locationName}
										onChange={(event) =>
											updateField("locationName", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
								<FormField
									id="add-location-address"
									label="Address"
									error={errors.locationAddress}
								>
									<Input
										id="add-location-address"
										value={form.locationAddress}
										onChange={(event) =>
											updateField("locationAddress", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
							</div>
							<div className="grid gap-4 md:grid-cols-3">
								<FormField
									id="add-location-city"
									label="City"
									required
									error={errors.locationCity}
								>
									<Input
										id="add-location-city"
										value={form.locationCity}
										onChange={(event) =>
											updateField("locationCity", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
								<FormField
									id="add-location-state"
									label="State"
									required
									error={errors.locationState}
								>
									<Input
										id="add-location-state"
										value={form.locationState}
										onChange={(event) =>
											updateField("locationState", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
								<FormField
									id="add-location-zip"
									label="ZIP"
									required
									error={errors.locationZipCode}
								>
									<Input
										id="add-location-zip"
										value={form.locationZipCode}
										onChange={(event) =>
											updateField("locationZipCode", event.target.value)
										}
										className="bg-surface-container-low"
									/>
								</FormField>
							</div>
						</section>

						{submitError && (
							<p className="text-sm text-destructive">{submitError}</p>
						)}
					</div>

					<DialogFooter className="bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-end">
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setOpen(false)}
								disabled={submitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
								Create Client
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function FormField({
	id,
	label,
	error,
	required,
	children,
}: {
	id: string;
	label: string;
	error: string | undefined;
	required?: boolean;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={id}>
				{label}
				{required ? <span className="text-destructive"> *</span> : null}
			</Label>
			{children}
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}
