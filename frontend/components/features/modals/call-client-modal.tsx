"use client";

import { Clock3, Phone, PhoneCall } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export type CallContact = {
	id: string;
	name: string;
	role: string;
	phone: string;
};

type CallClientModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	contacts: CallContact[];
};

const outcomes = [
	"Connected",
	"Voicemail",
	"No answer",
	"Scheduled callback",
	"Wrong number",
];

export function CallClientModal({
	open,
	onOpenChange,
	contacts,
}: CallClientModalProps) {
	const fallbackContact = contacts[0];
	const [selectedContactId, setSelectedContactId] = useState(
		fallbackContact?.id ?? "",
	);
	const [duration, setDuration] = useState("18");
	const [outcome, setOutcome] = useState<string>(outcomes[0] ?? "");
	const [notes, setNotes] = useState(
		"Confirmed document request timeline and aligned on follow-up after SDS upload.",
	);

	useEffect(() => {
		if (!open) {
			setSelectedContactId(fallbackContact?.id ?? "");
			setDuration("18");
			setOutcome(outcomes[0] ?? "");
			setNotes(
				"Confirmed document request timeline and aligned on follow-up after SDS upload.",
			);
		}
	}, [fallbackContact?.id, open]);

	const selectedContact = useMemo(
		() =>
			contacts.find((contact) => contact.id === selectedContactId) ??
			fallbackContact,
		[contacts, fallbackContact, selectedContactId],
	);

	if (!selectedContact) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,820px)] max-w-none rounded-xl border-0 p-0">
				<DialogHeader className="flex flex-col gap-2 bg-surface-container-low px-6 py-5 text-left">
					<div className="flex items-center gap-2">
						<Phone aria-hidden className="text-primary" />
						<Badge variant="secondary" className="rounded-full">
							Client contact stage
						</Badge>
					</div>
					<DialogTitle className="font-display text-2xl font-semibold tracking-tight">
						Call Client
					</DialogTitle>
					<DialogDescription>
						Capture call summary, outcome, and duration for the client timeline.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label>Contact person</Label>
							<Select
								value={selectedContactId}
								onValueChange={setSelectedContactId}
							>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select contact" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{contacts.map((contact) => (
											<SelectItem key={contact.id} value={contact.id}>
												{contact.name} · {contact.role}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="call-duration">Duration (minutes)</Label>
							<Input
								id="call-duration"
								type="number"
								min={1}
								value={duration}
								onChange={(event) => setDuration(event.target.value)}
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="rounded-lg bg-surface p-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<Avatar className="size-10">
									<AvatarFallback className="bg-primary/10 text-primary">
										{selectedContact.name
											.split(" ")
											.map((part) => part[0])
											.join("")
											.slice(0, 2)
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col gap-0.5">
									<p className="text-sm font-semibold text-foreground">
										{selectedContact.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{selectedContact.role}
									</p>
									<p className="inline-flex items-center gap-1 text-sm text-foreground">
										<PhoneCall aria-hidden className="size-3.5 text-primary" />
										{selectedContact.phone}
									</p>
								</div>
							</div>
							<Button type="button" variant="secondary">
								<Phone data-icon="inline-start" aria-hidden />
								Start Call
							</Button>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
						<div className="flex flex-col gap-2">
							<Label htmlFor="call-notes">Call notes</Label>
							<Textarea
								id="call-notes"
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								className="min-h-36 bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Call outcome</Label>
							<Select value={outcome} onValueChange={setOutcome}>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select outcome" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{outcomes.map((item) => (
											<SelectItem key={item} value={item}>
												{item}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
							<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
								<Clock3 aria-hidden className="size-3.5" />
								Duration logged: {duration || "0"} min
							</p>
						</div>
					</div>
				</div>

				<DialogFooter className="bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-between">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<div className="flex items-center gap-2">
						<Button variant="secondary" type="button">
							Discard Notes
						</Button>
						<Button type="button">Save Call Summary</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
