"use client";

import {
	AlertCircle,
	Building2,
	Check,
	ChevronRight,
	ChevronsUpDown,
	FlaskConical,
	Lock,
	Plus,
	Sparkles,
	Truck,
	User,
	X,
} from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type BulkImportItem,
	type BulkImportRun,
	type BulkImportRunLocationOption,
	bulkImportAPI,
} from "@/lib/api/bulk-import";
import {
	buildLocationResolutionPayload,
	formatLocationStateLabel,
	getLocationResolutionErrorMessage,
	isLocationFieldResolved,
	resolveNonCreateLocationState,
} from "@/lib/location-resolution";
import {
	useDashboardActions,
	useDashboardActiveDraft,
} from "@/lib/stores/dashboard-store";
import type {
	DraftConfirmationContract,
	DraftConfirmationFieldDecision,
	DraftConfirmationFieldKey,
	DraftConfirmationFieldMap,
	DraftConfirmationFieldSource,
	DraftConfirmationLocationState,
	DraftItemRow,
} from "@/lib/types/dashboard";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────── */
/*  Types                                                      */
/* ──────────────────────────────────────────────────────────── */

interface DraftConfirmationContext {
	run: BulkImportRun;
	projectItem: BulkImportItem;
	parentLocationItem: BulkImportItem | null;
}

type FieldErrorMap = Partial<Record<DraftConfirmationFieldKey, string>>;

/* ──────────────────────────────────────────────────────────── */
/*  Constants                                                  */
/* ──────────────────────────────────────────────────────────── */

const FIELD_ORDER: DraftConfirmationFieldKey[] = [
	"company",
	"location",
	"materialType",
	"materialName",
	"composition",
	"volume",
	"frequency",
	"primaryContact",
];

const FIELD_LABELS: Record<DraftConfirmationFieldKey, string> = {
	company: "Company",
	location: "Location",
	materialType: "Material type",
	materialName: "Material name",
	composition: "Composition",
	volume: "Volume",
	frequency: "Frequency",
	primaryContact: "Primary contact",
};

const REQUIRED_FIELDS = new Set<DraftConfirmationFieldKey>([
	"company",
	"location",
	"volume",
	"frequency",
]);

const NON_EDITABLE_FIELDS = new Set<DraftConfirmationFieldKey>(["company"]);

const LOCATION_LOOKUP_LIMIT = 20;

const SOURCE_LABELS: Record<DraftConfirmationFieldSource, string> = {
	ai_detected: "AI detected",
	manual_override: "Manual",
	pending: "Pending",
};

const INPUT_PLACEHOLDER = "Pending";

/* ──────────────────────────────────────────────────────────── */
/*  Field grouping                                             */
/* ──────────────────────────────────────────────────────────── */

interface FieldGroup {
	title: string;
	icon: ComponentType<{ className?: string }>;
	fields: DraftConfirmationFieldKey[];
}

const FIELD_GROUPS: FieldGroup[] = [
	{
		title: "Identity",
		icon: Building2,
		fields: ["company", "location"],
	},
	{
		title: "Material",
		icon: FlaskConical,
		fields: ["materialType", "materialName", "composition"],
	},
	{
		title: "Operations",
		icon: Truck,
		fields: ["volume", "frequency", "primaryContact"],
	},
];

/* ──────────────────────────────────────────────────────────── */
/*  Main component                                             */
/* ──────────────────────────────────────────────────────────── */

export function DraftConfirmationSheet() {
	const activeDraft = useDashboardActiveDraft();
	const { closeDraftConfirmation, loadDashboard } = useDashboardActions();

	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [contract, setContract] = useState<DraftConfirmationContract | null>(
		null,
	);
	const [context, setContext] = useState<DraftConfirmationContext | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
	const [locationLookupQuery, setLocationLookupQuery] = useState("");
	const [locationOptions, setLocationOptions] = useState<
		BulkImportRunLocationOption[]
	>([]);
	const [locationLookupLoading, setLocationLookupLoading] = useState(false);
	const [locationLookupError, setLocationLookupError] = useState<string | null>(
		null,
	);
	const [lastNonCreateLocationState, setLastNonCreateLocationState] =
		useState<DraftConfirmationLocationState | null>(null);

	useEffect(() => {
		if (!activeDraft) {
			setContract(null);
			setContext(null);
			setFieldErrors({});
			setLocationLookupQuery("");
			setLocationOptions([]);
			setLocationLookupLoading(false);
			setLocationLookupError(null);
			setLastNonCreateLocationState(null);
			setLoading(false);
			return;
		}

		const selectedDraft = activeDraft;
		setLocationLookupQuery("");
		setLocationOptions([]);
		setLocationLookupError(null);
		setLastNonCreateLocationState(null);

		let cancelled = false;

		async function loadDraftContext() {
			setLoading(true);
			setFieldErrors({});

			try {
				const run = await bulkImportAPI.getRun(selectedDraft.runId);
				const items = await bulkImportAPI.listAllItems(run.id);
				const projectItem = items.find(
					(item) =>
						item.id === selectedDraft.itemId && item.itemType === "project",
				);

				if (!projectItem) {
					throw new Error("Draft item no longer available");
				}

				const parentLocationItem = projectItem.parentItemId
					? (items.find((item) => item.id === projectItem.parentItemId) ?? null)
					: null;

				if (cancelled) {
					return;
				}

				const nextContract = buildDraftConfirmationContract({
					draft: selectedDraft,
					run,
					projectItem,
					parentLocationItem,
				});
				setContext({ run, projectItem, parentLocationItem });
				setContract(nextContract);
				setLastNonCreateLocationState(
					resolveNonCreateLocationState(
						nextContract.locationState,
						nextContract.initialLocationState,
					),
				);
			} catch (error) {
				if (!cancelled) {
					toast.error(
						error instanceof Error
							? error.message
							: "Failed to load draft confirmation",
					);
					closeDraftConfirmation();
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void loadDraftContext();

		return () => {
			cancelled = true;
		};
	}, [activeDraft, closeDraftConfirmation]);

	useEffect(() => {
		if (
			!contract ||
			!context ||
			!contract.fields.location.editable ||
			!contract.companyId
		) {
			setLocationOptions([]);
			setLocationLookupLoading(false);
			setLocationLookupError(null);
			return;
		}

		let cancelled = false;
		setLocationLookupLoading(true);
		setLocationLookupError(null);

		const timer = setTimeout(() => {
			void bulkImportAPI
				.searchRunLocations(context.run.id, {
					query: locationLookupQuery,
					limit: LOCATION_LOOKUP_LIMIT,
				})
				.then((results) => {
					if (cancelled) {
						return;
					}
					setLocationOptions(results);
				})
				.catch((error) => {
					if (cancelled) {
						return;
					}
					setLocationLookupError(
						error instanceof Error ? error.message : "Failed to load locations",
					);
					setLocationOptions([]);
				})
				.finally(() => {
					if (!cancelled) {
						setLocationLookupLoading(false);
					}
				});
		}, 180);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [contract, context, locationLookupQuery]);

	const missingBaseFields = useMemo(() => {
		if (!contract) {
			return [];
		}

		const missing: string[] = [];
		for (const key of REQUIRED_FIELDS) {
			if (
				key === "location" &&
				!isLocationFieldResolved(
					contract.fields.location.decision,
					contract.locationState,
				)
			) {
				missing.push(FIELD_LABELS[key]);
				continue;
			}
			if (key !== "location" && !getPersistedFieldValue(contract.fields[key])) {
				missing.push(FIELD_LABELS[key]);
			}
		}

		const hasMaterialName = Boolean(
			getPersistedFieldValue(contract.fields.materialName),
		);
		const hasMaterialType = Boolean(
			getPersistedFieldValue(contract.fields.materialType),
		);
		if (!hasMaterialName && !hasMaterialType) {
			missing.push("Material name or material type");
		}

		return missing;
	}, [contract]);

	const fieldReadiness = useMemo(() => {
		if (!contract) {
			return { resolved: 0, total: FIELD_ORDER.length };
		}
		let resolved = 0;
		for (const key of FIELD_ORDER) {
			const field = contract.fields[key];
			const isResolved =
				key === "location"
					? isLocationFieldResolved(field.decision, contract.locationState)
					: Boolean(getPersistedFieldValue(field));
			if (isResolved) {
				resolved++;
			}
		}
		return { resolved, total: FIELD_ORDER.length };
	}, [contract]);

	const updateField = useCallback(
		(
			key: DraftConfirmationFieldKey,
			updates: Partial<{
				value: string;
				decision: DraftConfirmationFieldDecision;
			}>,
		) => {
			setContract((current) => {
				if (!current) {
					return current;
				}

				const field = current.fields[key];
				if (!field) {
					return current;
				}
				if (!field.editable) {
					return current;
				}

				return {
					...current,
					fields: {
						...current.fields,
						[key]: {
							...field,
							...(updates.value !== undefined ? { value: updates.value } : {}),
							...(updates.decision !== undefined
								? { decision: updates.decision }
								: {}),
						},
					},
				};
			});

			setFieldErrors((current) => {
				if (!(key in current)) {
					return current;
				}
				const next = { ...current };
				delete next[key];
				return next;
			});
		},
		[],
	);

	const updateLocationState = useCallback(
		(nextLocationState: DraftConfirmationLocationState) => {
			if (nextLocationState.mode !== "create_new") {
				setLastNonCreateLocationState(nextLocationState);
			}
			setContract((current) => {
				if (!current) {
					return current;
				}
				return {
					...current,
					locationState: nextLocationState,
					fields: {
						...current.fields,
						location: {
							...current.fields.location,
							value: nextLocationState.name,
							decision: "confirm",
						},
					},
				};
			});

			setFieldErrors((current) => {
				if (!("location" in current)) {
					return current;
				}
				const next = { ...current };
				delete next.location;
				return next;
			});
		},
		[],
	);

	const selectExistingLocation = useCallback(
		(option: BulkImportRunLocationOption) => {
			updateLocationState({
				mode: "existing",
				locationId: option.id,
				name: option.name,
				city: option.city,
				state: option.state,
				address: option.address ?? "",
			});
		},
		[updateLocationState],
	);

	const startCreateNewLocation = useCallback(() => {
		if (!contract) {
			return;
		}
		if (contract.locationState.mode !== "create_new") {
			setLastNonCreateLocationState(contract.locationState);
		}
		updateLocationState({
			mode: "create_new",
			name: contract.locationState.name,
			city: contract.locationState.city,
			state: contract.locationState.state,
			address: contract.locationState.address,
		});
	}, [contract, updateLocationState]);

	const switchLocationBackToLocked = useCallback(() => {
		if (!contract) {
			return;
		}
		const fallbackState = resolveNonCreateLocationState(
			lastNonCreateLocationState,
			contract.initialLocationState,
		);
		updateLocationState(fallbackState);
	}, [contract, lastNonCreateLocationState, updateLocationState]);

	const updateCreateNewLocationField = useCallback(
		(field: "name" | "city" | "state" | "address", value: string) => {
			if (!contract || contract.locationState.mode !== "create_new") {
				return;
			}
			updateLocationState({
				...contract.locationState,
				[field]: value,
			});
		},
		[contract, updateLocationState],
	);

	const handleConfirmDraft = useCallback(async () => {
		if (!contract || !context) {
			return;
		}

		if (!context.projectItem.groupId) {
			toast.error("Draft group is missing. Reopen and try again.");
			return;
		}

		const validationErrors: FieldErrorMap = {};

		for (const key of REQUIRED_FIELDS) {
			if (
				key === "location" &&
				!isLocationFieldResolved(
					contract.fields.location.decision,
					contract.locationState,
				)
			) {
				validationErrors.location = getLocationResolutionErrorMessage(
					contract.fields.location.decision,
					contract.locationState,
				);
				continue;
			}

			if (key !== "location" && !getPersistedFieldValue(contract.fields[key])) {
				validationErrors[key] = `${FIELD_LABELS[key]} is required`;
			}
		}

		const hasMaterialName = Boolean(
			getPersistedFieldValue(contract.fields.materialName),
		);
		const hasMaterialType = Boolean(
			getPersistedFieldValue(contract.fields.materialType),
		);
		if (!hasMaterialName && !hasMaterialType) {
			validationErrors.materialName = "Provide material name or material type";
			validationErrors.materialType = "Provide material name or material type";
		}

		if (!contract.companyId && context.run.entrypointType === "company") {
			validationErrors.company =
				"Company assignment is missing. Reopen from an assigned draft.";
		}

		if (Object.keys(validationErrors).length > 0) {
			setFieldErrors(validationErrors);
			toast.error("Missing required base fields", {
				description: "Complete required fields before confirming.",
			});
			return;
		}

		setSubmitting(true);

		try {
			const projectNormalizedData = buildProjectNormalizedData(
				contract.fields,
				context.projectItem,
			);
			const reviewNotes = buildReviewNotes(contract.fields);

			await bulkImportAPI.patchItem(context.projectItem.id, "amend", {
				normalizedData: projectNormalizedData,
				reviewNotes,
			});

			if (context.parentLocationItem) {
				const locationResolution = buildLocationResolutionPayload(
					contract.fields.location.decision,
					contract.locationState,
				);
				if (!locationResolution) {
					throw new Error(
						getLocationResolutionErrorMessage(
							contract.fields.location.decision,
							contract.locationState,
						),
					);
				}

				await bulkImportAPI.patchItem(context.parentLocationItem.id, "amend", {
					locationResolution,
				});
			}

			await bulkImportAPI.finalize(context.run.id, {
				resolvedGroupIds: [context.projectItem.groupId],
				idempotencyKey: crypto.randomUUID(),
			});

			await loadDashboard();
			closeDraftConfirmation();
			toast.success("Draft confirmed", {
				description: "Stream created and moved out of Needs Confirmation.",
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to confirm draft",
			);
		} finally {
			setSubmitting(false);
		}
	}, [contract, context, closeDraftConfirmation, loadDashboard]);

	const isReady = missingBaseFields.length === 0;

	return (
		<Dialog
			open={activeDraft !== null}
			onOpenChange={(open) => {
				if (!open && !submitting) {
					closeDraftConfirmation();
				}
			}}
		>
			<DialogContent
				className="sm:max-w-2xl p-0 gap-0 overflow-hidden"
				showCloseButton={!submitting}
			>
				{/* ── Header ─────────────────────────────────── */}
				<div className="border-b border-border/60 bg-muted/30">
					<DialogHeader className="px-6 pt-5 pb-4">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center size-9 rounded-lg bg-warning/15 text-warning">
								<Sparkles className="size-4" />
							</div>
							<div className="flex flex-col gap-0.5">
								<DialogTitle className="text-base leading-snug">
									Needs Confirmation
								</DialogTitle>
								<DialogDescription className="text-xs">
									Review AI-detected fields before creating a persisted stream
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					{/* ── Readiness bar ───────────────────────── */}
					{!loading && contract && (
						<div className="px-6 pb-4">
							<ReadinessSummary
								resolved={fieldReadiness.resolved}
								total={fieldReadiness.total}
								isReady={isReady}
								missingFields={missingBaseFields}
							/>
						</div>
					)}
				</div>

				{/* ── Body ───────────────────────────────────── */}
				{loading && (
					<div className="flex items-center justify-center py-20">
						<div className="flex flex-col items-center gap-3">
							<Spinner className="size-5 text-muted-foreground" />
							<p className="text-xs text-muted-foreground">
								Loading draft data…
							</p>
						</div>
					</div>
				)}

				{!loading && contract && (
					<ScrollArea className="max-h-[min(60vh,calc(100dvh-220px))]">
						<div className="flex flex-col gap-5 px-6 py-5">
							{FIELD_GROUPS.map((group, groupIndex) => (
								<FieldGroupSection
									key={group.title}
									group={group}
									contract={contract}
									fieldErrors={fieldErrors}
									updateField={updateField}
									locationLookupQuery={locationLookupQuery}
									onLocationLookupQueryChange={setLocationLookupQuery}
									locationOptions={locationOptions}
									locationLookupLoading={locationLookupLoading}
									locationLookupError={locationLookupError}
									onSelectExistingLocation={selectExistingLocation}
									onStartCreateNewLocation={startCreateNewLocation}
									onCancelCreateNewLocation={switchLocationBackToLocked}
									onUpdateCreateNewLocationField={updateCreateNewLocationField}
									submitting={submitting}
									showSeparator={groupIndex < FIELD_GROUPS.length - 1}
								/>
							))}
						</div>
					</ScrollArea>
				)}

				{/* ── Footer ─────────────────────────────────── */}
				<div className="border-t border-border/60 bg-muted/20 px-6 py-4">
					<div className="flex items-center justify-between">
						<p
							className={cn(
								"text-[11px]",
								isReady
									? "text-muted-foreground"
									: "text-warning-foreground dark:text-warning",
							)}
						>
							{isReady
								? "All required fields are resolved"
								: `${missingBaseFields.length} field${missingBaseFields.length !== 1 ? "s" : ""} still pending`}
						</p>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => closeDraftConfirmation()}
								disabled={submitting}
							>
								Cancel
							</Button>
							<Button
								size="default"
								onClick={() => {
									void handleConfirmDraft();
								}}
								disabled={submitting || loading || !contract}
								className={cn(
									"min-w-[120px]",
									isReady &&
										"bg-success text-success-foreground hover:bg-success/90",
								)}
							>
								{submitting ? (
									<>
										<Spinner className="mr-2" />
										Confirming…
									</>
								) : (
									<>
										<Check data-icon="inline-start" />
										Confirm Draft
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/* ──────────────────────────────────────────────────────────── */
/*  Readiness summary                                          */
/* ──────────────────────────────────────────────────────────── */

function ReadinessSummary({
	resolved,
	total,
	isReady,
	missingFields,
}: {
	resolved: number;
	total: number;
	isReady: boolean;
	missingFields: string[];
}) {
	const pct = Math.round((resolved / total) * 100);

	return (
		<div
			className={cn(
				"rounded-lg border px-3.5 py-2.5",
				isReady
					? "border-success/30 bg-success/5"
					: "border-warning/30 bg-warning/5",
			)}
			aria-live="polite"
			aria-atomic="true"
		>
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-2.5 min-w-0">
					{isReady ? (
						<div className="flex items-center justify-center size-5 rounded-full bg-success/20 text-success shrink-0">
							<Check className="size-3" />
						</div>
					) : (
						<div className="flex items-center justify-center size-5 rounded-full bg-warning/20 text-warning shrink-0">
							<AlertCircle className="size-3" />
						</div>
					)}
					{isReady ? (
						<span className="text-xs font-medium">Ready to confirm</span>
					) : (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="text-xs font-medium truncate max-w-[260px] cursor-default">
									Missing: {missingFields.join(", ")}
								</span>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p>Missing: {missingFields.join(", ")}</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
				<span
					className={cn(
						"text-[11px] font-mono tabular-nums shrink-0",
						isReady ? "text-success" : "text-warning",
					)}
				>
					{resolved}/{total} ({pct}%)
				</span>
			</div>

			{/* Progress track */}
			<div className="mt-2 h-1 w-full rounded-full bg-border/40 overflow-hidden">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-500 ease-out",
						isReady ? "bg-success" : "bg-warning",
					)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

/* ──────────────────────────────────────────────────────────── */
/*  Field group section                                        */
/* ──────────────────────────────────────────────────────────── */

function FieldGroupSection({
	group,
	contract,
	fieldErrors,
	updateField,
	locationLookupQuery,
	onLocationLookupQueryChange,
	locationOptions,
	locationLookupLoading,
	locationLookupError,
	onSelectExistingLocation,
	onStartCreateNewLocation,
	onCancelCreateNewLocation,
	onUpdateCreateNewLocationField,
	submitting,
	showSeparator,
}: {
	group: FieldGroup;
	contract: DraftConfirmationContract;
	fieldErrors: FieldErrorMap;
	updateField: (
		key: DraftConfirmationFieldKey,
		updates: Partial<{
			value: string;
			decision: DraftConfirmationFieldDecision;
		}>,
	) => void;
	locationLookupQuery: string;
	onLocationLookupQueryChange: (value: string) => void;
	locationOptions: BulkImportRunLocationOption[];
	locationLookupLoading: boolean;
	locationLookupError: string | null;
	onSelectExistingLocation: (option: BulkImportRunLocationOption) => void;
	onStartCreateNewLocation: () => void;
	onCancelCreateNewLocation: () => void;
	onUpdateCreateNewLocationField: (
		field: "name" | "city" | "state" | "address",
		value: string,
	) => void;
	submitting: boolean;
	showSeparator: boolean;
}) {
	const GroupIcon = group.icon;

	return (
		<>
			{/* Group header */}
			<div className="flex items-center gap-2 mb-1">
				<GroupIcon className="size-3.5 text-muted-foreground" />
				<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
					{group.title}
				</span>
				<div className="flex-1 h-px bg-border/40" />
			</div>

			{/* Fields */}
			<div className="flex flex-col gap-2.5">
				{group.fields.map((fieldKey) => {
					const field = contract.fields[fieldKey];
					const error = fieldErrors[fieldKey];
					const persistedValue = getPersistedFieldValue(field);
					const isResolved =
						field.key === "location"
							? isLocationFieldResolved(field.decision, contract.locationState)
							: Boolean(persistedValue);

					return (
						<ConfirmationFieldRow
							key={field.key}
							field={field}
							locationState={
								field.key === "location" ? contract.locationState : null
							}
							locationLookupQuery={locationLookupQuery}
							onLocationLookupQueryChange={onLocationLookupQueryChange}
							locationOptions={locationOptions}
							locationLookupLoading={locationLookupLoading}
							locationLookupError={locationLookupError}
							onSelectExistingLocation={onSelectExistingLocation}
							onStartCreateNewLocation={onStartCreateNewLocation}
							onCancelCreateNewLocation={onCancelCreateNewLocation}
							onUpdateCreateNewLocationField={onUpdateCreateNewLocationField}
							isResolved={isResolved}
							error={error}
							onDecision={(decision) => updateField(field.key, { decision })}
							onValueChange={(value) => updateField(field.key, { value })}
							submitting={submitting}
						/>
					);
				})}
			</div>

			{showSeparator && <Separator className="my-1.5" />}
		</>
	);
}

/* ──────────────────────────────────────────────────────────── */
/*  Individual field row                                       */
/* ──────────────────────────────────────────────────────────── */

function ConfirmationFieldRow({
	field,
	locationState,
	locationLookupQuery,
	onLocationLookupQueryChange,
	locationOptions,
	locationLookupLoading,
	locationLookupError,
	onSelectExistingLocation,
	onStartCreateNewLocation,
	onCancelCreateNewLocation,
	onUpdateCreateNewLocationField,
	isResolved,
	error,
	onDecision,
	onValueChange,
	submitting,
}: {
	field: DraftConfirmationFieldMap[DraftConfirmationFieldKey];
	locationState: DraftConfirmationLocationState | null;
	locationLookupQuery: string;
	onLocationLookupQueryChange: (value: string) => void;
	locationOptions: BulkImportRunLocationOption[];
	locationLookupLoading: boolean;
	locationLookupError: string | null;
	onSelectExistingLocation: (option: BulkImportRunLocationOption) => void;
	onStartCreateNewLocation: () => void;
	onCancelCreateNewLocation: () => void;
	onUpdateCreateNewLocationField: (
		field: "name" | "city" | "state" | "address",
		value: string,
	) => void;
	isResolved: boolean;
	error: string | undefined;
	onDecision: (decision: DraftConfirmationFieldDecision) => void;
	onValueChange: (value: string) => void;
	submitting: boolean;
}) {
	return (
		<div
			className={cn(
				"group rounded-lg border border-l-2 px-3.5 py-3 transition-colors",
				error
					? "border-destructive/40 border-l-destructive/50 bg-destructive/5"
					: isResolved
						? "border-border/40 border-l-success/40 bg-background"
						: "border-warning/25 border-l-warning/60 bg-warning/8",
				!field.editable && "cursor-not-allowed",
			)}
		>
			{/* Row header: label + source + actions */}
			<div className="flex items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-2 min-w-0">
					{/* Resolved indicator */}
					<div
						aria-hidden="true"
						className={cn(
							"flex items-center justify-center size-4 rounded-full shrink-0 transition-colors",
							isResolved
								? "bg-success/20 text-success"
								: "bg-muted text-muted-foreground",
						)}
					>
						{isResolved ? (
							<Check className="size-2.5" />
						) : (
							<ChevronRight className="size-2.5" />
						)}
					</div>

					<span className="text-sm font-medium truncate">{field.label}</span>
					{field.required && (
						<span className="text-[10px] text-destructive font-medium">*</span>
					)}

					<SourceBadge source={field.source} />

					{!field.editable && field.editabilityReason && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Lock className="size-3.5 text-muted-foreground/70 shrink-0 cursor-help" />
							</TooltipTrigger>
							<TooltipContent side="top">
								<p>{field.editabilityReason}</p>
							</TooltipContent>
						</Tooltip>
					)}
					{!field.editable && !field.editabilityReason && (
						<Lock className="size-3.5 text-muted-foreground/70 shrink-0" />
					)}
				</div>

				{/* Confirm / Reject mini-buttons */}
				{field.editable && (
					<div className="flex items-center gap-1 shrink-0">
						<FieldDecisionButton
							active={field.decision === "confirm"}
							onClick={() => onDecision("confirm")}
							icon={Check}
							label="Confirm"
							disabled={submitting}
						/>
						<FieldDecisionButton
							active={field.decision === "reject"}
							onClick={() => onDecision("reject")}
							icon={X}
							label="Reject"
							disabled={submitting}
						/>
					</div>
				)}
			</div>

			{/* Input */}
			{field.key === "location" && locationState && field.editable ? (
				<LocationFieldInput
					locationState={locationState}
					searchQuery={locationLookupQuery}
					onSearchQueryChange={onLocationLookupQueryChange}
					options={locationOptions}
					loading={locationLookupLoading}
					error={locationLookupError}
					onSelectExisting={onSelectExistingLocation}
					onStartCreateNew={onStartCreateNewLocation}
					onCancelCreateNew={onCancelCreateNewLocation}
					onUpdateCreateNewField={onUpdateCreateNewLocationField}
					disabled={submitting || !field.editable}
				/>
			) : (
				<FieldInput
					fieldKey={field.key}
					value={field.value}
					onChange={onValueChange}
					placeholder={field.placeholder ?? INPUT_PLACEHOLDER}
					disabled={submitting || !field.editable}
				/>
			)}

			{/* Error */}
			{error && (
				<p className="mt-1.5 text-[11px] text-destructive flex items-center gap-1">
					<AlertCircle className="size-2.5 shrink-0" />
					{error}
				</p>
			)}
		</div>
	);
}

/* ──────────────────────────────────────────────────────────── */
/*  Source badge                                                */
/* ──────────────────────────────────────────────────────────── */

function SourceBadge({ source }: { source: DraftConfirmationFieldSource }) {
	const variants: Record<
		DraftConfirmationFieldSource,
		{
			className: string;
			icon: ComponentType<{ className?: string }>;
		}
	> = {
		ai_detected: {
			className: "border-info/30 bg-info/8 text-info-foreground dark:text-info",
			icon: Sparkles,
		},
		manual_override: {
			className:
				"border-success/30 bg-success/8 text-success-foreground dark:text-success",
			icon: User,
		},
		pending: {
			className:
				"border-warning/30 bg-warning/8 text-warning-foreground dark:text-warning",
			icon: AlertCircle,
		},
	};

	const variant = variants[source];
	const SourceIcon = variant.icon;

	return (
		<Badge
			variant="outline"
			className={cn(
				"text-[10px] px-1.5 py-0 h-[18px] gap-1",
				variant.className,
			)}
		>
			<SourceIcon className="size-2.5" />
			{SOURCE_LABELS[source]}
		</Badge>
	);
}

/* ──────────────────────────────────────────────────────────── */
/*  Field decision button                                      */
/* ──────────────────────────────────────────────────────────── */

function FieldDecisionButton({
	active,
	onClick,
	icon: Icon,
	label,
	disabled,
}: {
	active: boolean;
	onClick: () => void;
	icon: ComponentType<{ className?: string }>;
	label: string;
	disabled: boolean;
}) {
	const isConfirm = label === "Confirm";

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"h-7 px-2 text-xs gap-1 rounded-md",
				active && isConfirm && "border-success/50 bg-success/10 text-success",
				active &&
					!isConfirm &&
					"border-destructive/50 bg-destructive/10 text-destructive",
				!active &&
					"border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
			)}
		>
			<Icon className="size-3" />
			{label}
		</Button>
	);
}

/* ──────────────────────────────────────────────────────────── */
/*  Field input                                                */
/* ──────────────────────────────────────────────────────────── */

function LocationFieldInput({
	locationState,
	searchQuery,
	onSearchQueryChange,
	options,
	loading,
	error,
	onSelectExisting,
	onStartCreateNew,
	onCancelCreateNew,
	onUpdateCreateNewField,
	disabled,
}: {
	locationState: DraftConfirmationLocationState;
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
	options: BulkImportRunLocationOption[];
	loading: boolean;
	error: string | null;
	onSelectExisting: (option: BulkImportRunLocationOption) => void;
	onStartCreateNew: () => void;
	onCancelCreateNew: () => void;
	onUpdateCreateNewField: (
		field: "name" | "city" | "state" | "address",
		value: string,
	) => void;
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);

	if (locationState.mode === "create_new") {
		return (
			<div className="space-y-2">
				<div className="grid gap-2 sm:grid-cols-2">
					<Input
						value={locationState.name}
						onChange={(event) =>
							onUpdateCreateNewField("name", event.target.value)
						}
						placeholder="Location name"
						disabled={disabled}
						className="text-sm h-8 sm:col-span-2"
					/>
					<Input
						value={locationState.city}
						onChange={(event) =>
							onUpdateCreateNewField("city", event.target.value)
						}
						placeholder="City"
						disabled={disabled}
						className="text-sm h-8"
					/>
					<Input
						value={locationState.state}
						onChange={(event) =>
							onUpdateCreateNewField("state", event.target.value)
						}
						placeholder="State"
						disabled={disabled}
						className="text-sm h-8"
					/>
					<Input
						value={locationState.address}
						onChange={(event) =>
							onUpdateCreateNewField("address", event.target.value)
						}
						placeholder="Address (optional)"
						disabled={disabled}
						className="text-sm h-8 sm:col-span-2"
					/>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onCancelCreateNew}
					disabled={disabled}
					className="h-7 px-2 text-xs text-muted-foreground"
				>
					Use existing location instead
				</Button>
			</div>
		);
	}

	const triggerLabel = formatLocationStateLabel(locationState);

	return (
		<div className="space-y-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled}
						className="h-8 w-full justify-between text-sm font-normal"
					>
						<span className="truncate text-left">{triggerLabel}</span>
						<ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-60" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="p-0"
					align="start"
					style={{ width: "var(--radix-popover-trigger-width)" }}
				>
					<Command shouldFilter={false}>
						<CommandInput
							placeholder="Search existing locations..."
							value={searchQuery}
							onValueChange={onSearchQueryChange}
						/>
						<CommandList>
							{loading ? (
								<div className="px-3 py-3 text-xs text-muted-foreground">
									Loading locations...
								</div>
							) : (
								<>
									{options.length === 0 && (
										<CommandEmpty>No matching locations</CommandEmpty>
									)}
									<CommandGroup>
										{options.map((option) => {
											const selected =
												locationState.mode === "existing" &&
												locationState.locationId === option.id;
											return (
												<CommandItem
													key={option.id}
													value={`${option.name} ${option.city} ${option.state}`}
													onSelect={() => {
														onSelectExisting(option);
														setOpen(false);
													}}
												>
													<Check
														className={cn(
															"mr-2 size-3",
															selected ? "opacity-100" : "opacity-0",
														)}
													/>
													<div className="flex min-w-0 flex-col gap-0.5">
														<span className="truncate text-sm">
															{option.name}
														</span>
														<span className="truncate text-[11px] text-muted-foreground">
															{option.city}, {option.state}
														</span>
													</div>
												</CommandItem>
											);
										})}
									</CommandGroup>
								</>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{error && <p className="text-[11px] text-warning">{error}</p>}

			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={onStartCreateNew}
				disabled={disabled}
				className="h-7 px-2 text-xs text-primary"
			>
				<Plus className="size-3 mr-1" />
				Create new location
			</Button>
		</div>
	);
}

function FieldInput({
	fieldKey,
	value,
	onChange,
	placeholder,
	disabled,
}: {
	fieldKey: DraftConfirmationFieldKey;
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	disabled: boolean;
}) {
	if (fieldKey === "composition") {
		return (
			<Textarea
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				rows={2}
				disabled={disabled}
				className="text-sm resize-none"
			/>
		);
	}

	return (
		<Input
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			disabled={disabled}
			className="text-sm h-8"
		/>
	);
}

/* ──────────────────────────────────────────────────────────── */
/*  Contract building (unchanged business logic)               */
/* ──────────────────────────────────────────────────────────── */

function buildDraftConfirmationContract(params: {
	draft: DraftItemRow;
	run: BulkImportRun;
	projectItem: BulkImportItem;
	parentLocationItem: BulkImportItem | null;
}): DraftConfirmationContract {
	const { draft, run, projectItem, parentLocationItem } = params;

	const projectManual = asRecord(projectItem.userAmendments);
	const projectNormalized = asRecord(projectItem.normalizedData);
	const projectExtracted = asRecord(projectItem.extractedData);
	const parentManual = parentLocationItem
		? asRecord(parentLocationItem.userAmendments)
		: null;
	const parentNormalized = parentLocationItem
		? asRecord(parentLocationItem.normalizedData)
		: null;

	const companyValue = normalizeText(draft.companyLabel);
	const locationValue =
		pickFirstString(parentManual, ["name"]) ||
		pickFirstString(parentNormalized, ["name"]) ||
		normalizeText(draft.locationLabel);
	const locationCity =
		pickFirstString(parentManual, ["city", "location_city"]) ||
		pickFirstString(parentNormalized, ["city", "location_city"]);
	const locationStateValue =
		pickFirstString(parentManual, ["state", "location_state"]) ||
		pickFirstString(parentNormalized, ["state", "location_state"]);
	const locationAddress =
		pickFirstString(parentManual, ["address"]) ||
		pickFirstString(parentNormalized, ["address"]);
	const locationState = buildInitialLocationState({
		run,
		parentLocationItem,
		parentManual,
		name: locationValue,
		city: locationCity,
		state: locationStateValue,
		address: locationAddress,
	});
	const locationEditable =
		run.entrypointType === "company" && parentLocationItem !== null;

	const materialTypeValue = firstDetectedValue(
		projectManual,
		projectNormalized,
		projectExtracted,
		["category", "material_type", "waste_type"],
	);
	const materialNameValue = firstDetectedValue(
		projectManual,
		projectNormalized,
		projectExtracted,
		["name", "material_name", "waste_stream_name", "stream_name"],
	);
	const compositionValue = firstDetectedValue(
		projectManual,
		projectNormalized,
		projectExtracted,
		["composition", "description", "material_composition"],
	);
	const volumeValue = firstDetectedValue(
		projectManual,
		projectNormalized,
		projectExtracted,
		["estimated_volume", "volume", "quantity"],
	);
	const frequencyValue = firstDetectedValue(
		projectManual,
		projectNormalized,
		projectExtracted,
		[
			"frequency",
			"collection_frequency",
			"generation_frequency",
			"pickup_frequency",
		],
	);
	const primaryContactValue = firstDetectedValue(
		projectManual,
		projectNormalized,
		projectExtracted,
		["primary_contact", "contact_name", "contact_person"],
	);

	const fields: DraftConfirmationFieldMap = {
		company: buildFieldState({
			key: "company",
			value: companyValue,
			source: companyValue ? "ai_detected" : "pending",
			editable: false,
			editabilityReason:
				"Locked in this phase. Company edits stay in draft review flow.",
		}),
		location: buildFieldState({
			key: "location",
			value: locationState.name,
			source: resolveLocationSource(
				parentManual,
				parentNormalized,
				locationValue,
			),
			editable: locationEditable,
			editabilityReason: locationEditable
				? "Use existing location or create a new one for this company."
				: "Locked in this phase. Location edits stay in draft review flow.",
		}),
		materialType: buildDetectedFieldState({
			key: "materialType",
			value: materialTypeValue,
			manual: projectManual,
			normalized: projectNormalized,
			extracted: projectExtracted,
			keys: ["category", "material_type", "waste_type"],
		}),
		materialName: buildDetectedFieldState({
			key: "materialName",
			value: materialNameValue,
			manual: projectManual,
			normalized: projectNormalized,
			extracted: projectExtracted,
			keys: ["name", "material_name", "waste_stream_name", "stream_name"],
		}),
		composition: buildDetectedFieldState({
			key: "composition",
			value: compositionValue,
			manual: projectManual,
			normalized: projectNormalized,
			extracted: projectExtracted,
			keys: ["composition", "description", "material_composition"],
		}),
		volume: buildDetectedFieldState({
			key: "volume",
			value: volumeValue,
			manual: projectManual,
			normalized: projectNormalized,
			extracted: projectExtracted,
			keys: ["estimated_volume", "volume", "quantity"],
		}),
		frequency: buildDetectedFieldState({
			key: "frequency",
			value: frequencyValue,
			manual: projectManual,
			normalized: projectNormalized,
			extracted: projectExtracted,
			keys: [
				"frequency",
				"collection_frequency",
				"generation_frequency",
				"pickup_frequency",
			],
		}),
		primaryContact: buildDetectedFieldState({
			key: "primaryContact",
			value: primaryContactValue,
			manual: projectManual,
			normalized: projectNormalized,
			extracted: projectExtracted,
			keys: ["primary_contact", "contact_name", "contact_person"],
		}),
	};

	return {
		draftItemId: draft.itemId,
		runId: run.id,
		sourceType: draft.sourceType,
		groupId: projectItem.groupId,
		companyId:
			run.entrypointType === "company" ? run.entrypointId : draft.companyId,
		locationId: run.entrypointType === "location" ? run.entrypointId : null,
		initialLocationState: locationState,
		locationState,
		fields,
	};
}

function buildFieldState(params: {
	key: DraftConfirmationFieldKey;
	value: string;
	source: DraftConfirmationFieldSource;
	editable?: boolean;
	editabilityReason?: string;
}): DraftConfirmationFieldMap[DraftConfirmationFieldKey] {
	const {
		key,
		value,
		source,
		editable = !NON_EDITABLE_FIELDS.has(key),
		editabilityReason,
	} = params;
	return {
		key,
		label: FIELD_LABELS[key],
		initialValue: value,
		value,
		decision: value ? "confirm" : "reject",
		source,
		required: REQUIRED_FIELDS.has(key),
		editable,
		...(editabilityReason ? { editabilityReason } : {}),
		placeholder: INPUT_PLACEHOLDER,
	};
}

function buildDetectedFieldState(params: {
	key: DraftConfirmationFieldKey;
	value: string;
	manual: Record<string, unknown> | null;
	normalized: Record<string, unknown> | null;
	extracted: Record<string, unknown> | null;
	keys: string[];
}) {
	const { key, value, manual, normalized, extracted, keys } = params;
	return buildFieldState({
		key,
		value,
		source: resolveDetectedSource(manual, normalized, extracted, keys),
	});
}

function resolveLocationSource(
	manual: Record<string, unknown> | null,
	normalized: Record<string, unknown> | null,
	value: string,
): DraftConfirmationFieldSource {
	if (hasAnyValue(manual, ["name"])) {
		return "manual_override";
	}
	if (hasAnyValue(normalized, ["name"]) || value) {
		return "ai_detected";
	}
	return "pending";
}

function resolveDetectedSource(
	manual: Record<string, unknown> | null,
	normalized: Record<string, unknown> | null,
	extracted: Record<string, unknown> | null,
	keys: string[],
): DraftConfirmationFieldSource {
	if (hasAnyValue(manual, keys)) {
		return "manual_override";
	}
	if (hasAnyValue(normalized, keys) || hasAnyValue(extracted, keys)) {
		return "ai_detected";
	}
	return "pending";
}

function hasAnyValue(
	record: Record<string, unknown> | null,
	keys: string[],
): boolean {
	if (!record) {
		return false;
	}
	for (const key of keys) {
		const candidate = record[key];
		if (typeof candidate === "string" && candidate.trim().length > 0) {
			return true;
		}
	}
	return false;
}

function firstDetectedValue(
	manual: Record<string, unknown> | null,
	normalized: Record<string, unknown> | null,
	extracted: Record<string, unknown> | null,
	keys: string[],
): string {
	return (
		pickFirstString(manual, keys) ||
		pickFirstString(normalized, keys) ||
		pickFirstString(extracted, keys) ||
		""
	);
}

function pickFirstString(
	record: Record<string, unknown> | null,
	keys: string[],
): string {
	if (!record) {
		return "";
	}
	for (const key of keys) {
		const candidate = record[key];
		if (typeof candidate === "string") {
			const normalized = candidate.trim();
			if (normalized.length > 0) {
				return normalized;
			}
		}
	}
	return "";
}

function asRecord(
	value: Record<string, unknown> | null,
): Record<string, unknown> | null {
	return value;
}

function normalizeText(value: string | null): string {
	if (!value) {
		return "";
	}
	return value.trim();
}

function getPersistedFieldValue(
	field: Pick<
		DraftConfirmationFieldMap[DraftConfirmationFieldKey],
		"value" | "decision" | "initialValue"
	>,
): string {
	const currentValue = field.value.trim();
	if (field.decision === "confirm") {
		return currentValue;
	}

	const initialValue = field.initialValue.trim();
	if (!currentValue) {
		return "";
	}

	if (currentValue === initialValue) {
		return "";
	}

	return currentValue;
}

function buildInitialLocationState(params: {
	run: BulkImportRun;
	parentLocationItem: BulkImportItem | null;
	parentManual: Record<string, unknown> | null;
	name: string;
	city: string;
	state: string;
	address: string;
}): DraftConfirmationLocationState {
	const { run, parentLocationItem, parentManual, name, city, state, address } =
		params;

	if (run.entrypointType !== "company" || !parentLocationItem) {
		return {
			mode: "locked",
			name,
			city,
			state,
			address,
		};
	}

	const resolution = parseStoredLocationResolution(parentManual);
	if (resolution?.mode === "existing") {
		return {
			mode: "existing",
			locationId: resolution.locationId,
			name,
			city,
			state,
			address,
		};
	}

	if (resolution?.mode === "create_new") {
		return {
			mode: "create_new",
			name: resolution.name,
			city: resolution.city,
			state: resolution.state,
			address: resolution.address,
		};
	}

	return {
		mode: "locked",
		name,
		city,
		state,
		address,
	};
}

function parseStoredLocationResolution(
	parentManual: Record<string, unknown> | null,
):
	| {
			mode: "existing";
			locationId: string;
	  }
	| {
			mode: "create_new";
			name: string;
			city: string;
			state: string;
			address: string;
	  }
	| null {
	if (!parentManual) {
		return null;
	}

	const resolutionRaw = parentManual.location_resolution;
	if (!isRecordValue(resolutionRaw)) {
		return null;
	}

	if (
		resolutionRaw.mode === "existing" &&
		typeof resolutionRaw.location_id === "string" &&
		resolutionRaw.location_id.trim().length > 0
	) {
		return {
			mode: "existing",
			locationId: resolutionRaw.location_id,
		};
	}

	if (resolutionRaw.mode === "create_new") {
		const name =
			typeof resolutionRaw.name === "string" ? resolutionRaw.name.trim() : "";
		const city =
			typeof resolutionRaw.city === "string" ? resolutionRaw.city.trim() : "";
		const state =
			typeof resolutionRaw.state === "string" ? resolutionRaw.state.trim() : "";
		const address =
			typeof resolutionRaw.address === "string"
				? resolutionRaw.address.trim()
				: "";
		if (name && city && state) {
			return {
				mode: "create_new",
				name,
				city,
				state,
				address,
			};
		}
	}

	return null;
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function buildProjectNormalizedData(
	fields: DraftConfirmationFieldMap,
	projectItem: BulkImportItem,
): Record<string, unknown> {
	const existing = asRecord(projectItem.normalizedData);
	const materialName =
		getPersistedFieldValue(fields.materialName) ||
		getPersistedFieldValue(fields.materialType);
	const materialType = getPersistedFieldValue(fields.materialType);
	const composition = getPersistedFieldValue(fields.composition);
	const volume = getPersistedFieldValue(fields.volume);
	const frequency = getPersistedFieldValue(fields.frequency);
	const estimatedVolume = `${volume} / ${frequency}`;

	const projectType =
		pickFirstString(existing, ["project_type"]) ||
		pickFirstString(asRecord(projectItem.extractedData), ["project_type"]) ||
		"Assessment";
	const sector = pickFirstString(existing, ["sector"]);
	const subsector = pickFirstString(existing, ["subsector"]);

	return {
		name: materialName,
		category: materialType || null,
		project_type: projectType,
		description: composition || null,
		sector: sector || null,
		subsector: subsector || null,
		estimated_volume: estimatedVolume,
	};
}

function buildReviewNotes(fields: DraftConfirmationFieldMap): string {
	const parts: string[] = [];
	const frequency = getPersistedFieldValue(fields.frequency);
	if (frequency) {
		parts.push(`frequency: ${frequency}`);
	}
	const primaryContact = getPersistedFieldValue(fields.primaryContact);
	if (primaryContact) {
		parts.push(`primary_contact: ${primaryContact}`);
	}
	const composition = getPersistedFieldValue(fields.composition);
	if (composition) {
		parts.push(`composition: ${composition}`);
	}
	return parts.join(" | ");
}
