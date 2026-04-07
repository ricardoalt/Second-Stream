import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Ban, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AdminUpdateUserInput } from "@/lib/api/admin-users";
import { formatMemberSince } from "@/lib/format";
import type { User } from "@/lib/types/user";
import { getTooltipMessage } from "../utils";

export interface ColumnDeps {
	currentUserId: string | undefined;
	lastActiveAdminId: string | null;
	updatingUserId: string | null;
	onUpdateUser: (
		userId: string,
		updates: AdminUpdateUserInput,
		successMessage: string,
	) => Promise<{ ok: boolean }>;
	onOpenResetDialog: (userId: string) => void;
}

export function getColumns(deps: ColumnDeps): ColumnDef<User>[] {
	const {
		currentUserId,
		lastActiveAdminId,
		updatingUserId,
		onUpdateUser,
		onOpenResetDialog,
	} = deps;

	return [
		{
			accessorKey: "firstName",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8 px-2 -ml-2"
				>
					Name
					<ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
				</Button>
			),
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-medium truncate">
								{user.firstName} {user.lastName}
							</span>
							{currentUserId === user.id && (
								<Badge variant="outline" className="text-xs">
									You
								</Badge>
							)}
							{user.isSuperuser && (
								<Badge variant="warning-subtle" className="text-xs">
									Admin
								</Badge>
							)}
						</div>
						<div className="text-xs text-muted-foreground">
							Member since {formatMemberSince(user.createdAt)}
						</div>
					</div>
				);
			},
		},
		{
			accessorKey: "email",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8 px-2 -ml-2"
				>
					Email
					<ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
				</Button>
			),
			cell: ({ row }) => (
				<span className="font-mono text-sm truncate block max-w-[200px]">
					{row.getValue("email")}
				</span>
			),
		},
		{
			accessorKey: "isActive",
			header: "Status",
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="flex flex-col space-y-0.5">
						<span
							className={
								user.isActive ? "text-success" : "text-muted-foreground"
							}
						>
							{user.isActive ? "Active" : "Disabled"}
						</span>
						{!user.isVerified && (
							<span className="text-xs text-muted-foreground">Unverified</span>
						)}
					</div>
				);
			},
			filterFn: (row, id, value) => {
				if (value === "all") return true;
				return row.getValue(id) === (value === "active");
			},
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			cell: ({ row }) => {
				const user = row.original;
				const isSelf = currentUserId === user.id;
				const isLastActiveAdmin =
					user.isSuperuser && user.isActive && lastActiveAdminId === user.id;
				const isTenantUser = user.organizationId !== null;
				const disableRoleChange = isSelf || isLastActiveAdmin || isTenantUser;
				const disableStatusChange = isSelf || isLastActiveAdmin || isTenantUser;

				const flags = { isTenantUser, isSelf, isLastActiveAdmin };
				const roleTooltipMessage = getTooltipMessage("role", flags);
				const statusTooltipMessage = getTooltipMessage("status", flags);

				const roleButton = (
					<Button
						variant={user.isSuperuser ? "outline" : "secondary"}
						size="sm"
						disabled={disableRoleChange || updatingUserId === user.id}
						onClick={() => {
							if (user.isSuperuser) return;
							void onUpdateUser(
								user.id,
								{ isSuperuser: true, role: "admin" },
								`${user.firstName} promoted to Admin`,
							);
						}}
					>
						{updatingUserId === user.id ? (
							<RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
						) : user.isSuperuser ? (
							"Admin"
						) : (
							"Make Admin"
						)}
					</Button>
				);

				const statusButton = (
					<Button
						variant={user.isActive ? "destructive" : "secondary"}
						size="sm"
						disabled={disableStatusChange || updatingUserId === user.id}
						aria-label={user.isActive ? "Deactivate user" : "Activate user"}
						onClick={() =>
							void onUpdateUser(
								user.id,
								{ isActive: !user.isActive },
								user.isActive
									? `${user.firstName} deactivated`
									: `${user.firstName} reactivated`,
							)
						}
					>
						{updatingUserId === user.id ? (
							<RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
						) : user.isActive ? (
							<Ban className="h-4 w-4" aria-hidden="true" />
						) : (
							"Activate"
						)}
					</Button>
				);

				return (
					<div className="flex items-center justify-end gap-2">
						{roleTooltipMessage ? (
							<Tooltip>
								<TooltipTrigger asChild>{roleButton}</TooltipTrigger>
								<TooltipContent>{roleTooltipMessage}</TooltipContent>
							</Tooltip>
						) : (
							roleButton
						)}
						{statusTooltipMessage ? (
							<Tooltip>
								<TooltipTrigger asChild>{statusButton}</TooltipTrigger>
								<TooltipContent>{statusTooltipMessage}</TooltipContent>
							</Tooltip>
						) : (
							statusButton
						)}
						<Button
							variant="outline"
							size="sm"
							disabled={isTenantUser}
							title={
								isTenantUser
									? "Manage tenant users via organizations"
									: undefined
							}
							onClick={() => onOpenResetDialog(user.id)}
						>
							Reset
						</Button>
					</div>
				);
			},
		},
	];
}
