"use client";

import { Building2, ChevronDown, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { CompactSectorSelect } from "@/components/shared/forms/compact-sector-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { isValidZipCode, ZIP_CODE_FORMAT_MESSAGE } from "@/lib/forms/schemas";
import type { Sector, Subsector } from "@/lib/sectors-config";
import { cn } from "@/lib/utils";

type AddNewClientModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const statuses = ["active", "prospect", "inactive"] as const;

type AddNewClientFormState = {
	companyName: string;
	sector: Sector | "";
	subsector: Subsector | "";
	status: (typeof statuses)[number];
	contactName: string;
	contactEmail: string;
	contactPhone: string;
	locationName: string;
	locationCity: string;
	locationState: string;
	locationAddress: string;
	locationZip: string;
	notes: string;
};

const initialFormState: AddNewClientFormState = {
	companyName: "",
	sector: "",
	subsector: "",
	status: statuses[0],
	contactName: "",
	contactEmail: "",
	contactPhone: "",
	locationName: "",
	locationCity: "",
	locationState: "",
	locationAddress: "",
	locationZip: "",
	notes: "",
};

export function AddNewClientModal({
	open,
	onOpenChange,
}: AddNewClientModalProps) {
	const [form, setForm] = useState(initialFormState);
	const [isFirstLocationOpen, setIsFirstLocationOpen] = useState(false);

	const locationZipTrimmed = form.locationZip.trim();
	const locationZipError =
		locationZipTrimmed.length > 0 && !isValidZipCode(locationZipTrimmed)
			? ZIP_CODE_FORMAT_MESSAGE
			: null;

	useEffect(() => {
		if (!open) {
			setForm(initialFormState);
			setIsFirstLocationOpen(false);
		}
	}, [open]);

	function updateField(
		field: keyof AddNewClientFormState,
		value: AddNewClientFormState[keyof AddNewClientFormState],
	) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	const canCreate = form.companyName.trim().length > 1;

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
						Register a new industrial account with industry classification and
						optional first location.
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
							<CompactSectorSelect
								sector={form.sector}
								subsector={form.subsector}
								onSectorChange={(value) => updateField("sector", value)}
								onSubsectorChange={(value) => updateField("subsector", value)}
								className="space-y-2"
							/>
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

					<Collapsible
						open={isFirstLocationOpen}
						onOpenChange={setIsFirstLocationOpen}
						className="rounded-lg border border-border/60 bg-surface/50"
					>
						<CollapsibleTrigger asChild>
							<Button
								variant="ghost"
								type="button"
								className="w-full justify-between px-4 py-3 text-sm font-medium"
							>
								<span>Add first location (optional)</span>
								<ChevronDown
									className={cn(
										"h-4 w-4 transition-transform",
										isFirstLocationOpen && "rotate-180",
									)}
								/>
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="px-4 pb-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="new-client-location-name">
										Location name
									</Label>
									<Input
										id="new-client-location-name"
										value={form.locationName}
										onChange={(event) =>
											updateField("locationName", event.target.value)
										}
										placeholder="Houston Main Processing"
										className="bg-surface"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="new-client-location-address">Address</Label>
									<Input
										id="new-client-location-address"
										value={form.locationAddress}
										onChange={(event) =>
											updateField("locationAddress", event.target.value)
										}
										placeholder="1401 Eastgate Industrial Pkwy"
										className="bg-surface"
									/>
								</div>
							</div>
							<div className="mt-4 grid gap-4 md:grid-cols-6">
								<div className="flex flex-col gap-2 md:col-span-3">
									<Label htmlFor="new-client-location-city">City</Label>
									<Input
										id="new-client-location-city"
										value={form.locationCity}
										onChange={(event) =>
											updateField("locationCity", event.target.value)
										}
										className="bg-surface"
									/>
								</div>
								<div className="flex flex-col gap-2 md:col-span-1">
									<Label htmlFor="new-client-location-state">State</Label>
									<Input
										id="new-client-location-state"
										value={form.locationState}
										onChange={(event) =>
											updateField("locationState", event.target.value)
										}
										className="bg-surface"
									/>
								</div>
								<div className="flex flex-col gap-2 md:col-span-2">
									<Label htmlFor="new-client-location-zip">ZIP</Label>
									<Input
										id="new-client-location-zip"
										value={form.locationZip}
										onChange={(event) =>
											updateField("locationZip", event.target.value)
										}
										placeholder="77029"
										className="bg-surface"
									/>
									{locationZipError && (
										<p className="text-xs text-destructive">
											{locationZipError}
										</p>
									)}
								</div>
							</div>
						</CollapsibleContent>
					</Collapsible>

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
						onClick={() => {
							setForm(initialFormState);
							setIsFirstLocationOpen(false);
						}}
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
