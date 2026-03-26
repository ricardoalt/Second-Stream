"use client";

import { Building2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import type {
	ClientDetail,
	ClientStatus,
} from "@/components/features/clients/mock-data";
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

type EditClientModalProps = {
	client: ClientDetail;
	open: boolean;
	onClose: () => void;
};

const statuses: ClientStatus[] = ["active", "prospect", "inactive"];

type FormState = {
	companyName: string;
	industry: string;
	status: ClientStatus;
	contactName: string;
	email: string;
	phone: string;
};

function getInitialForm(client: ClientDetail): FormState {
	return {
		companyName: client.name,
		industry: client.industry,
		status: client.status,
		contactName: client.contactName,
		email: client.contactEmail,
		phone: client.contactPhone,
	};
}

export function EditClientModal({
	client,
	open,
	onClose,
}: EditClientModalProps) {
	const [form, setForm] = useState<FormState>(() => getInitialForm(client));

	useEffect(() => {
		if (open) {
			setForm(getInitialForm(client));
		}
	}, [client, open]);

	function updateField(field: keyof FormState, value: string) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent className="w-[min(92vw,900px)] max-w-none rounded-xl border-0 bg-white/85 p-0 backdrop-blur-xl">
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
						Update account profile fields and review registered locations.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="edit-client-company">Company Name</Label>
							<Input
								id="edit-client-company"
								value={form.companyName}
								onChange={(event) =>
									updateField("companyName", event.target.value)
								}
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="edit-client-industry">Industry</Label>
							<Input
								id="edit-client-industry"
								value={form.industry}
								onChange={(event) =>
									updateField("industry", event.target.value)
								}
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<div className="flex flex-col gap-2 md:col-span-1">
							<Label>Status</Label>
							<Select
								value={form.status}
								onValueChange={(value) => updateField("status", value)}
							>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select status" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{statuses.map((status) => (
											<SelectItem key={status} value={status}>
												{status[0]?.toUpperCase()}
												{status.slice(1)}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-2 md:col-span-2">
							<Label htmlFor="edit-client-contact-name">Contact Name</Label>
							<Input
								id="edit-client-contact-name"
								value={form.contactName}
								onChange={(event) =>
									updateField("contactName", event.target.value)
								}
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="edit-client-email">Email</Label>
							<Input
								id="edit-client-email"
								type="email"
								value={form.email}
								onChange={(event) => updateField("email", event.target.value)}
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="edit-client-phone">Phone</Label>
							<Input
								id="edit-client-phone"
								value={form.phone}
								onChange={(event) => updateField("phone", event.target.value)}
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="rounded-xl bg-surface p-4">
						<div className="mb-3 flex items-center gap-2">
							<MapPin aria-hidden className="size-4 text-primary" />
							<p className="text-sm font-semibold text-foreground">Locations</p>
						</div>
						<div className="flex flex-col gap-2">
							{client.locations.map((location) => (
								<div
									key={location.id}
									className="flex items-start justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"
								>
									<div>
										<p className="text-sm font-medium text-foreground">
											{location.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{location.address} · {location.city}, {location.state}
										</p>
									</div>
									<Badge variant="outline" className="rounded-full text-xs">
										{location.streamCount} streams
									</Badge>
								</div>
							))}
						</div>
					</div>
				</div>

				<DialogFooter className="bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-end">
					<div className="flex items-center gap-2">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button type="button">Save Changes</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
