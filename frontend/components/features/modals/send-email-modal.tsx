"use client";

import { Lock, Mail, Paperclip, Send } from "lucide-react";
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

type SendEmailModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultTo?: string;
	defaultCc?: string;
};

const templates = [
	"Follow-up after site visit",
	"Compliance documentation request",
	"Proposal summary and next steps",
	"Pickup coordination update",
];

const defaultBody =
	"Dear client,\n\nFollowing our discussions regarding the current waste stream logistics, please find the updated summary and action items attached.\n\nBest regards,\nSecondStream Field Operations";

const attachmentQueue = [
	{ name: "Stream_442_Summary.pdf", size: "2.4 MB" },
	{ name: "Compliance_Checklist.xlsx", size: "840 KB" },
];

export function SendEmailModal({
	open,
	onOpenChange,
	defaultTo = "",
	defaultCc = "",
}: SendEmailModalProps) {
	const [to, setTo] = useState(defaultTo);
	const [cc, setCc] = useState(defaultCc);
	const [subject, setSubject] = useState(
		"Stream update: documentation and timeline",
	);
	const [template, setTemplate] = useState<string>(templates[0] ?? "");
	const [body, setBody] = useState(defaultBody);

	useEffect(() => {
		if (!open) {
			setTo(defaultTo);
			setCc(defaultCc);
			setSubject("Stream update: documentation and timeline");
			setTemplate(templates[0] ?? "");
			setBody(defaultBody);
		}
	}, [defaultCc, defaultTo, open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover w-[min(92vw,880px)] max-w-none rounded-xl border-0 p-0">
				<DialogHeader className="flex flex-col gap-2 bg-surface-container-low px-6 py-5 text-left">
					<div className="flex items-center gap-2">
						<Mail aria-hidden className="text-primary" />
						<Badge variant="secondary" className="rounded-full">
							Client communication stage
						</Badge>
					</div>
					<DialogTitle className="font-display text-2xl font-semibold tracking-tight">
						Send Email
					</DialogTitle>
					<DialogDescription>
						Compose a client-facing update with templates, attachments, and
						secure delivery metadata.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 bg-surface-container-lowest px-6 py-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="email-to">To</Label>
							<Input
								id="email-to"
								value={to}
								onChange={(event) => setTo(event.target.value)}
								placeholder="client@company.com"
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="email-cc">CC</Label>
							<Input
								id="email-cc"
								value={cc}
								onChange={(event) => setCc(event.target.value)}
								placeholder="ops@secondstream.ai"
								className="bg-surface"
							/>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
						<div className="flex flex-col gap-2">
							<Label htmlFor="email-subject">Subject</Label>
							<Input
								id="email-subject"
								value={subject}
								onChange={(event) => setSubject(event.target.value)}
								className="bg-surface"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Template</Label>
							<Select value={template} onValueChange={setTemplate}>
								<SelectTrigger className="bg-surface">
									<SelectValue placeholder="Select a template" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{templates.map((item) => (
											<SelectItem key={item} value={item}>
												{item}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="email-body">Message</Label>
						<Textarea
							id="email-body"
							value={body}
							onChange={(event) => setBody(event.target.value)}
							className="min-h-52 bg-surface"
						/>
					</div>

					<div className="rounded-lg bg-surface p-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<p className="text-sm font-medium text-foreground">Attachments</p>
							<Button variant="secondary" type="button">
								<Paperclip data-icon="inline-start" aria-hidden />
								Attach files
							</Button>
						</div>
						<div className="mt-3 flex flex-col gap-2">
							{attachmentQueue.map((file) => (
								<div
									key={file.name}
									className="flex items-center justify-between rounded-md bg-surface-container-low px-3 py-2"
								>
									<p className="text-sm text-foreground">{file.name}</p>
									<p className="text-xs text-muted-foreground">{file.size}</p>
								</div>
							))}
						</div>
					</div>
				</div>

				<DialogFooter className="flex items-center justify-between bg-surface-container-low px-6 py-4 sm:flex-row">
					<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
						<Lock aria-hidden className="size-3.5" />
						TLS 1.3 secure
					</p>
					<div className="flex items-center gap-2">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button variant="secondary" type="button">
							Save as Draft
						</Button>
						<Button type="button">
							<Send data-icon="inline-start" aria-hidden />
							Send Message
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
