"use client";

import {
	Building2,
	Check,
	ChevronsUpDown,
	Factory,
	Loader2,
	Mail,
	MapPin,
	Phone,
	RotateCcw,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
	type ChangeEvent,
	type ComponentProps,
	type FormEvent,
	type ReactNode,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { submitAddClientAndBuildHandoff } from "@/lib/add-client-submit";
import { type AddClientFormData, addClientSchema } from "@/lib/forms/schemas";
import type { Sector } from "@/lib/sectors-config";
import {
	getSectorsByGroup,
	getSubsectors,
	SECTOR_GROUPS,
	sectorsConfig,
} from "@/lib/sectors-config";
import { useCompanyStore } from "@/lib/stores/company-store";
import { cn } from "@/lib/utils";

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

	function handleCompanyNotesChange(event: ChangeEvent<HTMLTextAreaElement>) {
		updateField("companyNotes", event.target.value);
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
			const result = await submitAddClientAndBuildHandoff(parsed.data, {
				createCompany,
				createCompanyContact,
				createLocation,
			});

			setOpen(false);
			reset();
			onSubmitted?.();
			router.push(result.handoffUrl);
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

			<DialogContent
				className="w-[min(94vw,780px)] max-w-none gap-0 overflow-hidden rounded-2xl border-0 bg-white/90 p-0 shadow-lg backdrop-blur-2xl"
				showCloseButton={true}
			>
				<form onSubmit={onSubmit}>
					{/* ── Header ── */}
					<DialogHeader className="flex flex-col gap-1.5 border-b border-border/15 px-7 pb-5 pt-6 text-left">
						<DialogTitle className="font-display text-[1.65rem] font-semibold tracking-tight text-foreground">
							Add New Client
						</DialogTitle>
						<DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
							Register a new industrial partner to the Kinetic Stream system
						</DialogDescription>
					</DialogHeader>

					{/* ── Scrollable form body ── */}
					<div className="max-h-[min(64vh,560px)] overflow-y-auto bg-surface-container-lowest/60">
						<div className="flex flex-col gap-6 px-7 py-6">
							{/* ── COMPANY ── */}
							<section className="space-y-5">
								<SectionHeading
									icon={<Building2 aria-hidden className="size-3.5" />}
								>
									Company
								</SectionHeading>

								{/* Row 1: Company Name + Industry */}
								<div className="grid gap-x-5 gap-y-4 md:grid-cols-[1.2fr_1fr]">
									<FormField
										id="add-client-name"
										label="Company name"
										required
										error={errors.name}
									>
										<InputWithIcon
											id="add-client-name"
											icon={<Building2 className="size-4" />}
											placeholder="e.g. Apex Industrial Ltd"
											value={form.name}
											onChange={(event) =>
												updateField("name", event.target.value)
											}
										/>
									</FormField>
									<FormField
										id="add-client-sector"
										label="Industry type"
										required
										error={errors.sector}
									>
										<IndustryPicker
											value={form.sector}
											onValueChange={(value) => {
												updateField("sector", value);
												updateField("subsector", "");
											}}
										/>
									</FormField>
								</div>

								{/* Row 2: Client Type + Account Status */}
								<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
									<FormField
										id="add-client-customer-type"
										label="Client type"
										required
										error={errors.customerType}
									>
										<SelectWithIcon
											icon={<Building2 className="size-4" />}
											value={form.customerType}
											onValueChange={(value) =>
												updateField(
													"customerType",
													value as AddClientFormData["customerType"],
												)
											}
											triggerId="add-client-customer-type"
											placeholder="Select type"
										>
											<SelectItem value="buyer">Buyer</SelectItem>
											<SelectItem value="generator">Generator</SelectItem>
											<SelectItem value="both">Both</SelectItem>
										</SelectWithIcon>
									</FormField>
									<FormField
										id="add-client-account-status"
										label="Account status"
										error={errors.accountStatus}
									>
										<div className="flex h-10 gap-0 rounded-lg border border-border/40 bg-surface-container-high/40 p-[3px]">
											{(
												[
													{ value: "active", label: "Active" },
													{ value: "prospect", label: "Prospect" },
												] as const
											).map((option) => (
												<button
													key={option.value}
													type="button"
													className={cn(
														"flex-1 rounded-md px-5 py-1 text-sm font-semibold tracking-wide transition-all duration-200",
														form.accountStatus === option.value
															? "bg-primary text-primary-foreground shadow-sm"
															: "text-muted-foreground hover:text-foreground",
													)}
													onClick={() =>
														updateField("accountStatus", option.value)
													}
												>
													{option.label}
												</button>
											))}
										</div>
									</FormField>
								</div>

								{/* Row 3: Sub-Industry + Notes */}
								<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
									<FormField
										id="add-client-subsector"
										label="Sub-Industry"
										required
										error={errors.subsector}
									>
										<SubIndustryPicker
											value={form.subsector}
											onValueChange={(value) => updateField("subsector", value)}
											options={availableSubsectors}
											disabled={!form.sector}
										/>
									</FormField>
									<FormField
										id="add-client-notes"
										label="Notes"
										error={errors.companyNotes}
									>
										<Textarea
											id="add-client-notes"
											value={form.companyNotes ?? ""}
											onChange={handleCompanyNotesChange}
											rows={2}
											placeholder="Internal notes about this client…"
											className="resize-none bg-surface-container-low/60 text-sm"
										/>
									</FormField>
								</div>
							</section>

							<Separator className="bg-border/20" />

							{/* ── PRIMARY CONTACT ── */}
							<section className="space-y-5">
								<SectionHeading
									icon={<Phone aria-hidden className="size-3.5" />}
								>
									Primary contact
								</SectionHeading>

								<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
									<FormField
										id="add-contact-name"
										label="Full legal name"
										error={errors.contactName}
									>
										<InputWithIcon
											id="add-contact-name"
											icon={<User className="size-4" />}
											placeholder="Full legal name"
											value={form.contactName}
											onChange={(event) =>
												updateField("contactName", event.target.value)
											}
										/>
									</FormField>
									<FormField
										id="add-contact-email"
										label="Email address"
										required
										error={errors.contactEmail}
									>
										<InputWithIcon
											id="add-contact-email"
											type="email"
											icon={<Mail className="size-4" />}
											placeholder="contact@company.com"
											value={form.contactEmail}
											onChange={(event) =>
												updateField("contactEmail", event.target.value)
											}
										/>
									</FormField>
								</div>

								<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
									<FormField
										id="add-contact-phone"
										label="Phone number"
										required
										error={errors.contactPhone}
									>
										<InputWithIcon
											id="add-contact-phone"
											icon={<Phone className="size-4" />}
											placeholder="+1 (555) 000-0000"
											value={form.contactPhone}
											onChange={(event) =>
												updateField("contactPhone", event.target.value)
											}
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
											placeholder="e.g. Operations Manager"
											onChange={(event) =>
												updateField("contactTitle", event.target.value)
											}
											className="h-10 bg-surface-container-low/60"
										/>
									</FormField>
								</div>
							</section>

							<Separator className="bg-border/20" />

							{/* ── SHIPPING LOCATION ── */}
							<section className="space-y-5">
								<SectionHeading
									icon={<MapPin aria-hidden className="size-3.5" />}
								>
									Shipping location & logistics hub
								</SectionHeading>

								<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
									<FormField
										id="add-location-name"
										label="Location name"
										required
										error={errors.locationName}
									>
										<Input
											id="add-location-name"
											value={form.locationName}
											placeholder="e.g. Main Warehouse"
											onChange={(event) =>
												updateField("locationName", event.target.value)
											}
											className="h-10 bg-surface-container-low/60"
										/>
									</FormField>
									<FormField
										id="add-location-address"
										label="Street address"
										error={errors.locationAddress}
									>
										<Input
											id="add-location-address"
											value={form.locationAddress}
											placeholder="Street address"
											onChange={(event) =>
												updateField("locationAddress", event.target.value)
											}
											className="h-10 bg-surface-container-low/60"
										/>
									</FormField>
								</div>

								<div className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
									<FormField
										id="add-location-city"
										label="City"
										required
										error={errors.locationCity}
									>
										<Input
											id="add-location-city"
											value={form.locationCity}
											placeholder="City"
											onChange={(event) =>
												updateField("locationCity", event.target.value)
											}
											className="h-10 bg-surface-container-low/60"
										/>
									</FormField>
									<FormField
										id="add-location-state"
										label="State / Province"
										required
										error={errors.locationState}
									>
										<Input
											id="add-location-state"
											value={form.locationState}
											placeholder="State"
											onChange={(event) =>
												updateField("locationState", event.target.value)
											}
											className="h-10 bg-surface-container-low/60"
										/>
									</FormField>
									<FormField
										id="add-location-zip"
										label="ZIP / Postal code"
										required
										error={errors.locationZipCode}
									>
										<Input
											id="add-location-zip"
											value={form.locationZipCode}
											placeholder="ZIP"
											onChange={(event) =>
												updateField("locationZipCode", event.target.value)
											}
											className="h-10 bg-surface-container-low/60"
										/>
									</FormField>
								</div>
							</section>

							{submitError && (
								<div className="rounded-lg border border-destructive/20 bg-error-container/30 px-4 py-3">
									<p className="text-sm text-on-error-container">
										{submitError}
									</p>
								</div>
							)}
						</div>
					</div>

					{/* ── Footer ── */}
					<div className="flex items-center justify-between border-t border-border/15 bg-surface-container-low/60 px-7 py-4">
						<button
							type="button"
							onClick={reset}
							disabled={submitting}
							className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
						>
							<RotateCcw className="size-3" />
							Reset form
						</button>

						<div className="flex items-center gap-3">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setOpen(false)}
								disabled={submitting}
								className="text-sm font-medium"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={submitting}
								className="btn-primary-gradient min-w-[140px] gap-2 px-6 font-semibold uppercase tracking-wider"
							>
								{submitting && <Loader2 className="size-4 animate-spin" />}
								Create Client
							</Button>
						</div>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/* ── Industry picker — searchable combobox grouped by SECTOR_GROUPS ── */
function IndustryPicker({
	value,
	onValueChange,
}: {
	value: string;
	onValueChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const selectedLabel = sectorsConfig.find((s) => s.id === value)?.label;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-surface-container-low/60 px-3 text-sm transition-colors",
						"hover:bg-surface-container-low/80",
						"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
						!value && "text-muted-foreground",
					)}
				>
					<Factory className="size-4 shrink-0 text-muted-foreground/50" />
					<span className="flex-1 truncate text-left">
						{selectedLabel ?? "Select industry"}
					</span>
					<ChevronsUpDown className="size-4 shrink-0 opacity-40" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="p-0"
				align="start"
				style={{ width: "var(--radix-popover-trigger-width)" }}
			>
				<Command>
					<CommandInput placeholder="Search industry…" />
					<CommandList>
						<CommandEmpty>No industry found.</CommandEmpty>
						{(
							Object.keys(SECTOR_GROUPS) as Array<keyof typeof SECTOR_GROUPS>
						).map((groupKey) => {
							const group = SECTOR_GROUPS[groupKey];
							const sectors = getSectorsByGroup(groupKey);
							return (
								<CommandGroup key={groupKey} heading={group.label}>
									{sectors.map((sector) => (
										<CommandItem
											key={sector.id}
											value={sector.label}
											onSelect={() => {
												onValueChange(sector.id);
												setOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 size-4",
													value === sector.id ? "opacity-100" : "opacity-0",
												)}
											/>
											{sector.label}
										</CommandItem>
									))}
								</CommandGroup>
							);
						})}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

/* ── Sub-industry picker — searchable combobox filtered by selected sector ── */
function SubIndustryPicker({
	value,
	onValueChange,
	options,
	disabled,
}: {
	value: string;
	onValueChange: (value: string) => void;
	options: { id: string; label: string }[];
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);
	const selectedLabel = options.find((s) => s.id === value)?.label;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"flex h-10 w-full items-center gap-2 rounded-md border border-input bg-surface-container-low/60 px-3 text-sm transition-colors",
						"hover:bg-surface-container-low/80",
						"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
						"disabled:cursor-not-allowed disabled:opacity-50",
						!value && "text-muted-foreground",
					)}
				>
					<span className="flex-1 truncate text-left">
						{selectedLabel ??
							(disabled ? "Select industry first" : "Select sub-industry")}
					</span>
					<ChevronsUpDown className="size-4 shrink-0 opacity-40" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="p-0"
				align="start"
				style={{ width: "var(--radix-popover-trigger-width)" }}
			>
				<Command>
					<CommandInput placeholder="Search sub-industry…" />
					<CommandList>
						<CommandEmpty>No sub-industry found.</CommandEmpty>
						<CommandGroup>
							{options.map((subsector) => (
								<CommandItem
									key={subsector.id}
									value={subsector.label}
									onSelect={() => {
										onValueChange(subsector.id);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 size-4",
											value === subsector.id ? "opacity-100" : "opacity-0",
										)}
									/>
									{subsector.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

/* ── Section heading ── */
function SectionHeading({
	icon,
	children,
}: {
	icon: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-2">
			<div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
				{icon}
			</div>
			<p className="text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">
				{children}
			</p>
		</div>
	);
}

/* ── Form field with label ── */
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
		<div className="flex flex-col gap-1.5">
			<Label
				htmlFor={id}
				className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
			>
				{label}
				{required ? <span className="text-destructive"> *</span> : null}
			</Label>
			{children}
			{error ? <p className="text-xs text-destructive">{error}</p> : null}
		</div>
	);
}

/* ── Input with leading icon ── */
function InputWithIcon({
	icon,
	className,
	...props
}: ComponentProps<typeof Input> & {
	icon: ReactNode;
}) {
	return (
		<div className="relative">
			<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/50">
				{icon}
			</div>
			<Input
				className={cn("h-10 bg-surface-container-low/60 pl-10", className)}
				{...props}
			/>
		</div>
	);
}

/* ── Select with leading icon ── */
function SelectWithIcon({
	icon,
	value,
	onValueChange,
	triggerId,
	placeholder,
	children,
	disabled,
}: {
	icon: ReactNode;
	value: string;
	onValueChange: (value: string) => void;
	triggerId: string;
	placeholder: string;
	children: ReactNode;
	disabled?: boolean;
}) {
	return (
		<Select
			value={value}
			onValueChange={onValueChange}
			disabled={disabled ?? false}
		>
			<SelectTrigger
				id={triggerId}
				className="h-10 bg-surface-container-low/60"
			>
				<div className="flex items-center gap-2.5">
					<span className="text-muted-foreground/50">{icon}</span>
					<SelectValue placeholder={placeholder} />
				</div>
			</SelectTrigger>
			<SelectContent>{children}</SelectContent>
		</Select>
	);
}
