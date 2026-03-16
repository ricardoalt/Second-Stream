"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";
import { CreateCompanyDialog } from "@/components/features/companies/create-company-dialog";
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
import { useCompanyStore } from "@/lib/stores/company-store";
import { cn } from "@/lib/utils";

interface CompanyComboboxProps {
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	showCreate?: boolean;
}

export function CompanyCombobox({
	value,
	onValueChange,
	placeholder = "Select company...",
	className,
	showCreate = true,
}: CompanyComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const { companies, loadCompanies } = useCompanyStore();

	// Load companies on mount
	React.useEffect(() => {
		loadCompanies();
	}, [loadCompanies]);

	const selectedCompany = companies.find((c) => c.id === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("w-full justify-between h-12", className)}
				>
					{selectedCompany ? selectedCompany.name : placeholder}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0" align="start">
				<Command>
					<CommandInput placeholder="Search company..." />
					<CommandList>
						<CommandEmpty>No company found.</CommandEmpty>
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
						{showCreate && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CreateCompanyDialog
										onSuccess={(company) => {
											loadCompanies();
											if (company) {
												onValueChange?.(company.id);
											}
											setOpen(false);
										}}
										trigger={
											<button
												type="button"
												className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary"
											>
												<Plus className="mr-2 h-4 w-4" />
												Create new company
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
