"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";
import { AddClientDialog } from "@/components/features/clients/add-client-dialog";
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
	buildAiCreateCompanySelection,
	parseAiCreateCompanySelection,
} from "@/lib/discovery-ai-suggestions";
import { useCompanyStore } from "@/lib/stores/company-store";
import { cn } from "@/lib/utils";

interface CompanyComboboxProps {
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	suggestedValue?: string | null;
	isSuggestedAccepted?: boolean;
	className?: string;
	showCreate?: boolean;
	disabled?: boolean;
}

export function resolveCompanyTriggerLabel(params: {
	selectedCompanyName: string | null;
	suggestedValue: string | null;
	isSuggestedAccepted?: boolean;
	placeholder: string;
}): string {
	const {
		selectedCompanyName,
		suggestedValue,
		isSuggestedAccepted = false,
		placeholder,
	} = params;
	if (selectedCompanyName && selectedCompanyName.trim().length > 0) {
		return selectedCompanyName;
	}

	const normalizedSuggested = (suggestedValue ?? "").trim();
	if (normalizedSuggested.length > 0) {
		if (isSuggestedAccepted) {
			return `Create "${normalizedSuggested}" from AI suggestion`;
		}
		return `AI suggested: ${normalizedSuggested} (not selected)`;
	}

	return placeholder;
}

export function CompanyCombobox({
	value,
	onValueChange,
	placeholder = "Select company...",
	suggestedValue,
	isSuggestedAccepted = false,
	className,
	showCreate = true,
	disabled = false,
}: CompanyComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const { companies, loadCompanies } = useCompanyStore();

	// Load companies on mount
	React.useEffect(() => {
		loadCompanies();
	}, [loadCompanies]);

	const selectedCompany = companies.find((c) => c.id === value);
	const normalizedSuggestedValue = (suggestedValue ?? "").trim();
	const hasSuggestedValue =
		!selectedCompany && normalizedSuggestedValue.length > 0;
	const triggerLabel = resolveCompanyTriggerLabel({
		selectedCompanyName: selectedCompany?.name ?? null,
		suggestedValue: normalizedSuggestedValue,
		isSuggestedAccepted:
			isSuggestedAccepted ||
			(parseAiCreateCompanySelection(value ?? "") !== null && !selectedCompany),
		placeholder,
	});

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("h-12 w-full min-w-0 justify-between gap-2", className)}
					disabled={disabled}
				>
					<span className="min-w-0 flex-1 truncate text-left">
						{triggerLabel}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] max-h-[var(--radix-popover-content-available-height)] overflow-hidden p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search company..." />
					<CommandList className="max-h-[calc(var(--radix-popover-content-available-height)-2.5rem)]">
						<CommandEmpty>No company found.</CommandEmpty>
						{hasSuggestedValue ? (
							<CommandGroup heading="AI suggestion">
								<CommandItem
									value={buildAiCreateCompanySelection(
										normalizedSuggestedValue,
									)}
									onSelect={() => {
										onValueChange?.(
											buildAiCreateCompanySelection(normalizedSuggestedValue),
										);
										setOpen(false);
									}}
								>
									Create "{normalizedSuggestedValue}" from AI suggestion
								</CommandItem>
							</CommandGroup>
						) : null}
						<CommandGroup>
							{companies.map((company) => (
								<CommandItem
									key={company.id}
									value={company.name}
									onSelect={() => {
										onValueChange?.(company.id);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === company.id ? "opacity-100" : "opacity-0",
										)}
									/>
									{company.name}
								</CommandItem>
							))}
						</CommandGroup>
						{showCreate && !disabled && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<AddClientDialog
										onSuccessWithClient={(clientId) => {
											void loadCompanies();
											onValueChange?.(clientId);
											setOpen(false);
										}}
										trigger={
											<button
												type="button"
												className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary"
											>
												<Plus className="mr-2 h-4 w-4" />
												Add New Client
											</button>
										}
									/>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
