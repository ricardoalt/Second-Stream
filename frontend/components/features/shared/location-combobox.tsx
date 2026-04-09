"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";
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
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	buildAiCreateLocationSelection,
	parseAiCreateLocationSelection,
} from "@/lib/discovery-ai-suggestions";
import { useLocationStore } from "@/lib/stores/location-store";
import { cn } from "@/lib/utils";

interface LocationComboboxProps {
	companyId: string;
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	suggestedValue?: string | null;
	canCreateFromSuggestion?: boolean;
	isSuggestedAccepted?: boolean;
	allowSuggestionWithoutCompany?: boolean;
	className?: string;
}

export function hasLocationAiSuggestion(
	suggestedValue?: string | null,
): boolean {
	return (suggestedValue ?? "").trim().length > 0;
}

export function resolveLocationAiSuggestionState(params: {
	suggestedValue?: string | null;
	canCreateFromSuggestion: boolean;
}): {
	hasSuggestion: boolean;
	normalizedSuggestedValue: string;
	secondaryText: string;
	disabled: boolean;
} {
	const normalizedSuggestedValue = (params.suggestedValue ?? "").trim();
	const hasSuggestion = normalizedSuggestedValue.length > 0;
	const disabled = !params.canCreateFromSuggestion;

	return {
		hasSuggestion,
		normalizedSuggestedValue,
		secondaryText: disabled ? "Needs city/state" : "Auto-create on confirm",
		disabled,
	};
}

export function resolveLocationTriggerState(params: {
	selectedLocationLabel: string | null;
	suggestedValue: string | null;
	isSuggestedAccepted?: boolean;
	placeholder: string;
}): { label: string; showAutoCreateBadge: boolean } {
	const {
		selectedLocationLabel,
		suggestedValue,
		isSuggestedAccepted = false,
		placeholder,
	} = params;

	if (selectedLocationLabel && selectedLocationLabel.trim().length > 0) {
		return { label: selectedLocationLabel, showAutoCreateBadge: false };
	}

	const normalizedSuggested = (suggestedValue ?? "").trim();
	if (normalizedSuggested.length > 0 && isSuggestedAccepted) {
		return { label: normalizedSuggested, showAutoCreateBadge: true };
	}

	return { label: placeholder, showAutoCreateBadge: false };
}

export function resolveLocationTriggerLabel(params: {
	selectedLocationLabel: string | null;
	suggestedValue: string | null;
	isSuggestedAccepted?: boolean;
	canCreateFromSuggestion?: boolean;
	placeholder: string;
}): string {
	return resolveLocationTriggerState(params).label;
}

export function LocationCombobox({
	companyId,
	value,
	onValueChange,
	placeholder = "Select location...",
	suggestedValue,
	canCreateFromSuggestion,
	isSuggestedAccepted = false,
	allowSuggestionWithoutCompany = false,
	className,
}: LocationComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const { locations, loadLocationsByCompany } = useLocationStore();

	// Load locations when companyId changes
	React.useEffect(() => {
		if (companyId) {
			loadLocationsByCompany(companyId);
		}
	}, [companyId, loadLocationsByCompany]);

	const filteredLocations = locations.filter((l) => l.companyId === companyId);
	const validValue = value && filteredLocations.some((l) => l.id === value);
	const selectedLocation = validValue
		? filteredLocations.find((l) => l.id === value)
		: undefined;
	const normalizedSuggestedValue = (suggestedValue ?? "").trim();
	const hasSuggestedValue = hasLocationAiSuggestion(normalizedSuggestedValue);
	const canCreateFromSuggestionResolved =
		canCreateFromSuggestion ??
		((suggestedValue ?? "").trim().length > 0 &&
			(suggestedValue ?? "").includes(" - "));
	const triggerState = resolveLocationTriggerState({
		selectedLocationLabel: selectedLocation
			? `${selectedLocation.name} - ${selectedLocation.city}`
			: null,
		suggestedValue: normalizedSuggestedValue,
		isSuggestedAccepted:
			isSuggestedAccepted ||
			(parseAiCreateLocationSelection(value ?? "") !== null &&
				!selectedLocation),
		placeholder,
	});
	const aiSuggestionState = resolveLocationAiSuggestionState({
		suggestedValue: normalizedSuggestedValue,
		canCreateFromSuggestion: canCreateFromSuggestionResolved,
	});
	const hasValidCompanyId = companyId.trim().length > 0;
	const canOpenWithoutCompany =
		allowSuggestionWithoutCompany && canCreateFromSuggestionResolved;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("h-12 w-full min-w-0 justify-between gap-2", className)}
					disabled={!hasValidCompanyId && !canOpenWithoutCompany}
					onClick={() => {
						if (
							value &&
							!validValue &&
							parseAiCreateLocationSelection(value) === null
						) {
							onValueChange?.("");
						}
					}}
				>
					<div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
						<span className="min-w-0 truncate text-left">
							{triggerState.label}
						</span>
						{triggerState.showAutoCreateBadge ? (
							<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
								Auto-create
							</Badge>
						) : null}
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] max-h-[var(--radix-popover-content-available-height)] overflow-hidden p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search location..." />
					<CommandList className="max-h-[calc(var(--radix-popover-content-available-height)-2.5rem)]">
						<CommandEmpty>No location found.</CommandEmpty>
						{hasSuggestedValue ? (
							<CommandGroup heading="AI suggestion">
								{aiSuggestionState.disabled ? (
									<CommandItem
										disabled
										value={`AI suggested ${aiSuggestionState.normalizedSuggestedValue}`}
									>
										<div className="flex flex-col">
											<span className="font-medium">
												{aiSuggestionState.normalizedSuggestedValue}
											</span>
											<span className="text-xs text-muted-foreground">
												{aiSuggestionState.secondaryText}
											</span>
										</div>
									</CommandItem>
								) : (
									<CommandItem
										value={buildAiCreateLocationSelection(
											normalizedSuggestedValue,
										)}
										onSelect={() => {
											onValueChange?.(
												buildAiCreateLocationSelection(
													normalizedSuggestedValue,
												),
											);
											setOpen(false);
										}}
									>
										<div className="flex flex-col">
											<span className="font-medium">
												{aiSuggestionState.normalizedSuggestedValue}
											</span>
											<span className="text-xs text-muted-foreground">
												{aiSuggestionState.secondaryText}
											</span>
										</div>
									</CommandItem>
								)}
							</CommandGroup>
						) : null}
						<CommandGroup>
							{filteredLocations.map((location) => (
								<CommandItem
									key={location.id}
									value={`${location.name} ${location.city}`}
									onSelect={() => {
										onValueChange?.(location.id);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === location.id ? "opacity-100" : "opacity-0",
										)}
									/>
									<div className="flex flex-col">
										<span className="font-medium">{location.name}</span>
										<span className="text-xs text-muted-foreground">
											{location.city}
										</span>
									</div>
								</CommandItem>
							))}
						</CommandGroup>
						{hasValidCompanyId ? (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CreateLocationDialog
										companyId={companyId}
										onSuccess={(location) => {
											loadLocationsByCompany(companyId);
											if (!location) return;
											onValueChange?.(location.id);
											setOpen(false);
										}}
										trigger={
											<button
												type="button"
												className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary"
											>
												<Plus className="mr-2 h-4 w-4" />
												Add New Location
											</button>
										}
									/>
								</CommandGroup>
							</>
						) : null}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
