"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import type { User } from "@/lib/types/user";
import { cn } from "@/lib/utils";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

export function resolveAssignOwnerPopoverMode(): boolean {
	return false;
}

export function resolveAssignOwnerCommandListClassName(): string {
	return "max-h-[calc(var(--radix-popover-content-available-height)-2.5rem)] overscroll-contain";
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

export function AgentOwnerCombobox({
	owners,
	selectedOwnerUserId,
	onOwnerChange,
	placeholder = "Assign owner",
	searchPlaceholder = "Search owner by name or email...",
	allowClear = true,
}: {
	owners: User[];
	selectedOwnerUserId: string;
	onOwnerChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	allowClear?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const selectedOwner = owners.find((owner) => owner.id === selectedOwnerUserId);

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
						<span className="truncate">{placeholder}</span>
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				portalled={resolveAssignOwnerPopoverMode()}
				className="w-[--radix-popover-trigger-width] max-h-[var(--radix-popover-content-available-height)] overflow-hidden p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList className={resolveAssignOwnerCommandListClassName()}>
						<CommandEmpty>No matching agents found.</CommandEmpty>
						<CommandGroup>
							{owners.map((owner) => (
								<CommandItem
									key={owner.id}
									value={getAssignableOwnerSearchText(owner)}
									onSelect={() => {
										onOwnerChange(
											allowClear && owner.id === selectedOwnerUserId
												? ""
												: owner.id,
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
