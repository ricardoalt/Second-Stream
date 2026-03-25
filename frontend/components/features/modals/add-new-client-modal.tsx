"use client";

import { Building2, PlusCircle } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AddNewClientModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const industries = [
	"Chemical Manufacturing",
	"Pharmaceutical",
	"Energy & Utilities",
	"Aerospace",
	"Food Processing",
];

const statuses = ["active", "prospect", "inactive"] as const;

const initialFormState = {
	companyName: "",
	industry: industries[0] ?? "",
	status: statuses[0],
	contactName: "",
	contactEmail: "",
	contactPhone: "",
	addressLine1: "",
	city: "",
	state: "",
	postalCode: "",
	notes: "",
};

export function AddNewClientModal({
	open,
	onOpenChange,
}: AddNewClientModalProps) {
	const [form, setForm] = useState(initialFormState);

	useEffect(() => {
		if (!open) {
			setForm(initialFormState);
		}
	}, [open]);

	function updateField(field: keyof typeof initialFormState, value: string) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	const canCreate =
		form.companyName.trim().length > 1 && form.contactEmail.trim().length > 3;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,900px)] max-w-none rounded-xl border-0 p-0">
				<DialogHeader className="flex flex-col gap-2 bg-surface-container-low px-6 py-5 text-left">
					<div className="flex items-center gap-2">
						<Building2 aria-hidden className="text-primary" />
						<Badge variant="secondary" className="rounded-full">
							Client portfolio
						</Badge>
					</div>
					<DialogTitle className="font-display text-2xl font-semibold tracking-tight">
						Add New Client
					</DialogTitle>
					<DialogDescription>
						Register a new industrial account with company profile, contact, and
						address details.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
					<div className="grid gap-4 md:grid-cols-3">
						<div className="flex flex-col gap-2 md:col-span-2">
							<Label htmlFor="new-client-company">Company name</Label>
							<Input
								id="new-client-company"
								value={form.companyName}
								onChange={(event) =>
									updateField("companyName", event.target.value)
								}
								placeholder="Nova Industrial"
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Status</Label>
							<Select
								value={form.status}
								onValueChange={(value) =>
									updateField("status", value as (typeof statuses)[number])
								}
							>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select status" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{statuses.map((item) => (
											<SelectItem key={item} value={item}>
												{item[0]?.toUpperCase()}
												{item.slice(1)}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label>Industry</Label>
							<Select
								value={form.industry}
								onValueChange={(value) => updateField("industry", value)}
							>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select industry" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{industries.map((item) => (
											<SelectItem key={item} value={item}>
												{item}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="new-client-contact-name">
								Primary contact name
							</Label>
							<Input
								id="new-client-contact-name"
								value={form.contactName}
								onChange={(event) =>
									updateField("contactName", event.target.value)
								}
								placeholder="Marcus Thorne"
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="new-client-contact-email">Email</Label>
							<Input
								id="new-client-contact-email"
								type="email"
								value={form.contactEmail}
								onChange={(event) =>
									updateField("contactEmail", event.target.value)
								}
								placeholder="marcus.thorne@nova-industrial.com"
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="new-client-contact-phone">Phone</Label>
							<Input
								id="new-client-contact-phone"
								value={form.contactPhone}
								onChange={(event) =>
									updateField("contactPhone", event.target.value)
								}
								placeholder="+1 (713) 555-0142"
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-6">
						<div className="flex flex-col gap-2 md:col-span-3">
							<Label htmlFor="new-client-address-line1">Address</Label>
							<Input
								id="new-client-address-line1"
								value={form.addressLine1}
								onChange={(event) =>
									updateField("addressLine1", event.target.value)
								}
								placeholder="1401 Eastgate Industrial Pkwy"
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2 md:col-span-1">
							<Label htmlFor="new-client-city">City</Label>
							<Input
								id="new-client-city"
								value={form.city}
								onChange={(event) => updateField("city", event.target.value)}
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2 md:col-span-1">
							<Label htmlFor="new-client-state">State</Label>
							<Input
								id="new-client-state"
								value={form.state}
								onChange={(event) => updateField("state", event.target.value)}
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2 md:col-span-1">
							<Label htmlFor="new-client-postal">Postal</Label>
							<Input
								id="new-client-postal"
								value={form.postalCode}
								onChange={(event) =>
									updateField("postalCode", event.target.value)
								}
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="new-client-notes">Notes</Label>
						<Textarea
							id="new-client-notes"
							value={form.notes}
							onChange={(event) => updateField("notes", event.target.value)}
							className="min-h-24 bg-surface"
							placeholder="Capture onboarding context, compliance priorities, or operational constraints."
						/>
					</div>
				</div>

				<DialogFooter className="bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-between">
					<Button
						variant="secondary"
						type="button"
						onClick={() => setForm(initialFormState)}
					>
						Reset form
					</Button>
					<div className="flex items-center gap-2">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="button" disabled={!canCreate}>
							<PlusCircle data-icon="inline-start" aria-hidden />
							Create Client
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
