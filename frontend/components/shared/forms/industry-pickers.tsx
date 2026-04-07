"use client";

import { Check, ChevronsUpDown, Factory } from "lucide-react";
import { type ComponentProps, useState } from "react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui";
import {
	getSectorsByGroup,
	getSubsectors,
	type Sector,
	SECTOR_GROUPS,
	sectorsConfig,
} from "@/lib/sectors-config";
import { cn } from "@/lib/utils";

type TriggerA11yProps = Pick<
	ComponentProps<"button">,
	"aria-invalid" | "aria-describedby"
>;

export function IndustryPicker({
	value,
	onValueChange,
	id,
	triggerClassName,
	...triggerProps
}: {
	value: string;
	onValueChange: (value: Sector) => void;
	id?: string;
	triggerClassName?: string;
} & TriggerA11yProps) {
	const [open, setOpen] = useState(false);
	const selectedLabel = sectorsConfig.find((sector) => sector.id === value)?.label;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-surface-container-low/60 px-3 text-sm transition-colors",
						"hover:bg-surface-container-low/80",
						"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
						!value && "text-muted-foreground",
						triggerClassName,
					)}
					{...triggerProps}
				>
					<Factory className="size-4 shrink-0 text-muted-foreground/50" />
					<span className="flex-1 truncate text-left">
						{selectedLabel ?? "Select industry"}
					</span>
					<ChevronsUpDown className="size-4 shrink-0 opacity-40" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="p-0"
				align="start"
				style={{ width: "var(--radix-popover-trigger-width)" }}
			>
				<Command>
					<CommandInput placeholder="Search industry…" />
					<CommandList>
						<CommandEmpty>No industry found.</CommandEmpty>
						{(
							Object.keys(SECTOR_GROUPS) as Array<keyof typeof SECTOR_GROUPS>
						).map((groupKey) => {
							const group = SECTOR_GROUPS[groupKey];
							const sectors = getSectorsByGroup(groupKey);
							return (
								<CommandGroup key={groupKey} heading={group.label}>
									{sectors.map((sector) => (
										<CommandItem
											key={sector.id}
											value={sector.label}
											onSelect={() => {
												onValueChange(sector.id);
												setOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 size-4",
													value === sector.id ? "opacity-100" : "opacity-0",
												)}
											/>
											{sector.label}
										</CommandItem>
									))}
								</CommandGroup>
							);
						})}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export function SubIndustryPicker({
	value,
	onValueChange,
	sector,
	id,
	triggerClassName,
	...triggerProps
}: {
	value: string;
	onValueChange: (value: string) => void;
	sector: Sector | "";
	id?: string;
	triggerClassName?: string;
} & TriggerA11yProps) {
	const [open, setOpen] = useState(false);
	const options = sector ? getSubsectors(sector) : [];
	const disabled = !sector;
	const selectedLabel = options.find((subsector) => subsector.id === value)?.label;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"flex h-10 w-full items-center gap-2 rounded-md border border-input bg-surface-container-low/60 px-3 text-sm transition-colors",
						"hover:bg-surface-container-low/80",
						"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
						"disabled:cursor-not-allowed disabled:opacity-50",
						!value && "text-muted-foreground",
						triggerClassName,
					)}
					{...triggerProps}
				>
					<span className="flex-1 truncate text-left">
						{selectedLabel ??
							(disabled ? "Select industry first" : "Select sub-industry")}
					</span>
					<ChevronsUpDown className="size-4 shrink-0 opacity-40" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="p-0"
				align="start"
				style={{ width: "var(--radix-popover-trigger-width)" }}
			>
				<Command>
					<CommandInput placeholder="Search sub-industry…" />
					<CommandList>
						<CommandEmpty>No sub-industry found.</CommandEmpty>
						<CommandGroup>
							{options.map((subsector) => (
								<CommandItem
									key={subsector.id}
									value={subsector.label}
									onSelect={() => {
										onValueChange(subsector.id);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 size-4",
											value === subsector.id ? "opacity-100" : "opacity-0",
										)}
									/>
									{subsector.label}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
