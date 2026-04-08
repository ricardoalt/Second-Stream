"use client";

/**
 * CreateCompanyDialog - Modal for creating or editing a company.
 *
 * TanStack Form + Zod safety net on submit.
 * Pattern matches create-location-dialog (gold standard).
 */

import { useForm } from "@tanstack/react-form";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "@/components/patterns/dialogs/modal";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
import { formatSubsector } from "@/components/shared/forms/compact-sector-select";
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
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
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
import { isForbiddenError } from "@/lib/api/client";
import { companySchema } from "@/lib/forms/schemas";
import { useToast } from "@/lib/hooks/use-toast";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import type { Sector, Subsector } from "@/lib/sectors-config";
import { sectorsConfig } from "@/lib/sectors-config";
import { useCompanyStore } from "@/lib/stores/company-store";
import type { CompanyDetail, CustomerType } from "@/lib/types/company";
import { isCustomerType } from "@/lib/types/company";

const isSector = (value: string): value is Sector => {
	return sectorsConfig.some((sector) => sector.id === value);
};

interface CreateCompanyDialogProps {
	onSuccess?: (company: CompanyDetail | null) => void;
	trigger?: React.ReactNode;
	/** Edit mode: provide existing company data */
	companyToEdit?: {
		id: string;
		name: string;
		industry: string;
		sector: Sector;
		subsector: Subsector;
		notes?: string;
		customerType?: CustomerType;
	};
}

/**
 * Fields validated on submit via Zod schema.
 * Sector/subsector use popover-based selects — no reliable onBlur —
 * so they validate only on submit, matching how create-location-dialog
 * handles its addressType select.
 */
const REQUIRED_FIELDS = [
	"name",
	"customerType",
	"sector",
	"subsector",
] as const;

export function CreateCompanyDialog({
	onSuccess,
	trigger,
	companyToEdit,
}: CreateCompanyDialogProps) {
	const isEditMode = Boolean(companyToEdit);
	const [open, setOpen] = useState(isEditMode);
	const { createCompany, updateCompany } = useCompanyStore();
	const { toast } = useToast();

	// Explicit annotation preserves literal unions (Sector | "", CustomerType | "")
	// that TanStack Form would otherwise widen to `string`.
	const defaultValues: {
		name: string;
		sector: Sector | "";
		subsector: Subsector | "";
		customerType: CustomerType | "";
		notes: string;
	} = {
		name: companyToEdit?.name ?? "",
		sector: companyToEdit?.sector ?? "",
		subsector: companyToEdit?.subsector ?? "",
		customerType: companyToEdit?.customerType ?? "",
		notes: companyToEdit?.notes ?? "",
	};

	const form = useForm({
		defaultValues,
		onSubmit: async ({ value }) => {
			// Auto-generate industry from subsector for backend compatibility
			const trimmedSubsector = value.subsector.trim();
			const industry = trimmedSubsector
				? formatSubsector(trimmedSubsector)
				: value.sector || "Other";

			const result = companySchema.safeParse({
				...value,
				industry,
				subsector: trimmedSubsector,
			});

			if (!result.success) {
				const errorPaths = new Set(result.error.errors.map((e) => e.path[0]));
				for (const fieldName of REQUIRED_FIELDS) {
					if (errorPaths.has(fieldName)) {
						form.setFieldMeta(fieldName, (meta) => ({
							...meta,
							isTouched: true,
						}));
						form.validateField(fieldName, "blur");
					}
				}

				const firstErrorPath = result.error.errors[0]?.path[0];
				if (typeof firstErrorPath === "string") {
					document.getElementById(firstErrorPath)?.focus();
				}
				return;
			}

			try {
				if (
					!isCustomerType(result.data.customerType) ||
					!isSector(result.data.sector)
				) {
					return;
				}

				// Narrowed after runtime checks above
				const sector = result.data.sector;
				const customerType = result.data.customerType;

				const dataToSubmit = {
					name: result.data.name,
					industry,
					sector,
					subsector: result.data.subsector,
					customerType,
					notes: result.data.notes ?? "",
				};

				let company: CompanyDetail;
				if (isEditMode && companyToEdit) {
					company = await updateCompany(companyToEdit.id, dataToSubmit);
					toast({
						title: "Company updated",
						description: `${result.data.name} has been updated successfully.`,
					});
				} else {
					company = await createCompany(dataToSubmit);
					toast({
						title: "Company created",
						description: `${result.data.name} has been created successfully.`,
					});
				}

				setOpen(false);
				form.reset();
				onSuccess?.(company);
			} catch (error) {
				if (!isForbiddenError(error)) {
					toast({
						title: "Error",
						description:
							error instanceof Error ? error.message : "Failed to save company",
						variant: "destructive",
					});
				}
			}
		},
	});

	const closeAndReset = () => {
		setOpen(false);
		form.reset();
		if (isEditMode) {
			onSuccess?.(null);
		}
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
				{!isEditMode && (
					<DialogTrigger asChild>
						{trigger ?? (
							<Button>
								<Building2 className="mr-2 h-4 w-4" />
								New Company
							</Button>
						)}
					</DialogTrigger>
				)}

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
								{isEditMode ? "Edit Company" : "Create New Company"}
							</DialogTitle>
							<DialogDescription>
								{isEditMode
									? "Update company information"
									: "Add company details"}
							</DialogDescription>
						</DialogFormHeader>

						<DialogFormBody>
							{/* Company Name */}
							<form.Field
								name="name"
								validators={{
									onBlur: ({ value }) => {
										if (!value.trim()) return "Company name is required";
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
											<Label htmlFor={field.name}>
												Company Name <span className="text-destructive">*</span>
											</Label>
											<Input
												id={field.name}
												placeholder="e.g. Acme Industrial"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												aria-invalid={hasError}
												aria-required="true"
												aria-describedby={
													hasError ? `${field.name}-error` : undefined
												}
											/>
											{hasError && (
												<p
													id={`${field.name}-error`}
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

							{/* Customer Type */}
							<form.Field
								name="customerType"
								validators={{
									onBlur: ({ value }) => {
										if (!value) return "Please select a customer type";
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
											<Label htmlFor={field.name}>
												Customer Type{" "}
												<span className="text-destructive">*</span>
											</Label>
											<Select
												value={field.state.value}
												onValueChange={(v) => {
													if (
														v !== "buyer" &&
														v !== "generator" &&
														v !== "both"
													) {
														return;
													}
													field.handleChange(v);
												}}
											>
												<SelectTrigger
													id={field.name}
													onBlur={field.handleBlur}
													aria-invalid={hasError}
													aria-describedby={
														hasError ? `${field.name}-error` : undefined
													}
												>
													<SelectValue placeholder="Select type..." />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="buyer">Buyer</SelectItem>
													<SelectItem value="generator">Generator</SelectItem>
													<SelectItem value="both">Both</SelectItem>
												</SelectContent>
											</Select>
											{hasError && (
												<p
													id={`${field.name}-error`}
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

							{/* Sector / Subsector */}
							<form.Field
								name="sector"
								validators={{
									onBlur: ({ value }) => {
										if (!value) return "Please select an industry";
										return undefined;
									},
								}}
							>
								{(sectorField) => (
									<form.Field
										name="subsector"
										validators={{
											onBlur: ({ value }) => {
												if (!value.trim())
													return "Please select a sub-industry";
												return undefined;
											},
										}}
									>
										{(subsectorField) => {
											const sectorHasError =
												sectorField.state.meta.isTouched &&
												sectorField.state.meta.errors.length > 0;
											const subsectorHasError =
												subsectorField.state.meta.isTouched &&
												subsectorField.state.meta.errors.length > 0;

											return (
												<div className="grid gap-4">
													<div className="grid gap-2">
														<IndustryPicker
															value={sectorField.state.value}
															onValueChange={(sector) => {
																sectorField.handleChange(sector);
																subsectorField.handleChange("");
															}}
															aria-invalid={sectorHasError}
														/>
														{sectorHasError && (
															<p
																className="text-xs text-destructive"
																role="alert"
															>
																{sectorField.state.meta.errors[0]}
															</p>
														)}
													</div>
													<div className="grid gap-2">
														<SubIndustryPicker
															value={subsectorField.state.value}
															onValueChange={(subsector) => {
																subsectorField.handleChange(subsector);
															}}
															sector={sectorField.state.value}
															aria-invalid={subsectorHasError}
														/>
														{subsectorHasError && (
															<p
																className="text-xs text-destructive"
																role="alert"
															>
																{subsectorField.state.meta.errors[0]}
															</p>
														)}
													</div>
												</div>
											);
										}}
									</form.Field>
								)}
							</form.Field>

							{/* Notes */}
							<form.Field name="notes">
								{(field) => (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>Notes</Label>
										<Textarea
											id={field.name}
											placeholder="Internal notes about this company..."
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											rows={3}
										/>
									</div>
								)}
							</form.Field>
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
											{isEditMode ? "Update Company" : "Create Company"}
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
