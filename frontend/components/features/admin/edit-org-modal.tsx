"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getModalWidthClass } from "@/components/patterns/dialogs/modal";
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
import type {
	Organization,
	OrganizationUpdateInput,
} from "@/lib/api/organizations";

interface EditOrgModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organization: Organization | null;
	onSubmit: (orgId: string, data: OrganizationUpdateInput) => Promise<void>;
}

export function EditOrgModal({
	open,
	onOpenChange,
	organization,
	onSubmit,
}: EditOrgModalProps) {
	const [form, setForm] = useState({
		name: "",
		contactEmail: "",
		contactPhone: "",
	});
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (organization) {
			setForm({
				name: organization.name,
				contactEmail: organization.contactEmail || "",
				contactPhone: organization.contactPhone || "",
			});
		}
	}, [organization]);

	const handleInputChange = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const hasChanges = useMemo(() => {
		if (!organization) return false;
		return (
			form.name !== organization.name ||
			form.contactEmail !== (organization.contactEmail || "") ||
			form.contactPhone !== (organization.contactPhone || "")
		);
	}, [form, organization]);

	const canSubmit = useMemo(() => {
		return form.name.trim() !== "" && hasChanges;
	}, [form.name, hasChanges]);

	const handleSubmit = async () => {
		if (!canSubmit || !organization) return;

		setSubmitting(true);
		try {
			const updates: OrganizationUpdateInput = {};
			if (form.name !== organization.name) updates.name = form.name.trim();
			if (form.contactEmail !== (organization.contactEmail || "")) {
				updates.contactEmail = form.contactEmail.trim() || null;
			}
			if (form.contactPhone !== (organization.contactPhone || "")) {
				updates.contactPhone = form.contactPhone.trim() || null;
			}

			await onSubmit(organization.id, updates);
			onOpenChange(false);
		} finally {
			setSubmitting(false);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
	};

	if (!organization) return null;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className={getModalWidthClass("xs")}>
				<DialogHeader>
					<DialogTitle>Edit Organization</DialogTitle>
					<DialogDescription>
						Update organization details. Slug cannot be changed.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="name">Name *</Label>
						<Input
							id="name"
							value={form.name}
							onChange={(e) => handleInputChange("name", e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="slug">Slug</Label>
						<Input
							id="slug"
							value={organization.slug}
							disabled
							className="font-mono bg-muted"
						/>
						<p className="text-xs text-muted-foreground">
							Slug cannot be modified after creation
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="contactEmail">Contact Email</Label>
						<Input
							id="contactEmail"
							type="email"
							placeholder="admin@company.com"
							value={form.contactEmail}
							onChange={(e) =>
								handleInputChange("contactEmail", e.target.value)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="contactPhone">Contact Phone</Label>
						<Input
							id="contactPhone"
							placeholder="+1 555 123 4567"
							value={form.contactPhone}
							onChange={(e) =>
								handleInputChange("contactPhone", e.target.value)
							}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
						{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						{submitting ? "Saving…" : "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
