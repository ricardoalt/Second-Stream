"use client";

import {
	Bot,
	CheckCircle2,
	ClipboardPaste,
	FileText,
	Mic,
	Plus,
	Sparkles,
	Trash2,
	Upload,
	WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3 | 4;
type ClientMode = "existing" | "new";

type InputMethod = "upload" | "paste" | "voice" | "ai";

type StreamCandidate = {
	id: string;
	material: string;
	volume: string;
	frequency: string;
	unit: string;
	source: string;
};

type Message = {
	id: string;
	role: "assistant" | "agent";
	text: string;
};

type DiscoveryWizardModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const existingClients = [
	"Global Pharma Inc.",
	"Apex Manufacturing",
	"Titanium Tech Co.",
	"BioRefine Solutions",
];

const locations = [
	"Monterrey Plant",
	"Guadalajara Hub",
	"Querétaro Facility",
	"San Luis Potosí Line 3",
];

const inputMethodCards: Array<{
	value: InputMethod;
	label: string;
	description: string;
	icon: typeof Upload;
}> = [
	{
		value: "upload",
		label: "Upload Documents",
		description: "Drop SDS, COA, invoices, or spreadsheets",
		icon: Upload,
	},
	{
		value: "paste",
		label: "Quick Paste",
		description: "Paste notes, email threads, or manifests",
		icon: ClipboardPaste,
	},
	{
		value: "voice",
		label: "Voice Memo",
		description: "Capture observations in the field",
		icon: Mic,
	},
	{
		value: "ai",
		label: "AI Discovery",
		description: "Answer AI-guided intake questions",
		icon: Bot,
	},
];

const aiPrompts = [
	"What material did you identify and where?",
	"Do you know an estimated monthly volume?",
	"Any current disposal method or compliance risk?",
];

const mockStreamsByMethod: Record<InputMethod, StreamCandidate[]> = {
	upload: [
		{
			id: "s1",
			material: "Spent Isopropyl Alcohol",
			volume: "5,000",
			frequency: "Monthly",
			unit: "Gallons",
			source: "invoice_scan.pdf",
		},
		{
			id: "s2",
			material: "Mixed Hydrocarbons",
			volume: "12,450",
			frequency: "Quarterly",
			unit: "Gallons",
			source: "manifest_batch_7.pdf",
		},
	],
	paste: [
		{
			id: "s3",
			material: "Used Machine Oil",
			volume: "850",
			frequency: "Ad-hoc",
			unit: "Barrels",
			source: "Pasted notes",
		},
	],
	voice: [
		{
			id: "s4",
			material: "Nitric Acid Solution (40%)",
			volume: "2,200",
			frequency: "Bi-weekly",
			unit: "Gallons",
			source: "Voice memo",
		},
	],
	ai: [
		{
			id: "s5",
			material: "Aqueous Caustic Rinse",
			volume: "1,600",
			frequency: "Weekly",
			unit: "Gallons",
			source: "AI conversation",
		},
	],
};

const units = ["Gallons", "Liters", "Drums", "Barrels"];
const frequencies = ["Weekly", "Bi-weekly", "Monthly", "Quarterly", "Ad-hoc"];

function bytesToReadable(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fakeUploadFile(index: number): File {
	const name = `discovery-source-${index + 1}.pdf`;
	return new File(["mock"], name, {
		type: "application/pdf",
		lastModified: Date.now(),
	});
}

export function DiscoveryWizardModal({
	open,
	onOpenChange,
}: DiscoveryWizardModalProps) {
	const [step, setStep] = useState<WizardStep>(1);
	const [clientMode, setClientMode] = useState<ClientMode>("existing");
	const [selectedClient, setSelectedClient] = useState(
		existingClients[0] ?? "",
	);
	const [newClientName, setNewClientName] = useState("");
	const [selectedLocation, setSelectedLocation] = useState("");
	const [inputMethod, setInputMethod] = useState<InputMethod>("upload");
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
	const [quickPasteText, setQuickPasteText] = useState("");
	const [isRecording, setIsRecording] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "m0",
			role: "assistant",
			text: "Let’s discover this stream. Start with material name and source process.",
		},
	]);
	const [draftAiInput, setDraftAiInput] = useState("");
	const [processingProgress, setProcessingProgress] = useState(8);
	const [candidates, setCandidates] = useState<StreamCandidate[]>([]);
	const [success, setSuccess] = useState(false);

	const stepLabels = useMemo(
		() => ["Client + Method", "Data Input", "AI Review", "Confirmation"],
		[],
	);

	const activeClientName =
		clientMode === "existing" ? (selectedClient ?? "") : newClientName.trim();

	const canAdvanceStep1 =
		activeClientName.length > 0 &&
		inputMethodCards.some((method) => method.value === inputMethod);

	const canAdvanceStep2 = (() => {
		if (inputMethod === "upload") return uploadedFiles.length > 0;
		if (inputMethod === "paste") return quickPasteText.trim().length >= 20;
		if (inputMethod === "voice") return recordingSeconds > 0;
		return messages.some((message) => message.role === "agent");
	})();

	useEffect(() => {
		if (!open) {
			const timeout = setTimeout(() => {
				setStep(1);
				setClientMode("existing");
				setSelectedClient(existingClients[0] ?? "");
				setNewClientName("");
				setSelectedLocation("");
				setInputMethod("upload");
				setUploadedFiles([]);
				setQuickPasteText("");
				setIsRecording(false);
				setRecordingSeconds(0);
				setMessages([
					{
						id: "m0",
						role: "assistant",
						text: "Let’s discover this stream. Start with material name and source process.",
					},
				]);
				setDraftAiInput("");
				setProcessingProgress(8);
				setCandidates([]);
				setSuccess(false);
			}, 180);

			return () => clearTimeout(timeout);
		}

		return undefined;
	}, [open]);

	useEffect(() => {
		if (!open || !isRecording) return undefined;

		const interval = window.setInterval(() => {
			setRecordingSeconds((value) => value + 1);
		}, 1000);

		return () => window.clearInterval(interval);
	}, [open, isRecording]);

	useEffect(() => {
		if (!open || step !== 3) return undefined;

		setProcessingProgress(10);
		const interval = window.setInterval(() => {
			setProcessingProgress((value) => {
				if (value >= 92) return value;
				return value + 6;
			});
		}, 220);

		const timeout = window.setTimeout(() => {
			setCandidates(mockStreamsByMethod[inputMethod]);
			setProcessingProgress(100);
		}, 2400);

		return () => {
			window.clearInterval(interval);
			window.clearTimeout(timeout);
		};
	}, [open, step, inputMethod]);

	function next() {
		if (step === 1 && canAdvanceStep1) {
			setStep(2);
			return;
		}

		if (step === 2 && canAdvanceStep2) {
			setStep(3);
			return;
		}

		if (step === 3 && candidates.length > 0) {
			setStep(4);
		}
	}

	function back() {
		if (step > 1) setStep((current) => (current - 1) as WizardStep);
	}

	function addManualStream() {
		setCandidates((current) => [
			...current,
			{
				id: crypto.randomUUID(),
				material: "New stream",
				volume: "0",
				frequency: "Monthly",
				unit: "Gallons",
				source: "Manual",
			},
		]);
	}

	function updateCandidate(
		id: string,
		field: keyof Pick<
			StreamCandidate,
			"material" | "volume" | "frequency" | "unit"
		>,
		value: string,
	) {
		setCandidates((current) =>
			current.map((stream) =>
				stream.id === id ? { ...stream, [field]: value } : stream,
			),
		);
	}

	function removeCandidate(id: string) {
		setCandidates((current) => current.filter((stream) => stream.id !== id));
	}

	function submitAiMessage() {
		const trimmed = draftAiInput.trim();
		if (!trimmed) return;

		setMessages((current) => [
			...current,
			{ id: crypto.randomUUID(), role: "agent", text: trimmed },
			{
				id: crypto.randomUUID(),
				role: "assistant",
				text:
					aiPrompts[(current.length + 1) % aiPrompts.length] ??
					"Tell me more about the material.",
			},
		]);
		setDraftAiInput("");
	}

	const successStats = [
		{ label: "Waste Streams Found", value: String(candidates.length) },
		{ label: "Locations Identified", value: selectedLocation ? "1" : "2" },
		{
			label: "Sources Analyzed",
			value: String(Math.max(uploadedFiles.length, 1)),
		},
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-popover h-[90vh] w-[min(96vw,1120px)] max-w-none gap-0 overflow-hidden rounded-xl p-0">
				<DialogTitle className="sr-only">Unified Discovery Wizard</DialogTitle>
				<DialogDescription className="sr-only">
					Multi-step modal for field-agent discovery intake and stream
					confirmation.
				</DialogDescription>

				<div className="flex h-full flex-col bg-surface-container-lowest">
					<div className="flex flex-wrap items-start justify-between gap-4 bg-surface-container-low px-6 py-5">
						<div className="flex flex-col gap-1">
							<p className="font-display text-xl font-semibold tracking-tight text-foreground">
								Discovery Wizard
							</p>
							<p className="text-sm text-muted-foreground">
								Guide a new discovery from intake to confirmation.
							</p>
						</div>

						<div className="grid w-full gap-2 sm:w-auto sm:grid-cols-4">
							{stepLabels.map((label, index) => {
								const idx = index + 1;
								const complete = idx < step;
								const active = idx === step;

								return (
									<div
										key={label}
										className={cn(
											"flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5",
											active && "bg-surface-container-highest",
										)}
									>
										<Badge
											variant={complete || active ? "default" : "outline"}
											className="rounded-full"
										>
											{idx}
										</Badge>
										<span className="truncate text-xs text-muted-foreground">
											{label}
										</span>
									</div>
								);
							})}
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-6">
						{step === 1 && (
							<div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
								<Card className="bg-surface-container-highest shadow-sm">
									<CardHeader>
										<CardTitle className="font-display text-lg">
											Step 1 · Client Selection
										</CardTitle>
									</CardHeader>
									<CardContent className="flex flex-col gap-4">
										<Tabs
											value={clientMode}
											onValueChange={(value) =>
												setClientMode(value as ClientMode)
											}
										>
											<TabsList className="w-fit bg-surface-container-low">
												<TabsTrigger value="existing">
													Existing client
												</TabsTrigger>
												<TabsTrigger value="new">Create new</TabsTrigger>
											</TabsList>
										</Tabs>

										{clientMode === "existing" ? (
											<Select
												value={selectedClient}
												onValueChange={setSelectedClient}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select existing client" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{existingClients.map((client) => (
															<SelectItem key={client} value={client}>
																{client}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
										) : (
											<Input
												placeholder="New client name"
												value={newClientName}
												onChange={(event) =>
													setNewClientName(event.target.value)
												}
											/>
										)}

										<Select
											value={selectedLocation}
											onValueChange={setSelectedLocation}
										>
											<SelectTrigger>
												<SelectValue placeholder="Assign location (optional)" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{locations.map((location) => (
														<SelectItem key={location} value={location}>
															{location}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									</CardContent>
								</Card>

								<Card className="bg-surface-container-highest shadow-sm">
									<CardHeader>
										<CardTitle className="font-display text-lg">
											Step 1 · Input Method
										</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-3 sm:grid-cols-2">
										{inputMethodCards.map((method) => (
											<button
												key={method.value}
												type="button"
												onClick={() => setInputMethod(method.value)}
												className={cn(
													"flex flex-col items-start gap-2 rounded-lg bg-surface px-4 py-3 text-left transition-colors",
													inputMethod === method.value
														? "ring-2 ring-ring"
														: "hover:bg-surface-container-low",
												)}
											>
												<method.icon aria-hidden className="text-primary" />
												<p className="font-medium text-foreground">
													{method.label}
												</p>
												<p className="text-xs text-muted-foreground">
													{method.description}
												</p>
											</button>
										))}
									</CardContent>
								</Card>
							</div>
						)}

						{step === 2 && (
							<div className="flex flex-col gap-4">
								<div className="flex flex-wrap items-center gap-2">
									<Badge className="rounded-full">{activeClientName}</Badge>
									{selectedLocation ? (
										<Badge variant="secondary" className="rounded-full">
											{selectedLocation}
										</Badge>
									) : null}
									<Badge variant="outline" className="rounded-full">
										{
											inputMethodCards.find(
												(item) => item.value === inputMethod,
											)?.label
										}
									</Badge>
								</div>

								{inputMethod === "upload" && (
									<Card className="bg-surface-container-highest shadow-sm">
										<CardHeader>
											<CardTitle className="font-display text-lg">
												Upload Documents
											</CardTitle>
										</CardHeader>
										<CardContent className="flex flex-col gap-4">
											<div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface p-6 text-center">
												<Upload className="text-primary" />
												<p className="font-medium">
													Drag and drop discovery assets
												</p>
												<p className="text-xs text-muted-foreground">
													PDF, XLSX, EML, and images up to 25MB.
												</p>
												<Button
													variant="secondary"
													type="button"
													onClick={() =>
														setUploadedFiles((current) => [
															...current,
															fakeUploadFile(current.length),
														])
													}
												>
													<FileText data-icon="inline-start" aria-hidden />
													Add mock file
												</Button>
											</div>

											<div className="flex flex-col gap-2">
												{uploadedFiles.map((file) => (
													<div
														key={`${file.name}-${file.lastModified}`}
														className="flex items-center justify-between rounded-md bg-surface px-3 py-2"
													>
														<div className="flex min-w-0 items-center gap-2">
															<FileText className="text-muted-foreground" />
															<div className="min-w-0">
																<p className="truncate text-sm font-medium">
																	{file.name}
																</p>
																<p className="text-xs text-muted-foreground">
																	{bytesToReadable(file.size)}
																</p>
															</div>
														</div>
														<Button
															variant="ghost"
															size="icon-sm"
															type="button"
															onClick={() =>
																setUploadedFiles((current) =>
																	current.filter(
																		(candidate) => candidate !== file,
																	),
																)
															}
														>
															<Trash2 />
														</Button>
													</div>
												))}
											</div>
										</CardContent>
									</Card>
								)}

								{inputMethod === "paste" && (
									<Card className="bg-surface-container-highest shadow-sm">
										<CardHeader>
											<CardTitle className="font-display text-lg">
												Quick Paste
											</CardTitle>
										</CardHeader>
										<CardContent className="flex flex-col gap-3">
											<Textarea
												value={quickPasteText}
												onChange={(event) =>
													setQuickPasteText(event.target.value)
												}
												placeholder="Paste laboratory certificates, manifests, or supplier notes..."
												className="min-h-64 bg-surface"
											/>
											<p className="text-xs text-muted-foreground">
												AI extraction is enabled and will identify material,
												volume, and logistics clues.
											</p>
										</CardContent>
									</Card>
								)}

								{inputMethod === "voice" && (
									<Card className="bg-surface-container-highest shadow-sm">
										<CardHeader>
											<CardTitle className="font-display text-lg">
												Voice Memo
											</CardTitle>
										</CardHeader>
										<CardContent className="flex flex-col items-center gap-6 py-8">
											<Button
												type="button"
												size="icon-lg"
												onClick={() => setIsRecording((value) => !value)}
												className={cn(
													"size-20 rounded-full",
													isRecording && "animate-pulse",
												)}
											>
												<Mic />
											</Button>
											<div className="text-center">
												<p className="font-display text-4xl font-semibold tabular-nums">
													{String(Math.floor(recordingSeconds / 60)).padStart(
														2,
														"0",
													)}
													:{String(recordingSeconds % 60).padStart(2, "0")}
												</p>
												<p className="text-sm text-muted-foreground">
													{isRecording
														? "Recording waste stream characteristics..."
														: "Tap to start or pause recording"}
												</p>
											</div>
										</CardContent>
									</Card>
								)}

								{inputMethod === "ai" && (
									<Card className="bg-surface-container-highest shadow-sm">
										<CardHeader>
											<CardTitle className="font-display text-lg">
												AI Discovery Conversation
											</CardTitle>
										</CardHeader>
										<CardContent className="flex flex-col gap-3">
											<div className="max-h-72 overflow-y-auto rounded-md bg-surface p-3">
												<div className="flex flex-col gap-2">
													{messages.map((message) => (
														<div
															key={message.id}
															className={cn(
																"max-w-[90%] rounded-md px-3 py-2 text-sm",
																message.role === "assistant"
																	? "bg-surface-container-low"
																	: "ml-auto bg-primary text-primary-foreground",
															)}
														>
															{message.text}
														</div>
													))}
												</div>
											</div>
											<div className="flex gap-2">
												<Input
													value={draftAiInput}
													onChange={(event) =>
														setDraftAiInput(event.target.value)
													}
													placeholder="Type your response..."
													onKeyDown={(event) => {
														if (event.key === "Enter") {
															event.preventDefault();
															submitAiMessage();
														}
													}}
												/>
												<Button
													variant="secondary"
													type="button"
													onClick={submitAiMessage}
												>
													<WandSparkles data-icon="inline-start" aria-hidden />
													Send
												</Button>
											</div>
										</CardContent>
									</Card>
								)}
							</div>
						)}

						{step === 3 && (
							<div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
								<Card className="bg-surface-container-highest shadow-sm">
									<CardHeader>
										<CardTitle className="font-display text-lg">
											AI Processing
										</CardTitle>
									</CardHeader>
									<CardContent className="flex flex-col gap-4">
										<div className="flex items-center gap-2 text-muted-foreground">
											<Sparkles className="text-primary" />
											<p className="text-sm">
												Analyzing intake and extracting candidate streams...
											</p>
										</div>
										<Progress
											value={processingProgress}
											aria-label="AI processing progress"
										/>
										<p className="text-xs text-muted-foreground">
											{processingProgress < 100
												? "Building confidence scores and source mapping."
												: "Analysis complete. Review extracted streams."}
										</p>
									</CardContent>
								</Card>

								<Card className="bg-surface-container-highest shadow-sm">
									<CardHeader>
										<CardTitle className="font-display text-lg">
											Extracted Preview
										</CardTitle>
									</CardHeader>
									<CardContent className="flex flex-col gap-2">
										{candidates.length === 0 ? (
											<div className="rounded-md bg-surface px-3 py-8 text-center text-sm text-muted-foreground">
												Waiting for extraction output...
											</div>
										) : (
											candidates.map((stream) => (
												<div
													key={stream.id}
													className="flex items-center justify-between rounded-md bg-surface px-3 py-2"
												>
													<div className="min-w-0">
														<p className="truncate text-sm font-medium">
															{stream.material}
														</p>
														<p className="text-xs text-muted-foreground">
															{stream.volume} {stream.unit} · {stream.frequency}
														</p>
													</div>
													<Badge variant="secondary" className="rounded-full">
														{stream.source}
													</Badge>
												</div>
											))
										)}
									</CardContent>
								</Card>
							</div>
						)}

						{step === 4 && (
							<div className="flex flex-col gap-4">
								{success ? (
									<Card className="bg-surface-container-highest shadow-sm">
										<CardContent className="flex flex-col items-center gap-5 py-10">
											<div className="rounded-full bg-primary/10 p-3">
												<CheckCircle2 className="text-primary" />
											</div>
											<div className="text-center">
												<p className="font-display text-2xl font-semibold tracking-tight">
													Complete Discovery
												</p>
												<p className="text-sm text-muted-foreground">
													Draft streams were created and are ready for
													assessment.
												</p>
											</div>
											<div className="grid w-full gap-3 sm:grid-cols-3">
												{successStats.map((stat) => (
													<div
														key={stat.label}
														className="rounded-lg bg-surface px-3 py-3 text-center"
													>
														<p className="font-display text-2xl font-semibold">
															{stat.value}
														</p>
														<p className="text-xs text-muted-foreground">
															{stat.label}
														</p>
													</div>
												))}
											</div>
											<div className="flex flex-wrap justify-center gap-2">
												<Button
													variant="secondary"
													onClick={() => onOpenChange(false)}
												>
													Go to Drafts
												</Button>
												<Button onClick={() => onOpenChange(false)}>
													Start Assessment
												</Button>
											</div>
										</CardContent>
									</Card>
								) : (
									<>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<p className="font-display text-lg font-semibold">
												Confirm Identified Streams
											</p>
											<Button
												variant="secondary"
												type="button"
												onClick={addManualStream}
											>
												<Plus data-icon="inline-start" aria-hidden />
												Add stream
											</Button>
										</div>

										<div className="flex flex-col gap-2">
											{candidates.map((stream) => (
												<Card
													key={stream.id}
													className="bg-surface-container-highest shadow-sm"
												>
													<CardContent className="grid gap-3 p-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] lg:items-center">
														<Input
															value={stream.material}
															onChange={(event) =>
																updateCandidate(
																	stream.id,
																	"material",
																	event.target.value,
																)
															}
														/>
														<Input
															value={stream.volume}
															onChange={(event) =>
																updateCandidate(
																	stream.id,
																	"volume",
																	event.target.value,
																)
															}
														/>
														<Select
															value={stream.frequency}
															onValueChange={(value) =>
																updateCandidate(stream.id, "frequency", value)
															}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectGroup>
																	{frequencies.map((frequency) => (
																		<SelectItem
																			key={frequency}
																			value={frequency}
																		>
																			{frequency}
																		</SelectItem>
																	))}
																</SelectGroup>
															</SelectContent>
														</Select>
														<Select
															value={stream.unit}
															onValueChange={(value) =>
																updateCandidate(stream.id, "unit", value)
															}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectGroup>
																	{units.map((unit) => (
																		<SelectItem key={unit} value={unit}>
																			{unit}
																		</SelectItem>
																	))}
																</SelectGroup>
															</SelectContent>
														</Select>
														<Button
															variant="ghost"
															type="button"
															onClick={() => removeCandidate(stream.id)}
														>
															<Trash2 data-icon="inline-start" aria-hidden />
															Remove
														</Button>
													</CardContent>
												</Card>
											))}
										</div>
									</>
								)}
							</div>
						)}
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low px-6 py-4">
						<div className="text-xs text-muted-foreground">
							{step < 4
								? "All data in this flow is mock/static for frontend validation."
								: `${candidates.length} stream${candidates.length === 1 ? "" : "s"} ready`}
						</div>

						<div className="flex items-center gap-2">
							<Button variant="ghost" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							{step > 1 && !success ? (
								<Button variant="secondary" onClick={back}>
									Back
								</Button>
							) : null}

							{step < 4 ? (
								<Button
									onClick={next}
									disabled={
										(step === 1 && !canAdvanceStep1) ||
										(step === 2 && !canAdvanceStep2) ||
										(step === 3 && candidates.length === 0)
									}
								>
									{step === 3 ? "Continue to confirmation" : "Continue"}
								</Button>
							) : success ? null : (
								<Button
									onClick={() => setSuccess(true)}
									disabled={candidates.length === 0}
								>
									Confirm and create
								</Button>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
