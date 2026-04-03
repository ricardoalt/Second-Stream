"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { type ComponentProps, type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import {
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
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
	Textarea,
} from "@/components/ui";
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
	/** Callback fired after successful submission. Use this for wizard/context flows without redirect */
	onSuccessWithClient?: (clientId: string) => void;
	/** Callback fired after successful submission (legacy, for pages that redirect) */
	onSubmitted?: () => void;
	/** Hide the default trigger - useful when controlling from parent */
	hideTrigger?: boolean;
	/** Custom trigger element */
	trigger?: ReactNode;
};

const isSector = (value: string): value is Sector => {
	return sectorsConfig.some((sector) => sector.id === value);
};

export function AddClientDialog({
	onSuccessWithClient,
	onSubmitted,
	hideTrigger,
	trigger,
}: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const { createCompany, createCompanyContact, createLocation } =
		useCompanyStore();

	const form = useForm<AddClientFormData>({
		resolver: zodResolver(addClientSchema),
		defaultValues: DEFAULT_FORM,
	});

	const selectedSector = form.watch("sector");
	const availableSubsectors = isSector(selectedSector)
		? getSubsectors(selectedSector)
		: [];

	function reset() {
		form.reset(DEFAULT_FORM);
		setSubmitError(null);
	}

	async function onSubmit(data: AddClientFormData) {
		setSubmitError(null);

		try {
			const result = await submitAddClientAndBuildHandoff(data, {
				createCompany,
				createCompanyContact,
				createLocation,
			});

			setOpen(false);
			reset();

			if (onSuccessWithClient) {
				onSuccessWithClient(result.companyId);
				return;
			}

			onSubmitted?.();
			router.push(result.handoffUrl);
		} catch {
			setSubmitError("We couldn't create this client. No data was saved.");
		}
	}

	const submitting = form.formState.isSubmitting;

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
			{!hideTrigger && (
				<DialogTrigger asChild>
					{trigger ?? (
						<Button>
							<Building2 data-icon="inline-start" aria-hidden="true" />
							Add New Client
						</Button>
					)}
				</DialogTrigger>
			)}

			<DialogContent
				className="w-[min(94vw,780px)] max-w-none gap-0 overflow-hidden rounded-2xl border border-border/40 bg-surface-container-lowest p-0 shadow-lg"
				showCloseButton={true}
			>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<DialogHeader className="flex flex-col gap-1.5 border-b border-border/15 px-7 pb-5 pt-6 text-left">
							<DialogTitle className="font-display text-[1.65rem] font-semibold tracking-tight text-foreground">
								Add New Client
							</DialogTitle>
							<DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
								Register a new industrial partner to the Kinetic Stream system
							</DialogDescription>
						</DialogHeader>

						<div className="max-h-[min(64vh,560px)] overflow-y-auto bg-surface-container-lowest/60">
							<div className="flex flex-col gap-6 px-7 py-6">
								<section className="space-y-5">
									<SectionHeading icon={<Building2 aria-hidden className="size-3.5" />}>
										Company
									</SectionHeading>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-[1.2fr_1fr]">
										<FormField
											control={form.control}
											name="name"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Company name <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<InputWithIcon
															icon={<Building2 className="size-4" />}
															placeholder="e.g. Apex Industrial Ltd"
															{...field}
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="sector"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Industry type <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<IndustryPicker
															value={field.value}
															onValueChange={(value) => {
																field.onChange(value);
																form.setValue("subsector", "", {
																	shouldDirty: true,
																	shouldValidate: true,
																});
															}}
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<FormField
											control={form.control}
											name="customerType"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Client type <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<SelectWithIcon
															icon={<Building2 className="size-4" />}
															value={field.value}
															onValueChange={(value) =>
																field.onChange(value as AddClientFormData["customerType"])
															}
															placeholder="Select type"
														>
															<SelectItem value="buyer">Buyer</SelectItem>
															<SelectItem value="generator">Generator</SelectItem>
															<SelectItem value="both">Both</SelectItem>
														</SelectWithIcon>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="accountStatus"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Account status
													</FormLabel>
													<FormControl>
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
																		field.value === option.value
																			? "bg-primary text-primary-foreground shadow-sm"
																			: "text-muted-foreground hover:text-foreground",
																	)}
																	onClick={() => field.onChange(option.value)}
																>
																	{option.label}
																</button>
															))}
														</div>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<FormField
											control={form.control}
											name="subsector"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Sub-industry <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<SubIndustryPicker
															value={field.value}
															onValueChange={field.onChange}
															options={availableSubsectors}
															disabled={!selectedSector}
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="companyNotes"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Notes
													</FormLabel>
													<FormControl>
														<Textarea
															{...field}
															rows={2}
															placeholder="Internal notes about this client…"
															className="resize-none bg-surface-container-low/60 text-sm"
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>
									</div>
								</section>

								<Separator className="bg-border/20" />

								<section className="space-y-5">
									<SectionHeading icon={<Phone aria-hidden className="size-3.5" />}>
										Primary contact
									</SectionHeading>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<FormField
											control={form.control}
											name="contactName"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Full legal name
													</FormLabel>
													<FormControl>
														<InputWithIcon
															icon={<User className="size-4" />}
															placeholder="Full legal name"
															{...field}
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="contactEmail"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Email address <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<InputWithIcon
															type="email"
															icon={<Mail className="size-4" />}
															placeholder="contact@company.com"
															{...field}
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<FormField
											control={form.control}
											name="contactPhone"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Phone number <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<InputWithIcon
															icon={<Phone className="size-4" />}
															placeholder="+1 (555) 000-0000"
															{...field}
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="contactTitle"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Title
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															placeholder="e.g. Operations Manager"
															className="h-10 bg-surface-container-low/60"
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>
									</div>
								</section>

								<Separator className="bg-border/20" />

								<section className="space-y-5">
									<SectionHeading icon={<MapPin aria-hidden className="size-3.5" />}>
										Shipping location & logistics hub
									</SectionHeading>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<FormField
											control={form.control}
											name="locationName"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Location name <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															placeholder="e.g. Main Warehouse"
															className="h-10 bg-surface-container-low/60"
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="locationAddress"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														Street address
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															placeholder="Street address"
															className="h-10 bg-surface-container-low/60"
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>
									</div>

									<div className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
										<FormField
											control={form.control}
											name="locationCity"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														City <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															placeholder="City"
															className="h-10 bg-surface-container-low/60"
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="locationState"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														State / Province <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															placeholder="State"
															className="h-10 bg-surface-container-low/60"
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="locationZipCode"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
														ZIP / Postal code <span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															placeholder="ZIP"
															className="h-10 bg-surface-container-low/60"
														/>
													</FormControl>
													<FormMessage className="text-xs" />
												</FormItem>
											)}
										/>
									</div>
								</section>

								{submitError && (
									<div className="rounded-lg border border-destructive/20 bg-error-container/30 px-4 py-3">
										<p className="text-sm text-on-error-container">{submitError}</p>
									</div>
								)}
							</div>
						</div>

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
									className="btn-primary-solid min-w-[140px] gap-2 px-6 font-semibold uppercase tracking-wider"
								>
									{submitting && <Loader2 className="size-4 animate-spin" />}
									Create Client
								</Button>
							</div>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function IndustryPicker({
	value,
	onValueChange,
	...triggerProps
}: {
	value: string;
	onValueChange: (value: string) => void;
} & Pick<
	ComponentProps<"button">,
	"id" | "aria-invalid" | "aria-describedby"
>) {
	const [open, setOpen] = useState(false);
	const selectedLabel = sectorsConfig.find((sector) => sector.id === value)?.label;

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
	...triggerProps
}: {
	value: string;
	onValueChange: (value: string) => void;
	options: { id: string; label: string }[];
	disabled: boolean;
} & Pick<
	ComponentProps<"button">,
	"id" | "aria-invalid" | "aria-describedby"
>) {
	const [open, setOpen] = useState(false);
	const selectedLabel = options.find((subsector) => subsector.id === value)?.label;

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

function SelectWithIcon({
	icon,
	value,
	onValueChange,
	placeholder,
	children,
	disabled,
	...triggerProps
}: {
	icon: ReactNode;
	value: string;
	onValueChange: (value: string) => void;
	placeholder: string;
	children: ReactNode;
	disabled?: boolean;
} & Pick<
	ComponentProps<typeof SelectTrigger>,
	"id" | "aria-invalid" | "aria-describedby"
>) {
	return (
		<Select
			value={value}
			onValueChange={onValueChange}
			disabled={disabled ?? false}
		>
			<SelectTrigger className="h-10 bg-surface-container-low/60" {...triggerProps}>
				<div className="flex items-center gap-2.5">
					<span className="text-muted-foreground/50">{icon}</span>
					<SelectValue placeholder={placeholder} />
				</div>
			</SelectTrigger>
			<SelectContent>{children}</SelectContent>
		</Select>
	);
}
