"use client";

/**
 * CompactSectorSelect - Inline industry/sub-industry selection
 *
 * Two-row layout:
 * 1. Industry: Simple Select with 20 industry options
 * 2. Sub-Industry: Searchable Combobox that updates based on industry, with custom option
 *
 * Note: Internal field names remain "sector/subsector" for API compatibility,
 * but UI labels show "Industry/Sub-Industry" to users.
 */

import {
	Beaker,
	Building,
	Building2,
	Car,
	Check,
	ChevronsUpDown,
	Factory,
	Flame,
	GraduationCap,
	HardHat,
	Heart,
	Hotel,
	Leaf,
	Monitor,
	Package,
	Recycle,
	ShoppingCart,
	Store,
	Target,
	Truck,
	Utensils,
	Zap,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";

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
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type {
	KnownSubsector,
	Sector,
	SectorGroupKey,
	Subsector,
} from "@/lib/sectors-config";
import {
	getSectorsByGroup,
	getSubsectors,
	SECTOR_GROUPS,
	sectorsConfig,
} from "@/lib/sectors-config";
import { cn } from "@/lib/utils";

// Icon mapping for industries
const SECTOR_ICONS = {
	manufacturing_industrial: Factory,
	automotive_transportation: Car,
	chemicals_pharmaceuticals: Beaker,
	oil_gas_energy: Flame,
	mining_metals_materials: HardHat,
	construction_infrastructure: Building,
	packaging_paper_printing: Package,
	food_beverage: Utensils,
	agriculture_forestry: Leaf,
	retail_wholesale_distribution: ShoppingCart,
	healthcare_medical: Heart,
	electronics_it_ewaste: Monitor,
	utilities_public_services: Zap,
	hospitality_commercial_services: Hotel,
	education_institutions: GraduationCap,
	logistics_transportation_services: Truck,
	environmental_waste_services: Recycle,
	consumer_goods_fmcg: Store,
	financial_commercial_offices: Building2,
	specialty_high_risk: Target,
} satisfies Record<Sector, typeof Target>;

interface CompactSectorSelectProps {
	sector: Sector | "";
	subsector: Subsector | "";
	onSectorChange: (sector: Sector) => void;
	onSubsectorChange: (subsector: Subsector) => void;
	disabled?: boolean;
	className?: string;
	/** Error message to display under sector select */
	error?: string | undefined;
}

export function CompactSectorSelect({
	sector,
	subsector,
	onSectorChange,
	onSubsectorChange,
	disabled = false,
	className,
	error,
}: CompactSectorSelectProps) {
	const [sectorOpen, setSectorOpen] = useState(false);
	const [sectorSearchValue, setSectorSearchValue] = useState("");
	const [subsectorOpen, setSubsectorOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");

	// Find selected sector config for display
	const selectedSectorConfig = useMemo(() => {
		if (!sector) return null;
		return sectorsConfig.find((s) => s.id === sector) || null;
	}, [sector]);

	// Get available subsectors for selected sector
	const availableSubsectors = useMemo(() => {
		if (!sector) return [];
		return getSubsectors(sector);
	}, [sector]);

	// Find selected subsector label
	const selectedSubsectorLabel = useMemo(() => {
		if (!subsector) return "";
		const found = availableSubsectors.find((s) => s.id === subsector);
		return found?.label ?? subsector.replace(/_/g, " ");
	}, [subsector, availableSubsectors]);

	// Handle sector change - reset subsector
	const handleSectorChange = (newSector: Sector) => {
		onSectorChange(newSector);
		// Auto-select first subsector or clear
		const newSubsectors = getSubsectors(newSector);
		if (newSubsectors.length > 0 && newSubsectors[0]) {
			onSubsectorChange(newSubsectors[0].id);
		} else {
			onSubsectorChange("");
		}
		setSectorSearchValue("");
		setSectorOpen(false);
	};

	// Handle subsector selection (from list or custom)
	const handleSubsectorSelect = (value: KnownSubsector) => {
		onSubsectorChange(value);
		setSearchValue("");
		setSubsectorOpen(false);
	};

	// Handle creating custom subsector from search input
	const handleCreateCustom = () => {
		const trimmed = searchValue.trim();
		if (!trimmed) return;
		// Convert to slug format for storage
		const slug = trimmed
			.toLowerCase()
			.replace(/\s+/g, "_")
			.replace(/[^a-z0-9_]/g, "");
		if (!slug) return;
		onSubsectorChange(slug);
		setSearchValue("");
		setSubsectorOpen(false);
	};

	// Check if search matches any existing option
	const normalizedSearch = searchValue.trim().toLowerCase();
	const hasExactMatch = availableSubsectors.some(
		(s) => s.label.toLowerCase() === normalizedSearch,
	);

	// Group keys for iteration
	const groupKeys: SectorGroupKey[] = [
		"production",
		"materials",
		"food",
		"services",
		"technology",
	];
	const sectorIcons = SECTOR_ICONS;

	return (
		<div className={cn("space-y-4", className)}>
			{/* Industry Combobox - Searchable with groups */}
			<div className="grid gap-2">
				<Label htmlFor="sector">
					Industry <span className="text-destructive">*</span>
				</Label>
				<Popover open={sectorOpen} onOpenChange={setSectorOpen}>
					<PopoverTrigger asChild>
						<Button
							id="sector"
							variant="outline"
							role="combobox"
							aria-expanded={sectorOpen}
							disabled={disabled}
							className={cn(
								"w-full justify-between py-2.5 font-normal",
								!sector && "text-muted-foreground",
							)}
						>
							{selectedSectorConfig ? (
								<span className="flex items-center gap-2">
									{(() => {
										const Icon = sectorIcons[selectedSectorConfig.id] || Target;
										return (
											<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
										);
									})()}
									<span className="truncate">{selectedSectorConfig.label}</span>
								</span>
							) : (
								"Select industry..."
							)}
							<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-[--radix-popover-trigger-width] p-0 max-h-[var(--radix-popover-content-available-height)] overflow-hidden"
						align="start"
						portalled={false}
					>
						<Command className="max-h-[var(--radix-popover-content-available-height)]">
							<CommandInput
								placeholder="Search industries..."
								value={sectorSearchValue}
								onValueChange={setSectorSearchValue}
							/>
							<CommandList className="max-h-[calc(var(--radix-popover-content-available-height)-2.75rem)]">
								<CommandEmpty>No industries found.</CommandEmpty>
								{groupKeys.map((groupKey, index) => {
									const group = SECTOR_GROUPS[groupKey];
									const groupSectors = getSectorsByGroup(groupKey);

									return (
										<Fragment key={groupKey}>
											{index > 0 && <CommandSeparator />}
											<CommandGroup heading={group.label}>
												{groupSectors.map((sectorConfig) => {
													const Icon = sectorIcons[sectorConfig.id] || Target;
													return (
														<CommandItem
															key={sectorConfig.id}
															value={sectorConfig.label}
															onSelect={() =>
																handleSectorChange(sectorConfig.id)
															}
															className="py-2.5"
														>
															<Check
																className={cn(
																	"mr-2 h-4 w-4 shrink-0",
																	sector === sectorConfig.id
																		? "opacity-100"
																		: "opacity-0",
																)}
															/>
															<Icon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
															<span className="truncate">
																{sectorConfig.label}
															</span>
														</CommandItem>
													);
												})}
											</CommandGroup>
										</Fragment>
									);
								})}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>

			{/* Sub-Industry Combobox - Creatable */}
			<div className="grid gap-2">
				<Label htmlFor="subsector">
					Sub-Industry{" "}
					<span className="text-xs text-muted-foreground">
						(type to search or create)
					</span>
				</Label>

				<Popover open={subsectorOpen} onOpenChange={setSubsectorOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={subsectorOpen}
							disabled={disabled || !sector}
							className={cn(
								"w-full justify-between font-normal",
								!subsector && "text-muted-foreground",
							)}
						>
							{sector
								? selectedSubsectorLabel || "Select or type sub-industry..."
								: "Select industry first..."}
							<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-[--radix-popover-trigger-width] p-0 max-h-[var(--radix-popover-content-available-height)] overflow-hidden"
						align="start"
						portalled={false}
					>
						<Command
							shouldFilter={false}
							className="max-h-[var(--radix-popover-content-available-height)]"
						>
							<CommandInput
								placeholder="Search or type new..."
								value={searchValue}
								onValueChange={setSearchValue}
								onKeyDown={(e) => {
									if (e.key === "Enter" && searchValue && !hasExactMatch) {
										e.preventDefault();
										handleCreateCustom();
									}
								}}
							/>
							<CommandList className="max-h-[calc(var(--radix-popover-content-available-height)-2.75rem)]">
								<CommandGroup>
									{/* Filter and show matching options */}
									{availableSubsectors
										.filter(
											(s) =>
												!searchValue ||
												s.label
													.toLowerCase()
													.includes(searchValue.toLowerCase()),
										)
										.map((subsectorOption) => (
											<CommandItem
												key={subsectorOption.id}
												value={subsectorOption.id}
												onSelect={() =>
													handleSubsectorSelect(subsectorOption.id)
												}
											>
												<Check
													className={cn(
														"mr-2 h-4 w-4",
														subsector === subsectorOption.id
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												{subsectorOption.label}
											</CommandItem>
										))}

									{/* Show create option when typing something new */}
									{searchValue && !hasExactMatch && (
										<CommandItem
											value={`create-${searchValue}`}
											onSelect={handleCreateCustom}
											className="border-t"
										>
											<span className="text-primary">
												Create "{searchValue}"
											</span>
										</CommandItem>
									)}
								</CommandGroup>

								{/* Empty state when no matches */}
								{searchValue &&
									!hasExactMatch &&
									availableSubsectors.filter((s) =>
										s.label.toLowerCase().includes(searchValue.toLowerCase()),
									).length === 0 && (
										<div className="py-2 px-3 text-sm text-muted-foreground">
											Press Enter to create
										</div>
									)}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

/**
 * Helper to format sub-industry for display
 */
export function formatSubsector(subsector: string): string {
	// Check if it's a known subsector
	for (const sector of sectorsConfig) {
		const found = sector.subsectors.find((s) => s.id === subsector);
		if (found) return found.label;
	}
	// Custom subsector - format the slug
	return subsector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
