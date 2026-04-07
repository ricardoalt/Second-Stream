"use client";

import {
	Building2,
	Check,
	CheckCircle2,
	ChevronsUpDown,
	FileSpreadsheet,
	FileText,
	Image,
	Loader2,
	MapPin,
	Mic,
	Package,
	Plus,
	Truck,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CreateLocationDialog } from "@/components/features/locations/create-location-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { CompanyCombobox } from "@/components/ui/company-combobox";
import { LocationCombobox } from "@/components/ui/location-combobox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { organizationsAPI } from "@/lib/api/organizations";
import { projectsAPI } from "@/lib/api/projects";
import { useAuth } from "@/lib/contexts";
import { useLocationStore } from "@/lib/stores/location-store";
import type { User } from "@/lib/types/user";
import { cn } from "@/lib/utils";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const MIN_DISCOVERY_TEXT_LENGTH = 20;
const ACCEPTED_FILE_TYPES =
	".pdf,.csv,.xlsx,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp";
const ACCEPTED_AUDIO_TYPES = ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4";
const ACCEPTED_FILE_EXTENSIONS = new Set([
	".pdf",
	".csv",
	".xlsx",
	".doc",
	".docx",
	".txt",
	".png",
	".jpg",
	".jpeg",
	".webp",
]);
const ACCEPTED_FILE_MIME_TYPES = new Set([
	"application/pdf",
	"text/csv",
	"application/csv",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"text/plain",
	"image/png",
	"image/jpeg",
	"image/webp",
]);
const ACCEPTED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"]);
const ACCEPTED_AUDIO_MIME_TYPES = new Set([
	"audio/mpeg",
	"audio/mp3",
	"audio/wav",
	"audio/x-wav",
	"audio/wave",
	"audio/mp4",
	"audio/x-m4a",
	"audio/m4a",
]);
const VOICE_WAVE_BARS = [
	{ id: "bar-1", height: 3 },
	{ id: "bar-2", height: 5 },
	{ id: "bar-3", height: 2 },
	{ id: "bar-4", height: 6 },
	{ id: "bar-5", height: 4 },
	{ id: "bar-6", height: 3 },
	{ id: "bar-7", height: 5 },
] as const;

export function canShowAssignOwnerControl(params: {
	isOrgAdmin: boolean;
	isSuperAdmin: boolean;
}): boolean {
	return params.isOrgAdmin || params.isSuperAdmin;
}

export function filterAssignableOwners(
	users: User[],
	currentUserId?: string,
): User[] {
	return users.filter(
		(candidate) =>
			candidate.isActive &&
			(candidate.role === "org_admin" || candidate.role === "field_agent") &&
			candidate.id !== currentUserId,
	);
}

export function formatAssignableOwnerRoleLabel(role: User["role"]): string {
	if (role === "org_admin") {
		return "Org Admin";
	}
	if (role === "field_agent") {
		return "Field Agent";
	}
	return role
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export function resolveAssignedOwnerUserId(
	selectedOwnerUserId?: string,
): string | undefined {
	if (!selectedOwnerUserId || selectedOwnerUserId === "self") {
		return undefined;
	}
	return selectedOwnerUserId;
}

function getAssignableOwnerSearchText(owner: User): string {
	return [owner.firstName, owner.lastName, owner.email]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

function OwnerOptionContent({
	owner,
	showEmail = false,
}: {
	owner: User;
	showEmail?: boolean;
}) {
	return (
		<div className="flex min-w-0 items-center gap-2">
			<div className="min-w-0">
				<div className="truncate">
					{owner.firstName} {owner.lastName}
				</div>
				{showEmail ? (
					<div className="truncate text-xs text-muted-foreground">
						{owner.email}
					</div>
				) : null}
			</div>
			<Badge
				variant="outline"
				className="ml-auto shrink-0 px-1.5 py-0 text-[10px]"
			>
				{formatAssignableOwnerRoleLabel(owner.role)}
			</Badge>
		</div>
	);
}

function AssignOwnerCombobox({
	owners,
	selectedOwnerUserId,
	onOwnerChange,
}: {
	owners: User[];
	selectedOwnerUserId: string;
	onOwnerChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const selectedOwner = owners.find(
		(owner) => owner.id === selectedOwnerUserId,
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"h-10 w-full justify-between bg-surface-container-low/60 px-3 font-normal",
						!selectedOwner && "text-muted-foreground",
					)}
				>
					{selectedOwner ? (
						<OwnerOptionContent owner={selectedOwner} />
					) : (
						<span className="truncate">Assign Owner</span>
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search owner by name or email..." />
					<CommandList>
						<CommandEmpty>No matching owners found.</CommandEmpty>
						<CommandGroup>
							{owners.map((owner) => (
								<CommandItem
									key={owner.id}
									value={getAssignableOwnerSearchText(owner)}
									onSelect={() => {
										onOwnerChange(
											owner.id === selectedOwnerUserId ? "" : owner.id,
										);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4 shrink-0",
											selectedOwnerUserId === owner.id
												? "opacity-100"
												: "opacity-0",
										)}
									/>
									<OwnerOptionContent owner={owner} showEmail />
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

function fileIcon(name: string) {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (["xlsx", "xls", "csv"].includes(ext)) return FileSpreadsheet;
	if (["png", "jpg", "jpeg", "webp"].includes(ext)) return Image;
	return FileText;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(name: string): string {
	const lastDot = name.lastIndexOf(".");
	if (lastDot < 0) return "";
	return name.slice(lastDot).toLowerCase();
}

function isSupportedDocumentFile(file: File): boolean {
	const extension = fileExtension(file.name);
	if (!ACCEPTED_FILE_EXTENSIONS.has(extension)) {
		return false;
	}
	if (!file.type) {
		return true;
	}
	return ACCEPTED_FILE_MIME_TYPES.has(file.type.toLowerCase());
}

function isAudioCandidate(file: File): boolean {
	const extension = fileExtension(file.name);
	if (ACCEPTED_AUDIO_EXTENSIONS.has(extension)) {
		return true;
	}
	return file.type.toLowerCase().startsWith("audio/");
}

function isSupportedAudioFile(file: File): boolean {
	const extension = fileExtension(file.name);
	if (!ACCEPTED_AUDIO_EXTENSIONS.has(extension)) {
		return false;
	}
	if (!file.type) {
		return true;
	}
	return ACCEPTED_AUDIO_MIME_TYPES.has(file.type.toLowerCase());
}

function canStartDiscovery(params: {
	companyId: string;
	locationId: string;
	filesCount: number;
	hasAudio: boolean;
	hasValidTextSource: boolean;
}): boolean {
	const { companyId, locationId, filesCount, hasAudio, hasValidTextSource } =
		params;
	return (
		companyId !== "" &&
		locationId !== "" &&
		(filesCount > 0 || hasAudio || hasValidTextSource)
	);
}

export function getDiscoveryBlockedReason(params: {
	companyId: string;
	locationId: string;
	filesCount: number;
	hasAudio: boolean;
	hasValidTextSource: boolean;
}): string | null {
	const { companyId, locationId, filesCount, hasAudio, hasValidTextSource } =
		params;

	if (!companyId) {
		return "Select a client to continue.";
	}
	if (!locationId) {
		return "Select a default location to enable discovery.";
	}
	if (!(filesCount > 0 || hasAudio || hasValidTextSource)) {
		return "Add a file, voice note, or at least 20 characters of notes.";
	}

	return null;
}

export function resolveDiscoveryAutoLocation(params: {
	currentLocationId: string;
	availableLocationIds: string[];
}): string {
	const { currentLocationId, availableLocationIds } = params;
	if (currentLocationId) {
		return currentLocationId;
	}
	return availableLocationIds.length === 1
		? (availableLocationIds[0] ?? "")
		: "";
}

function canSaveQuickEntry(params: {
	clientId: string;
	locationId: string;
	material: string;
	volume: string;
	units: string;
	frequency: string;
	isSaving: boolean;
}): boolean {
	const { clientId, locationId, material, volume, units, frequency, isSaving } =
		params;
	return (
		clientId.trim().length > 0 &&
		locationId.trim().length > 0 &&
		material.trim().length > 0 &&
		volume.trim().length > 0 &&
		units.trim().length > 0 &&
		frequency.trim().length > 0 &&
		!isSaving
	);
}

export interface IdleDiscoveryPayload {
	companyId: string;
	locationId: string;
	assignedOwnerUserId: string | null;
	files: File[];
	audioFile: File | null;
	text: string;
}

export function IdleView({
	open,
	phase,
	defaultCompanyId,
	defaultText,
	onDiscover,
	onClose,
}: {
	open: boolean;
	phase: "idle" | "submitting";
	defaultCompanyId?: string;
	defaultText?: string;
	onDiscover: (payload: IdleDiscoveryPayload) => Promise<void> | void;
	onClose: () => void;
}) {
	const [wizardTab, setWizardTab] = useState<"ai" | "quick">("ai");
	const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
	const [locationId, setLocationId] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const [audioFile, setAudioFile] = useState<File | null>(null);
	const [text, setText] = useState("");
	const [dragActive, setDragActive] = useState(false);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const audioInputRef = useRef<HTMLInputElement | null>(null);
	const dragCounterRef = useRef(0);

	const [qe, setQe] = useState({
		client: "",
		locationId: "",
		material: "",
		volume: "",
		units: "Gallons",
		frequency: "Weekly",
	});
	const [quickEntryError, setQuickEntryError] = useState<string | null>(null);
	const [isSavingQuickEntry, setIsSavingQuickEntry] = useState(false);
	const [assignableOwners, setAssignableOwners] = useState<User[]>([]);
	const [selectedOwnerUserId, setSelectedOwnerUserId] = useState<string>("");
	const { locations, loadLocationsByCompany } = useLocationStore();
	const { user, isOrgAdmin, isSuperAdmin } = useAuth();
	const canAssignOwner = canShowAssignOwnerControl({
		isOrgAdmin,
		isSuperAdmin,
	});

	const hasAttachments = files.length > 0 || audioFile !== null;
	const isSubmitting = phase === "submitting";
	const trimmedText = text.trim();
	const hasValidTextSource = trimmedText.length >= MIN_DISCOVERY_TEXT_LENGTH;
	const canDiscover = canStartDiscovery({
		companyId,
		locationId,
		filesCount: files.length,
		hasAudio: audioFile !== null,
		hasValidTextSource,
	});
	const blockedDiscoveryReason = getDiscoveryBlockedReason({
		companyId,
		locationId,
		filesCount: files.length,
		hasAudio: audioFile !== null,
		hasValidTextSource,
	});

	useEffect(() => {
		if (open && defaultCompanyId) {
			setCompanyId(defaultCompanyId);
			setLocationId("");
		}
	}, [open, defaultCompanyId]);

	useEffect(() => {
		if (!open) {
			const timeout = setTimeout(() => {
				setWizardTab("ai");
				setCompanyId(defaultCompanyId ?? "");
				setLocationId("");
				setFiles([]);
				setAudioFile(null);
				setText("");
				setDragActive(false);
				dragCounterRef.current = 0;
				setQuickEntryError(null);
				setSelectedOwnerUserId("");
				setQe({
					client: "",
					locationId: "",
					material: "",
					volume: "",
					units: "Gallons",
					frequency: "Weekly",
				});
			}, 200);
			return () => clearTimeout(timeout);
		}
		return undefined;
	}, [open, defaultCompanyId]);

	useEffect(() => {
		if (!open || !canAssignOwner) {
			setAssignableOwners([]);
			return;
		}

		let cancelled = false;
		void organizationsAPI
			.listMyOrgUsers()
			.then((users) => {
				if (cancelled) return;
				const filteredOwners = filterAssignableOwners(users, user?.id);
				setAssignableOwners(filteredOwners);
			})
			.catch(() => {
				if (!cancelled) {
					setAssignableOwners([]);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [open, canAssignOwner, user?.id]);

	useEffect(() => {
		if (
			selectedOwnerUserId &&
			!assignableOwners.some((owner) => owner.id === selectedOwnerUserId)
		) {
			setSelectedOwnerUserId("");
		}
	}, [selectedOwnerUserId, assignableOwners]);

	useEffect(() => {
		if (!open) return;
		if (defaultText && defaultText.trim().length > 0) {
			setText(defaultText);
		}
	}, [open, defaultText]);

	useEffect(() => {
		if (qe.client) {
			void loadLocationsByCompany(qe.client);
		}
	}, [qe.client, loadLocationsByCompany]);

	useEffect(() => {
		if (companyId) {
			void loadLocationsByCompany(companyId);
		}
	}, [companyId, loadLocationsByCompany]);

	useEffect(() => {
		if (!companyId || locations.length === 0) return;
		const companyLocationIds = new Set(
			locations.filter((l) => l.companyId === companyId).map((l) => l.id),
		);
		if (locationId && !companyLocationIds.has(locationId)) {
			setLocationId("");
			return;
		}

		const suggestedLocationId = resolveDiscoveryAutoLocation({
			currentLocationId: locationId,
			availableLocationIds: Array.from(companyLocationIds),
		});
		if (suggestedLocationId && suggestedLocationId !== locationId) {
			setLocationId(suggestedLocationId);
		}
	}, [companyId, locationId, locations]);

	useEffect(() => {
		if (!qe.client || locations.length === 0) return;
		const companyLocationIds = new Set(
			locations.filter((l) => l.companyId === qe.client).map((l) => l.id),
		);
		if (qe.locationId && !companyLocationIds.has(qe.locationId)) {
			setQe((prev) => ({ ...prev, locationId: "" }));
		}
	}, [qe.client, qe.locationId, locations]);

	const quickEntryLocations = locations.filter(
		(location) => location.companyId === qe.client,
	);
	const aiLocations = locations.filter(
		(location) => location.companyId === companyId,
	);
	const canSaveQuickEntryDraft = canSaveQuickEntry({
		clientId: qe.client,
		locationId: qe.locationId,
		material: qe.material,
		volume: qe.volume,
		units: qe.units,
		frequency: qe.frequency,
		isSaving: isSavingQuickEntry,
	});
	const resolvedAssignedOwnerUserId =
		resolveAssignedOwnerUserId(selectedOwnerUserId) ?? null;

	const validateAndAddFiles = useCallback(
		(incoming: File[]) => {
			const remaining = MAX_FILES - files.length;
			if (remaining <= 0) {
				toast.error(`Maximum ${MAX_FILES} files allowed`);
				return;
			}

			const toAdd: File[] = [];
			for (const file of incoming.slice(0, remaining)) {
				if (!isSupportedDocumentFile(file)) {
					toast.error(`${file.name} is not a supported file type`);
					continue;
				}
				if (file.size > MAX_FILE_SIZE) {
					toast.error(`${file.name} exceeds 10 MB limit`);
					continue;
				}
				toAdd.push(file);
			}

			if (incoming.length > remaining) {
				toast.error(
					`Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed`,
				);
			}

			if (toAdd.length > 0) {
				setFiles((prev) => [...prev, ...toAdd]);
			}
		},
		[files.length],
	);

	const validateAndSetAudio = useCallback((file: File) => {
		if (!isSupportedAudioFile(file)) {
			toast.error("Audio must be mp3, wav, or m4a");
			return;
		}
		if (file.size > MAX_AUDIO_SIZE) {
			toast.error("Audio file exceeds 25 MB limit");
			return;
		}
		setAudioFile(file);
	}, []);

	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (isSubmitting) return;
			dragCounterRef.current++;
			if (e.dataTransfer.types.includes("Files")) setDragActive(true);
		},
		[isSubmitting],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current--;
		if (dragCounterRef.current === 0) setDragActive(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDragActive(false);
			dragCounterRef.current = 0;
			if (isSubmitting) return;

			const droppedFiles = Array.from(e.dataTransfer.files);
			if (droppedFiles.length === 0) return;

			const audioCandidates = droppedFiles.filter(isAudioCandidate);
			const nonAudio = droppedFiles.filter((f) => !isAudioCandidate(f));

			if (audioCandidates.length > 0) {
				const [firstAudio] = audioCandidates;
				if (audioFile) {
					toast.error("Only one audio file is allowed");
				} else if (firstAudio) {
					validateAndSetAudio(firstAudio);
				}
				if (audioCandidates.length > 1) {
					toast.error("Only one audio file is allowed");
				}
			}
			if (nonAudio.length > 0) {
				validateAndAddFiles(nonAudio);
			}
		},
		[isSubmitting, audioFile, validateAndAddFiles, validateAndSetAudio],
	);

	const removeFile = useCallback((index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const removeAudio = useCallback(() => {
		setAudioFile(null);
		if (audioInputRef.current) audioInputRef.current.value = "";
	}, []);

	const resetQuickEntry = useCallback(() => {
		setQuickEntryError(null);
		setQe({
			client: "",
			locationId: "",
			material: "",
			volume: "",
			units: "Gallons",
			frequency: "Weekly",
		});
	}, []);

	const handleQuickEntrySave = useCallback(async () => {
		if (
			!qe.client ||
			!qe.material.trim() ||
			!qe.volume.trim() ||
			!qe.units.trim() ||
			!qe.frequency.trim()
		) {
			return;
		}

		if (!qe.locationId) {
			setQuickEntryError("Select a Location before saving");
			return;
		}

		setQuickEntryError(null);
		setIsSavingQuickEntry(true);

		try {
			await projectsAPI.createProject({
				locationId: qe.locationId,
				name: qe.material.trim(),
				...(resolvedAssignedOwnerUserId
					? { ownerUserId: resolvedAssignedOwnerUserId }
					: {}),
			});
			toast.success("Waste stream created");
			resetQuickEntry();
			onClose();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create stream",
			);
		} finally {
			setIsSavingQuickEntry(false);
		}
	}, [
		onClose,
		qe.client,
		qe.frequency,
		qe.locationId,
		qe.material,
		qe.units,
		qe.volume,
		resolvedAssignedOwnerUserId,
		resetQuickEntry,
	]);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="relative overflow-hidden px-8 pt-5 pb-3 shrink-0">
				<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-container" />
				<h2 className="font-display text-xl font-semibold tracking-tight">
					Discovery Wizard
				</h2>
				<p className="text-sm text-muted-foreground/80 mt-1">
					Select a method to identify and ingest waste stream data
				</p>
				<div className="mt-3 flex gap-0">
					<button
						type="button"
						onClick={() => setWizardTab("ai")}
						className={cn(
							"px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] border-b-2 transition-all",
							wizardTab === "ai"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border/40",
						)}
					>
						AI Discovery
					</button>
					<button
						type="button"
						onClick={() => setWizardTab("quick")}
						className={cn(
							"px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] border-b-2 transition-all",
							wizardTab === "quick"
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground hover:border-border/40",
						)}
					>
						Quick Entry
					</button>
				</div>
			</div>

			{wizardTab === "quick" ? (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="min-h-0 flex-1 overflow-auto overscroll-contain px-5 py-4 sm:px-8 sm:py-5">
						<div className="mx-auto w-full space-y-5">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<section className="rounded-xl bg-surface-container-lowest/80 p-6 border border-border/15">
									<div className="flex items-center gap-3 mb-5">
										<div className="p-2.5 bg-primary/10 rounded-lg">
											<Building2 className="size-5 text-primary" />
										</div>
										<h3 className="text-base font-semibold text-foreground">
											Material Identity
										</h3>
									</div>
									<div className="space-y-5">
										<div>
											<span className="mb-3 block text-xs font-semibold uppercase tracking-[0.08em] text-primary">
												Client Selection
											</span>
											<CompanyCombobox
												value={qe.client}
												onValueChange={(value) => {
													setQuickEntryError(null);
													setQe({ ...qe, client: value, locationId: "" });
												}}
												placeholder="Select an existing client..."
												showCreate
											/>
										</div>
										<div>
											<span className="mb-3 block text-xs font-semibold uppercase tracking-[0.08em] text-primary">
												Material / Stream Name
											</span>
											<input
												type="text"
												placeholder="e.g. Toluene"
												value={qe.material}
												onChange={(event) =>
													setQe({ ...qe, material: event.target.value })
												}
												className="w-full rounded-lg bg-surface-container-low/60 px-3 py-2.5 text-sm border border-input placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
											/>
										</div>
									</div>
								</section>

								<section className="rounded-xl bg-surface-container-lowest/80 p-6 border border-border/15">
									<div className="flex items-center gap-3 mb-5">
										<div className="p-2.5 bg-primary/10 rounded-lg">
											<Truck className="size-5 text-primary" />
										</div>
										<h3 className="text-base font-semibold text-foreground">
											Logistics & Volume
										</h3>
									</div>
									<div className="space-y-5">
										<div>
											<span className="mb-3 block text-xs font-semibold uppercase tracking-[0.08em] text-primary">
												Primary Location
											</span>
											<LocationCombobox
												companyId={qe.client}
												value={qe.locationId}
												onValueChange={(value) => {
													setQuickEntryError(null);
													setQe({ ...qe, locationId: value });
												}}
												placeholder="City, State"
												className="h-12"
											/>
											{qe.client && quickEntryLocations.length === 0 ? (
												<div className="text-xs text-muted-foreground mt-2">
													No locations —{" "}
													<CreateLocationDialog
														companyId={qe.client}
														onSuccess={(location) => {
															if (!location) return;
															void loadLocationsByCompany(qe.client);
															setQe({ ...qe, locationId: location.id });
														}}
														trigger={
															<button
																type="button"
																className="font-medium text-primary hover:underline"
															>
																Add New Location
															</button>
														}
													/>
												</div>
											) : null}
										</div>
										<div>
											<span className="mb-3 block text-xs font-semibold uppercase tracking-[0.08em] text-primary">
												Volume / Weight
											</span>
											<div className="grid grid-cols-[1fr_auto] gap-2">
												<input
													type="text"
													placeholder="5,000"
													value={qe.volume}
													onChange={(event) =>
														setQe({ ...qe, volume: event.target.value })
													}
													className="w-full rounded-lg bg-surface-container-low/60 px-3 py-2.5 text-sm border border-input placeholder:text-muted-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
												/>
												<select
													value={qe.units}
													onChange={(event) =>
														setQe({ ...qe, units: event.target.value })
													}
													className="rounded-lg bg-surface-container-lowest px-3 py-3 text-sm border border-input focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 min-w-[100px]"
												>
													<option>Gallons</option>
													<option>Tons</option>
													<option>Barrels</option>
													<option>Pounds</option>
												</select>
											</div>
										</div>
										<div>
											<span className="mb-3 block text-xs font-semibold uppercase tracking-[0.08em] text-primary">
												Frequency
											</span>
											<select
												value={qe.frequency}
												onChange={(event) =>
													setQe({ ...qe, frequency: event.target.value })
												}
												className="w-full rounded-lg bg-surface-container-lowest px-3 py-3 text-sm border border-input focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
											>
												<option>Weekly</option>
												<option>Bi-Weekly</option>
												<option>Monthly</option>
												<option>Quarterly</option>
												<option>Ad-hoc</option>
											</select>
										</div>
									</div>
								</section>
							</div>
							{canAssignOwner ? (
								<section className="rounded-xl bg-surface-container-lowest/80 p-6 border border-border/15">
									<div className="space-y-3">
										<span className="block text-xs font-semibold uppercase tracking-[0.08em] text-primary">
											Assign Owner
										</span>
										<AssignOwnerCombobox
											owners={assignableOwners}
											selectedOwnerUserId={selectedOwnerUserId}
											onOwnerChange={setSelectedOwnerUserId}
										/>
									</div>
								</section>
							) : null}
							<div className="flex flex-col gap-3 rounded-lg border-l-4 border-l-primary bg-primary/[0.04] px-5 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
								<span className="text-sm font-semibold text-primary uppercase tracking-wide">
									Entry Guidelines:
								</span>
								<div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
									<span className="flex items-center gap-2">
										<CheckCircle2 className="size-4 text-success" />
										Ensure MSDS are available.
									</span>
									<span className="flex items-center gap-2">
										<CheckCircle2 className="size-4 text-success" />
										Verify packaging compatibility.
									</span>
								</div>
							</div>
						</div>
					</div>
					<div className="shrink-0 border-t border-border/20 bg-surface-container-low/60 px-5 py-4 sm:px-8">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<button
								type="button"
								onClick={resetQuickEntry}
								className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground transition-colors"
							>
								Clear All
							</button>
							<div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
								{quickEntryError && (
									<p className="w-full text-xs text-destructive sm:mr-1 sm:w-auto">
										{quickEntryError}
									</p>
								)}
								<Button
									variant="ghost"
									onClick={() => {
										setQuickEntryError(null);
										setWizardTab("ai");
									}}
								>
									Cancel
								</Button>
								<Button
									onClick={handleQuickEntrySave}
									disabled={!canSaveQuickEntryDraft}
									className="btn-primary-solid min-w-[130px] font-semibold uppercase tracking-wider"
								>
									{isSavingQuickEntry ? "Saving…" : "Save Stream"}
								</Button>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="min-h-0 flex-1 overflow-auto overscroll-contain px-5 py-4 sm:px-8 sm:py-5">
						<div className="mx-auto w-full space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<section className="rounded-xl bg-surface-container-lowest/80 p-5 border border-border/15">
									<div className="mb-3 flex items-center gap-3">
										<div className="p-2.5 bg-primary/10 rounded-lg">
											<Building2 className="size-5 text-primary" />
										</div>
										<h3 className="text-base font-semibold text-foreground">
											Client Information
										</h3>
									</div>
									{defaultCompanyId ? (
										<div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
											<Package className="size-4 text-muted-foreground" />
											Company pre-selected
										</div>
									) : (
										<CompanyCombobox
											value={companyId}
											onValueChange={(value) => {
												setCompanyId(value);
												setLocationId("");
											}}
											placeholder="Select Existing Client"
											showCreate={true}
										/>
									)}
								</section>

								<section className="rounded-xl bg-surface-container-lowest/80 p-5 border border-border/15">
									<div className="flex items-center gap-3 mb-3">
										<div className="p-2.5 bg-primary/10 rounded-lg">
											<MapPin className="size-5 text-primary" />
										</div>
										<h3 className="text-base font-semibold text-foreground">
											Assign Default Location
										</h3>
									</div>
									<div className="space-y-2">
										<LocationCombobox
											companyId={companyId}
											value={locationId}
											onValueChange={setLocationId}
											placeholder={
												companyId
													? "e.g. Houston Facility, TX"
													: "Select Client first"
											}
											className="h-10"
										/>
										{companyId && aiLocations.length === 0 ? (
											<div className="text-xs text-muted-foreground">
												No locations —{" "}
												<CreateLocationDialog
													companyId={companyId}
													onSuccess={(location) => {
														if (!location) return;
														void loadLocationsByCompany(companyId);
														setLocationId(location.id);
													}}
													trigger={
														<button
															type="button"
															className="font-medium text-primary hover:underline"
														>
															Add New Location
														</button>
													}
												/>
											</div>
										) : null}
									</div>
									<p className="mt-1.5 text-xs text-muted-foreground">
										Select a location before upload/analysis.
									</p>
								</section>
							</div>

							<section className="rounded-xl bg-surface-container-lowest/80 p-5 border border-border/15">
								<div className="flex items-center gap-3 mb-3">
									<div className="p-2.5 bg-primary/10 rounded-lg">
										<Upload className="size-5 text-primary" />
									</div>
									<h3 className="text-base font-semibold text-foreground">
										Upload Client Files
									</h3>
								</div>
								<section
									aria-label={
										dragActive ? "Drop files here" : "File upload area"
									}
									className={cn(
										"relative rounded-xl border-2 border-dashed transition-all duration-300",
										dragActive
											? "border-primary/50 bg-primary/[0.08] shadow-glow ring-2 ring-primary/20"
											: "border-primary/20 bg-surface-container-low/40",
									)}
									onDragEnter={handleDragEnter}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
								>
									{hasAttachments ? (
										<div className="space-y-3 p-4">
											<div className="flex flex-wrap gap-2">
												{files.map((file, index) => {
													const Icon = fileIcon(file.name);
													return (
														<div
															key={`${file.name}-${file.size}`}
															className="group/chip flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-2 text-sm shadow-sm transition-all hover:border-border/60 hover:shadow-md"
														>
															<Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
															<span className="max-w-[140px] truncate">
																{file.name}
															</span>
															<span className="text-xs text-muted-foreground">
																{formatSize(file.size)}
															</span>
															<button
																type="button"
																aria-label={`Remove ${file.name}`}
																onClick={() => removeFile(index)}
																className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-sm hover:bg-muted transition-opacity"
															>
																<X className="h-3 w-3" />
															</button>
														</div>
													);
												})}
												{audioFile && (
													<div className="group/chip flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-sm shadow-sm">
														<Mic className="h-3.5 w-3.5 shrink-0 text-primary" />
														<span className="max-w-[140px] truncate">
															{audioFile.name}
														</span>
														<span className="text-xs text-muted-foreground">
															{formatSize(audioFile.size)}
														</span>
														<button
															type="button"
															aria-label={`Remove ${audioFile.name}`}
															onClick={removeAudio}
															className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-sm hover:bg-muted transition-opacity"
														>
															<X className="h-3 w-3" />
														</button>
													</div>
												)}
												{files.length < MAX_FILES && (
													<Button
														variant="outline"
														size="icon"
														className="h-9 w-9 border-dashed"
														onClick={() => fileInputRef.current?.click()}
														disabled={isSubmitting}
													>
														<Plus className="h-4 w-4" />
														<span className="sr-only">Add files</span>
													</Button>
												)}
											</div>
										</div>
									) : (
										<button
											type="button"
											className="flex w-full flex-col items-center gap-3 px-6 py-6 text-center"
											onClick={() => fileInputRef.current?.click()}
											disabled={isSubmitting}
										>
											<div className="flex items-center gap-3">
												<div className="rounded-lg bg-primary/8 p-2">
													<FileSpreadsheet className="h-5 w-5 text-primary/70" />
												</div>
												<div className="rounded-lg bg-primary/8 p-2">
													<FileText className="h-5 w-5 text-primary/70" />
												</div>
												<div className="rounded-lg bg-primary/8 p-2">
													<Image className="h-5 w-5 text-primary/70" />
												</div>
											</div>
											<div>
												<p
													className={cn(
														"text-sm font-medium",
														dragActive ? "text-primary" : "text-foreground",
													)}
												>
													{dragActive
														? "Drop files here"
														: "Drag and drop discovery assets here"}
												</p>
												<p className="mt-0.5 text-xs text-muted-foreground/60">
													Max 10 files · 50MB total upload budget
												</p>
											</div>
										</button>
									)}
								</section>
							</section>

							{canAssignOwner ? (
								<section className="rounded-xl bg-surface-container-lowest/80 p-5 border border-border/15 md:col-span-2">
									<div className="space-y-2">
										<h3 className="text-base font-semibold text-foreground">
											Assign Owner
										</h3>
										<AssignOwnerCombobox
											owners={assignableOwners}
											selectedOwnerUserId={selectedOwnerUserId}
											onOwnerChange={setSelectedOwnerUserId}
										/>
									</div>
								</section>
							) : null}

							<section className="rounded-xl bg-surface-container-lowest/80 p-5 border border-border/15">
								<div className="flex items-center gap-3 mb-3">
									<div className="p-2.5 bg-primary/10 rounded-lg">
										<Mic className="size-5 text-primary" />
									</div>
									<h3 className="text-base font-semibold text-foreground">
										Dictate Discovery Notes
									</h3>
								</div>
								<button
									type="button"
									className="flex w-full items-center justify-between rounded-xl bg-surface-container-low/60 px-4 py-3.5 transition-all hover:bg-surface-container-low hover:shadow-xs"
									onClick={() => audioInputRef.current?.click()}
									disabled={audioFile !== null || isSubmitting}
								>
									<div className="flex items-center gap-3">
										<div className="flex size-10 items-center justify-center rounded-full bg-primary">
											<Mic className="size-5 text-primary-foreground" />
										</div>
										<div className="text-left">
											<p className="text-sm font-semibold">Record Voice Note</p>
											<p className="text-xs text-muted-foreground">
												AI transcription will process clinical nuances
											</p>
										</div>
									</div>
									<div className="flex h-6 items-end gap-[2px]">
										{VOICE_WAVE_BARS.map((bar) => (
											<div
												key={bar.id}
												className="w-1 rounded-full bg-muted-foreground/20"
												style={{ height: `${bar.height * 4}px` }}
											/>
										))}
									</div>
								</button>
							</section>
						</div>
					</div>

					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept={ACCEPTED_FILE_TYPES}
						className="hidden"
						onChange={(e) => {
							const s = Array.from(e.target.files ?? []);
							if (s.length > 0) validateAndAddFiles(s);
							e.target.value = "";
						}}
					/>
					<input
						ref={audioInputRef}
						type="file"
						accept={ACCEPTED_AUDIO_TYPES}
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) validateAndSetAudio(f);
							e.target.value = "";
						}}
					/>

					<div className="shrink-0 border-t border-border/20 bg-surface-container-low/60 px-5 py-4 sm:px-8">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<button
								type="button"
								onClick={() => {
									setFiles([]);
									removeAudio();
									setText("");
								}}
								className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground hover:text-foreground transition-colors"
							>
								Clear All
							</button>
							<div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
								{!canDiscover && !isSubmitting && blockedDiscoveryReason ? (
									<p className="w-full text-xs text-muted-foreground sm:mr-1 sm:w-auto">
										{blockedDiscoveryReason}
									</p>
								) : null}
								<Button variant="ghost" onClick={onClose}>
									Cancel
								</Button>
								<Button
									onClick={() =>
										void onDiscover({
											companyId,
											locationId,
											assignedOwnerUserId: resolvedAssignedOwnerUserId,
											files,
											audioFile,
											text,
										})
									}
									disabled={!canDiscover || isSubmitting}
									className="btn-primary-solid shadow-sm hover:shadow-md transition-all duration-300"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
											Uploading…
										</>
									) : (
										"Process with Second Stream AI"
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
