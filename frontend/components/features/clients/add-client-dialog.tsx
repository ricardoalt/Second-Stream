"use client";

import { useForm } from "@tanstack/react-form";
import {
	Building2,
	Loader2,
	Mail,
	MapPin,
	Phone,
	RotateCcw,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ComponentProps, type ReactNode, useState } from "react";
import {
	AccountStatusToggle,
	ClientFieldLabel as FieldLabel,
	ClientInputWithIcon as InputWithIcon,
} from "@/components/features/clients/client-form-primitives";
import { ConfirmModal } from "@/components/patterns/dialogs/modal";
import {
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
	Button,
	Dialog,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
	Textarea,
} from "@/components/ui";
import { submitAddClientAndBuildHandoff } from "@/lib/add-client-submit";
import { addClientSchema } from "@/lib/forms/schemas";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import { type Sector, sectorsConfig } from "@/lib/sectors-config";
import { useCompanyStore } from "@/lib/stores/company-store";

const DEFAULT_FORM = {
	name: "",
	sector: "",
	subsector: "",
	customerType: "generator" as "buyer" | "generator" | "both",
	accountStatus: "active" as "active" | "prospect",
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

type DefaultForm = typeof DEFAULT_FORM;

const REQUIRED_FIELDS = ["name", "sector", "customerType"] as const;

const isSector = (value: string): value is Sector => {
	return sectorsConfig.some((sector) => sector.id === value);
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

	const form = useForm({
		defaultValues: DEFAULT_FORM,
		onSubmit: async ({ value }) => {
			setSubmitError(null);

			const result = addClientSchema.safeParse(value);

			if (!result.success) {
				const errorPaths = new Set(result.error.errors.map((e) => e.path[0]));

				for (const err of result.error.errors) {
					const path = err.path[0];
					if (typeof path === "string") {
						form.setFieldMeta(path as keyof DefaultForm, (meta) => ({
							...meta,
							isTouched: true,
							errors: [err.message],
						}));
					}
				}

				const firstField = REQUIRED_FIELDS.find((f) => errorPaths.has(f));
				if (firstField) {
					document.getElementById(firstField)?.focus();
				}
				return;
			}

			try {
				const submitResult = await submitAddClientAndBuildHandoff(result.data, {
					createCompany,
					createCompanyContact,
					createLocation,
				});

				setOpen(false);
				form.reset();

				if (onSuccessWithClient) {
					onSuccessWithClient(submitResult.companyId);
					return;
				}

				onSubmitted?.();
				router.push(submitResult.handoffUrl);
			} catch {
				setSubmitError("We couldn't create this client. No data was saved.");
			}
		},
	});

	const closeAndReset = () => {
		setOpen(false);
		form.reset();
		setSubmitError(null);
	};

	const { showDiscardConfirm, guardClose, confirmDiscard, cancelDiscard } =
		useUnsavedChanges({
			isDirty: form.state.isDirty,
			onDiscard: closeAndReset,
		});

	const submitting = form.state.isSubmitting;

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (nextOpen) setOpen(true);
					else guardClose();
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

				<DialogFormContent
					size="lg"
					className="gap-0 overflow-hidden rounded-2xl border border-border/40 bg-surface-container-lowest p-0 shadow-lg"
					showCloseButton={true}
				>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						<DialogFormHeader className="flex flex-col gap-1.5 border-b border-border/15 px-7 pb-5 pt-6 text-left">
							<DialogTitle className="font-display text-[1.65rem] font-semibold tracking-tight text-foreground">
								Add New Client
							</DialogTitle>
							<DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
								Register a new industrial partner to the Kinetic Stream system
							</DialogDescription>
						</DialogFormHeader>

						<DialogFormBody className="max-h-[min(64vh,560px)] gap-0 overflow-y-auto bg-surface-container-lowest/60 p-0">
							<div className="flex flex-col gap-6 px-7 py-6">
								<section className="space-y-5">
									<SectionHeading
										icon={<Building2 aria-hidden className="size-3.5" />}
									>
										Company
									</SectionHeading>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-[1.2fr_1fr]">
										<form.Field
											name="name"
											validators={{
												onBlur: ({ value }) =>
													!value.trim() ? "Client name is required" : undefined,
											}}
										>
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
														<FieldLabel required htmlFor={field.name}>
															Company name
														</FieldLabel>
														<InputWithIcon
															id={field.name}
															icon={<Building2 className="size-4" />}
															placeholder="e.g. Apex Industrial Ltd"
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
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
													<div className="space-y-1.5">
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

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<form.Field
											name="customerType"
											validators={{
												onBlur: ({ value }) =>
													!value ? "Please select a customer type" : undefined,
											}}
										>
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
														<FieldLabel required htmlFor={field.name}>
															Client type
														</FieldLabel>
														<SelectWithIcon
															id={field.name}
															icon={<Building2 className="size-4" />}
															value={field.state.value}
															onValueChange={(value) =>
																field.handleChange(
																	value as DefaultForm["customerType"],
																)
															}
															placeholder="Select type"
															aria-invalid={hasError}
														>
															<SelectItem value="buyer">Buyer</SelectItem>
															<SelectItem value="generator">
																Generator
															</SelectItem>
															<SelectItem value="both">Both</SelectItem>
														</SelectWithIcon>
														{hasError && (
															<p className="text-xs text-destructive">
																{field.state.meta.errors[0]}
															</p>
														)}
													</div>
												);
											}}
										</form.Field>

										<form.Field name="accountStatus">
											{(field) => (
												<div className="space-y-1.5">
													<FieldLabel htmlFor="add-client-account-status-toggle">
														Account status
													</FieldLabel>
													<AccountStatusToggle
														aria-label="Account status"
														id="add-client-account-status-toggle"
														value={field.state.value}
														onValueChange={field.handleChange}
													/>
												</div>
											)}
										</form.Field>
									</div>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<form.Field name="subsector">
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
														<FieldLabel htmlFor={field.name}>
															Sub-industry
														</FieldLabel>
														<SubIndustryPicker
															id={field.name}
															value={field.state.value}
															onValueChange={(v) => field.handleChange(v)}
															sector={
																isSector(form.state.values.sector)
																	? form.state.values.sector
																	: ""
															}
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

										<form.Field name="companyNotes">
											{(field) => (
												<div className="space-y-1.5">
													<FieldLabel htmlFor={field.name}>Notes</FieldLabel>
													<Textarea
														id={field.name}
														value={field.state.value ?? ""}
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
								</section>

								<Separator className="bg-border/20" />

								<section className="space-y-5">
									<SectionHeading
										icon={<Phone aria-hidden className="size-3.5" />}
									>
										Primary contact
									</SectionHeading>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<form.Field name="contactName">
											{(field) => (
												<div className="space-y-1.5">
													<FieldLabel htmlFor={field.name}>
														Full legal name
													</FieldLabel>
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

										<form.Field name="contactEmail">
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
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
									</div>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<form.Field name="contactPhone">
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
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

										<form.Field name="contactTitle">
											{(field) => (
												<div className="space-y-1.5">
													<FieldLabel htmlFor={field.name}>Title</FieldLabel>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="e.g. Operations Manager"
														className="h-10 bg-surface-container-low/60"
													/>
												</div>
											)}
										</form.Field>
									</div>
								</section>

								<Separator className="bg-border/20" />

								<section className="space-y-5">
									<SectionHeading
										icon={<MapPin aria-hidden className="size-3.5" />}
									>
										Shipping location & logistics hub
									</SectionHeading>

									<div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
										<form.Field name="locationName">
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
														<FieldLabel htmlFor={field.name}>
															Location name
														</FieldLabel>
														<Input
															id={field.name}
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															onBlur={field.handleBlur}
															placeholder="e.g. Main Warehouse"
															className="h-10 bg-surface-container-low/60"
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

										<form.Field name="locationAddress">
											{(field) => (
												<div className="space-y-1.5">
													<FieldLabel htmlFor={field.name}>
														Street address
													</FieldLabel>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="Street address"
														className="h-10 bg-surface-container-low/60"
													/>
												</div>
											)}
										</form.Field>
									</div>

									<div className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
										<form.Field name="locationCity">
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
														<FieldLabel htmlFor={field.name}>City</FieldLabel>
														<Input
															id={field.name}
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															onBlur={field.handleBlur}
															placeholder="City"
															className="h-10 bg-surface-container-low/60"
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

										<form.Field name="locationState">
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
														<FieldLabel htmlFor={field.name}>
															State / Province
														</FieldLabel>
														<Input
															id={field.name}
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															onBlur={field.handleBlur}
															placeholder="State"
															className="h-10 bg-surface-container-low/60"
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

										<form.Field name="locationZipCode">
											{(field) => {
												const hasError =
													field.state.meta.isTouched &&
													field.state.meta.errors.length > 0;
												return (
													<div className="space-y-1.5">
														<FieldLabel htmlFor={field.name}>
															ZIP / Postal code
														</FieldLabel>
														<Input
															id={field.name}
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															onBlur={field.handleBlur}
															placeholder="ZIP"
															className="h-10 bg-surface-container-low/60"
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
								</section>

								{submitError && (
									<div className="rounded-lg border border-destructive/20 bg-error-container/30 px-4 py-3">
										<p className="text-sm text-on-error-container">
											{submitError}
										</p>
									</div>
								)}
							</div>
						</DialogFormBody>

						<DialogFormFooter className="flex items-center justify-between border-t border-border/15 bg-surface-container-low/60 px-7 py-4">
							<button
								type="button"
								onClick={closeAndReset}
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
									onClick={guardClose}
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
				description="Your progress on this form will be lost if you close without saving."
				confirmText="Discard"
				variant="destructive"
				onConfirm={confirmDiscard}
			/>
		</>
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

function SelectWithIcon({
	icon,
	value,
	onValueChange,
	placeholder,
	children,
	disabled,
	id,
	...triggerProps
}: {
	icon: ReactNode;
	value: string;
	onValueChange: (value: string) => void;
	placeholder: string;
	children: ReactNode;
	disabled?: boolean;
	id?: string;
} & Partial<
	Pick<
		ComponentProps<typeof SelectTrigger>,
		"aria-invalid" | "aria-describedby"
	>
>) {
	return (
		<Select
			value={value}
			onValueChange={onValueChange}
			disabled={disabled ?? false}
		>
			<SelectTrigger
				id={id}
				className="h-10 bg-surface-container-low/60"
				{...triggerProps}
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
