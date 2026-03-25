"use client";

import { MessageSquareMore, Paperclip, Send, Smile } from "lucide-react";
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
import { cn } from "@/lib/utils";

type UpdateMessage = {
	id: string;
	author: string;
	role: "admin" | "agent";
	timestamp: string;
	body: string;
};

type Recipient = {
	id: string;
	name: string;
	role: string;
};

type RequestUpdateModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipients?: Recipient[];
};

const urgencyLevels = ["Low", "Normal", "High", "Critical"];

const initialMessages: UpdateMessage[] = [
	{
		id: "m-1",
		author: "Steve (You)",
		role: "admin",
		timestamp: "2d ago",
		body: "Alex, we are missing the SDS for this stream. Can you follow up today?",
	},
	{
		id: "m-2",
		author: "Alex Fischer",
		role: "agent",
		timestamp: "1d ago",
		body: "Contacted the site manager. They are pulling it from their records.",
	},
	{
		id: "m-3",
		author: "System",
		role: "agent",
		timestamp: "4h ago",
		body: "PharmaTech facility portal updated.",
	},
];

export function RequestUpdateModal({
	open,
	onOpenChange,
	recipients = [{ id: "alex", name: "Alex Fischer", role: "Field Agent" }],
}: RequestUpdateModalProps) {
	const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? "");
	const [urgency, setUrgency] = useState("Normal");
	const [messages, setMessages] = useState<UpdateMessage[]>(initialMessages);
	const [draft, setDraft] = useState("");

	useEffect(() => {
		if (!open) {
			setRecipientId(recipients[0]?.id ?? "");
			setUrgency("Normal");
			setMessages(initialMessages);
			setDraft("");
		}
	}, [open, recipients]);

	const selectedRecipient = useMemo(
		() =>
			recipients.find((recipient) => recipient.id === recipientId) ??
			recipients[0],
		[recipientId, recipients],
	);

	function handleSend() {
		const text = draft.trim();
		if (!text) return;

		setMessages((current) => [
			...current,
			{
				id: crypto.randomUUID(),
				author: "Steve (You)",
				role: "admin",
				timestamp: "Just now",
				body: text,
			},
		]);
		setDraft("");
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,860px)] max-w-none rounded-xl border-0 p-0">
				<DialogHeader className="flex flex-col gap-2 bg-surface-container-low px-6 py-5 text-left">
					<div className="flex items-center gap-2">
						<MessageSquareMore aria-hidden className="text-primary" />
						<Badge variant="secondary" className="rounded-full">
							Update request thread
						</Badge>
					</div>
					<DialogTitle className="font-display text-2xl font-semibold tracking-tight">
						Request Update
					</DialogTitle>
					<DialogDescription>
						Chat-style communication to request field updates and track response
						history.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label>Recipient</Label>
							<Select value={recipientId} onValueChange={setRecipientId}>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select recipient" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{recipients.map((recipient) => (
											<SelectItem key={recipient.id} value={recipient.id}>
												{recipient.name} · {recipient.role}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Urgency level</Label>
							<Select value={urgency} onValueChange={setUrgency}>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select urgency" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{urgencyLevels.map((level) => (
											<SelectItem key={level} value={level}>
												{level}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="max-h-[320px] overflow-y-auto rounded-lg bg-surface p-3">
						<div className="flex flex-col gap-3">
							{messages.map((message) => (
								<div
									key={message.id}
									className={cn(
										"flex max-w-[90%] flex-col gap-1 rounded-lg px-3 py-2",
										message.role === "admin"
											? "ml-auto bg-primary text-primary-foreground"
											: "bg-surface-container-low text-foreground",
									)}
								>
									<div className="flex items-center gap-2">
										<Avatar className="size-6">
											<AvatarFallback className="text-[10px]">
												{message.author
													.split(" ")
													.map((part) => part[0])
													.join("")
													.slice(0, 2)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<p className="text-xs font-semibold">{message.author}</p>
										<p className="text-[11px] opacity-75">
											{message.timestamp}
										</p>
									</div>
									<p className="text-sm leading-relaxed">{message.body}</p>
								</div>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="request-update-input">
							New instruction / request
						</Label>
						<div className="flex items-center gap-2 rounded-lg bg-surface p-2">
							<Button variant="ghost" size="icon-sm" type="button">
								<Paperclip />
							</Button>
							<Input
								id="request-update-input"
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
								placeholder="Request latest status and missing field confirmation..."
								className="border-0 bg-transparent shadow-none"
								onKeyDown={(event) => {
									if (event.key === "Enter") {
										event.preventDefault();
										handleSend();
									}
								}}
							/>
							<Button variant="ghost" size="icon-sm" type="button">
								<Smile />
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Recipient: {selectedRecipient?.name ?? "N/A"} · Urgency: {urgency}
						</p>
					</div>
				</div>

				<DialogFooter className="bg-surface-container-low px-6 py-4 sm:flex-row sm:justify-between">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleSend}
						disabled={draft.trim().length < 3}
					>
						<Send data-icon="inline-start" aria-hidden />
						Send Request
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
