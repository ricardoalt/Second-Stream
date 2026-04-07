"use client";

import { useForm } from "@tanstack/react-form";
import {
	Building2,
	Check,
	ChevronsUpDown,
	Factory,
	Mail,
	MapPin,
	Phone,
	User,
} from "lucide-react";
import {
	type ComponentProps,
	type ReactNode,
	useEffect,
	useState,
} from "react";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
import {
	Badge,
	Button,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Textarea,
} from "@/components/ui";
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
import type { ClientProfile } from "@/lib/mappers/company-client";
import {
	getSectorsByGroup,
	getSubsectors,
	SECTOR_GROUPS,
	type Sector,
	sectorsConfig,
} from "@/lib/sectors-config";
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
	const selectedSector = form.state.values.sector;
	const availableSubsectors = isSector(selectedSector)
		? getSubsectors(selectedSector)
		: [];
	const locationsMeta = getLocationsSectionMeta(profile.locations.length);

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent
				className={cn(
					"w-[min(94vw,780px)] max-w-none",
					"flex max-h-[min(92vh,860px)] flex-col overflow-hidden rounded-2xl border border-border/40 bg-surface-container-lowest p-0 shadow-lg",
				)}
			>
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
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<div className="min-h-0 flex-1 overflow-y-auto bg-surface-container-lowest px-6 py-5">
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
												<FieldLabel required>Company name</FieldLabel>
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
									{(field) => (
										<div className="grid gap-1.5">
											<FieldLabel required>Industry type</FieldLabel>
											<IndustryPicker
												id={field.name}
												value={field.state.value}
												onValueChange={(value) => {
													field.handleChange(value);
													form.setFieldValue("subsector", "");
												}}
											/>
										</div>
									)}
								</form.Field>
							</div>

							<div className="grid gap-4">
								<form.Field name="subsector">
									{(field) => (
										<div className="grid min-w-0 gap-1.5">
											<FieldLabel>Sub-industry</FieldLabel>
											<SubIndustryPicker
												id={field.name}
												value={field.state.value}
												onValueChange={(value) => field.handleChange(value)}
												options={availableSubsectors}
												disabled={!selectedSector}
											/>
										</div>
									)}
								</form.Field>

								<form.Field name="accountStatus">
									{(field) => (
										<div className="grid min-w-0 gap-1.5">
											<FieldLabel>Account status</FieldLabel>
											<div className="flex h-10 max-w-[320px] gap-0 rounded-lg border border-border/40 bg-surface-container-high/40 p-[3px]">
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
															field.state.value === option.value
																? "bg-primary text-primary-foreground shadow-sm"
																: "text-muted-foreground hover:text-foreground",
														)}
														onClick={() => field.handleChange(option.value)}
													>
														{option.label}
													</button>
												))}
											</div>
										</div>
									)}
								</form.Field>
							</div>

							<form.Field name="companyNotes">
								{(field) => (
									<div className="grid gap-1.5">
										<FieldLabel>Notes</FieldLabel>
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

							<p className="mt-2 text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
								Primary contact
							</p>

							<div className="flex flex-col gap-5">
								<div className="flex flex-col gap-4">
									<div className="grid gap-4 xl:grid-cols-2">
										<form.Field name="contactName">
											{(field) => (
												<div className="grid gap-1.5">
													<FieldLabel>Full legal name</FieldLabel>
													<InputWithIcon
														id={field.name}
														icon={<User className="size-4" />}
														placeholder="Full legal name"
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
													<FieldLabel>Title</FieldLabel>
													<Input
														id={field.name}
														className="bg-surface-container-low/60"
														placeholder="e.g. Operations Manager"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
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
														<FieldLabel>Email address</FieldLabel>
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
														<FieldLabel>Phone number</FieldLabel>
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
											No primary contact exists yet. Filling contact fields will
											create one as the primary contact.
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
									<div
										className={cn(
											"flex flex-col gap-2",
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
															{location.address ? `${location.address} · ` : ""}
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
					</div>

					<DialogFooter className="border-t border-border/15 bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-end">
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

function IndustryPicker({
	value,
	onValueChange,
	id,
	...triggerProps
}: {
	value: string;
	onValueChange: (value: string) => void;
	id?: string;
} & Pick<ComponentProps<"button">, "aria-invalid" | "aria-describedby">) {
	const [open, setOpen] = useState(false);
	const selectedLabel = sectorsConfig.find(
		(sector) => sector.id === value,
	)?.label;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-surface px-3 text-sm transition-colors",
						"hover:bg-surface-container-low/80",
						"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
						!value && "text-muted-foreground",
					)}
					{...triggerProps}
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

function SubIndustryPicker({
	value,
	onValueChange,
	options,
	disabled,
	id,
	...triggerProps
}: {
	value: string;
	onValueChange: (value: string) => void;
	options: { id: string; label: string }[];
	disabled: boolean;
	id?: string;
} & Pick<ComponentProps<"button">, "aria-invalid" | "aria-describedby">) {
	const [open, setOpen] = useState(false);
	const selectedLabel = options.find(
		(subsector) => subsector.id === value,
	)?.label;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"flex h-10 w-full items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm transition-colors",
						"hover:bg-surface-container-low/80",
						"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
						"disabled:cursor-not-allowed disabled:opacity-50",
						!value && "text-muted-foreground",
					)}
					{...triggerProps}
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

function FieldLabel({
	required,
	children,
}: {
	required?: boolean;
	children: ReactNode;
}) {
	return (
		<p className="text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap text-muted-foreground">
			{children} {required && <span className="text-destructive">*</span>}
		</p>
	);
}

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
