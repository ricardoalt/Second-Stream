"use client";

/**
 * CreateCompanyDialog - Modal for creating or editing a company
 *
 * Single-step form with:
 * - Company Name (required)
 * - Sector/Subsector selection (required)
 * - Contact information (optional)
 *
 * Industry field is auto-generated from subsector for backend compatibility.
 */

import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	CompactSectorSelect,
	formatSubsector,
} from "@/components/shared/forms/compact-sector-select";
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
import { LoadingButton } from "@/components/ui/loading-button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isForbiddenError } from "@/lib/api/client";
import { useToast } from "@/lib/hooks/use-toast";
import type { Sector, Subsector } from "@/lib/sectors-config";
import { sectorsConfig } from "@/lib/sectors-config";
import { useCompanyStore } from "@/lib/stores/company-store";
import type {
	CompanyDetail,
	CompanyFormData,
	CustomerType,
} from "@/lib/types/company";

const isCustomerType = (value: string): value is CustomerType => {
	return value === "buyer" || value === "generator" || value === "both";
};

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
		contactName?: string;
		contactEmail?: string;
		contactPhone?: string;
		notes?: string;
		customerType?: CustomerType;
	};
}

/** Initial empty form state */
const EMPTY_FORM: CompanyFormData = {
	name: "",
	industry: "", // Auto-generated from subsector
	sector: "",
	subsector: "",
	customerType: "",
	contactName: "",
	contactEmail: "",
	contactPhone: "",
	notes: "",
};

export function CreateCompanyDialog({
	onSuccess,
	trigger,
	companyToEdit,
}: CreateCompanyDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const { createCompany, updateCompany } = useCompanyStore();
	const { toast } = useToast();

	const isEditMode = !!companyToEdit;
	const [formData, setFormData] = useState<CompanyFormData>(EMPTY_FORM);
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	// Populate form data when editing
	useEffect(() => {
		if (companyToEdit) {
			setFormData({
				name: companyToEdit.name,
				industry: companyToEdit.industry || "",
				sector: companyToEdit.sector ?? "",
				subsector: companyToEdit.subsector ?? "",
				customerType: companyToEdit.customerType || "both",
				contactName: companyToEdit.contactName || "",
				contactEmail: companyToEdit.contactEmail || "",
				contactPhone: companyToEdit.contactPhone || "",
				notes: companyToEdit.notes || "",
			});
		}
	}, [companyToEdit]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			if (
				!isCustomerType(formData.customerType) ||
				!isSector(formData.sector)
			) {
				toast({
					title: "Validation Error",
					description: "Please complete required fields",
					variant: "destructive",
				});
				return;
			}

			const trimmedSubsector = formData.subsector.trim();
			if (!trimmedSubsector) {
				toast({
					title: "Validation Error",
					description: "Please select a subsector",
					variant: "destructive",
				});
				return;
			}

			// Auto-generate industry from subsector for backend compatibility
			const industry = trimmedSubsector
				? formatSubsector(trimmedSubsector)
				: formData.sector || "Other";

			const dataToSubmit = {
				...formData,
				industry,
				sector: formData.sector,
				subsector: trimmedSubsector,
				customerType: formData.customerType,
			};

			let company: CompanyDetail;
			if (isEditMode) {
				company = await updateCompany(companyToEdit.id, dataToSubmit);
				toast({
					title: "Company updated",
					description: `${formData.name} has been updated successfully.`,
				});
			} else {
				company = await createCompany(dataToSubmit);
				toast({
					title: "Company created",
					description: `${formData.name} has been created successfully.`,
				});
			}

			setOpen(false);
			setFormData(EMPTY_FORM);
			setTouched({});
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
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		if (isEditMode) {
			onSuccess?.(null);
		} else {
			setOpen(false);
		}
	};

	// For edit mode, use external open control
	const dialogOpen = isEditMode ? companyToEdit !== undefined : open;
	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			handleCancel();
		} else if (!isEditMode) {
			setOpen(newOpen);
		}
	};

	// Form is valid when name and sector are filled, and email format is valid if provided
	const isEmailValid =
		!formData.contactEmail ||
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail);
	const isFormValid =
		formData.name.trim() &&
		formData.customerType &&
		formData.sector &&
		isEmailValid;

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
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

			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEditMode ? "Edit Company" : "Create New Company"}
						</DialogTitle>
						<DialogDescription>
							{isEditMode
								? "Update company information"
								: "Add company details"}
						</DialogDescription>
					</DialogHeader>

					<div className="py-4 space-y-4">
						{/* Company Name */}
						<div className="grid gap-2">
							<Label htmlFor="name">
								Company Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
								required
							/>
							{touched.name && !formData.name.trim() && (
								<p className="text-sm text-destructive">
									Company name is required
								</p>
							)}
						</div>

						{/* Customer Type */}
						<div className="grid gap-2">
							<Label htmlFor="customerType">
								Customer Type <span className="text-destructive">*</span>
							</Label>
							<Select
								value={formData.customerType}
								onValueChange={(value) => {
									if (
										value !== "buyer" &&
										value !== "generator" &&
										value !== "both"
									) {
										return;
									}
									setFormData({
										...formData,
										customerType: value,
									});
									setTouched((prev) => ({ ...prev, customerType: true }));
								}}
							>
								<SelectTrigger
									id="customerType"
									onBlur={() =>
										setTouched((prev) => ({ ...prev, customerType: true }))
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
							{touched.customerType && !formData.customerType && (
								<p className="text-sm text-destructive">
									Please select a customer type
								</p>
							)}
						</div>

						{/* Sector / Subsector - single reusable component */}
						<CompactSectorSelect
							sector={formData.sector}
							subsector={formData.subsector}
							onSectorChange={(sector) =>
								setFormData((prev) => ({ ...prev, sector }))
							}
							onSubsectorChange={(subsector) =>
								setFormData((prev) => ({
									...prev,
									subsector,
								}))
							}
							error={
								touched.name && formData.name.trim() && !formData.sector
									? "Please select a sector"
									: undefined
							}
						/>

						{/* Contact Name */}
						<div className="grid gap-2">
							<Label htmlFor="contactName">Contact Name</Label>
							<Input
								id="contactName"
								value={formData.contactName}
								onChange={(e) =>
									setFormData({ ...formData, contactName: e.target.value })
								}
							/>
						</div>

						{/* Contact Email */}
						<div className="grid gap-2">
							<Label htmlFor="contactEmail">Contact Email</Label>
							<Input
								id="contactEmail"
								type="email"
								value={formData.contactEmail}
								onChange={(e) =>
									setFormData({ ...formData, contactEmail: e.target.value })
								}
								onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
								placeholder="name@company.com"
							/>
							{touched.email && formData.contactEmail && !isEmailValid && (
								<p className="text-sm text-destructive">
									Please enter a valid email address
								</p>
							)}
						</div>

						{/* Contact Phone */}
						<div className="grid gap-2">
							<Label htmlFor="contactPhone">Contact Phone</Label>
							<Input
								id="contactPhone"
								value={formData.contactPhone}
								onChange={(e) =>
									setFormData({ ...formData, contactPhone: e.target.value })
								}
								placeholder="+1 555 123 4567"
							/>
						</div>

						{/* Notes */}
						<div className="grid gap-2">
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={formData.notes}
								onChange={(e) =>
									setFormData({ ...formData, notes: e.target.value })
								}
								rows={3}
							/>
						</div>
					</div>

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={loading}
						>
							Cancel
						</Button>
						<LoadingButton
							type="submit"
							loading={loading}
							disabled={!isFormValid}
						>
							{isEditMode ? "Update Company" : "Create Company"}
						</LoadingButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
