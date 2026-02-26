"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";
import { CreateLocationDialog } from "@/components/features/locations/create-location-dialog";
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
import { useLocationStore } from "@/lib/stores/location-store";
import { cn } from "@/lib/utils";

interface LocationComboboxProps {
	companyId: string;
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function LocationCombobox({
	companyId,
	value,
	onValueChange,
	placeholder = "Select location...",
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
	const selectedLocation = filteredLocations.find((l) => l.id === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("w-full justify-between h-12", className)}
					disabled={!companyId}
				>
					{selectedLocation
						? `${selectedLocation.name} - ${selectedLocation.city}`
						: placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0" align="start">
				<Command>
					<CommandInput placeholder="Search location..." />
					<CommandList>
						<CommandEmpty>No location found.</CommandEmpty>
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
										Create new location
									</button>
								}
							/>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
