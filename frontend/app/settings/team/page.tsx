"use client";

import {
	AlertTriangle,
	CheckCircle,
	Plus,
	RefreshCcw,
	Users,
	XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminStatsCard } from "@/components/features/admin";
import { Skeleton } from "@/components/ui/skeleton";

const AddUserModal = dynamic(
	() =>
		import("@/components/features/admin/add-user-modal").then(
			(mod) => mod.AddUserModal,
		),
	{ ssr: false, loading: () => null },
);

const UsersTable = dynamic(
	() =>
		import("@/components/features/admin/users-table").then(
			(mod) => mod.UsersTable,
		),
	{
		ssr: false,
		loading: () => (
			<div className="space-y-3">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		),
	},
);

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { APIClientError } from "@/lib/api/client";
import {
	type OrgUserCreateInput,
	organizationsAPI,
} from "@/lib/api/organizations";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { useAuth } from "@/lib/contexts";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import type { User, UserRole } from "@/lib/types/user";

export default function SettingsTeamPage() {
	const { user: currentUser, isSuperAdmin } = useAuth();
	const canViewUsers = Boolean(
		currentUser?.permissions?.includes(PERMISSIONS.ORG_USER_READ),
	);
	const canCreateUsers = Boolean(
		currentUser?.permissions?.includes(PERMISSIONS.ORG_USER_CREATE),
	);
	const canUpdateUsers = Boolean(
		currentUser?.permissions?.includes(PERMISSIONS.ORG_USER_UPDATE),
	);
	const { currentOrganization, loadCurrentOrganization } =
		useOrganizationStore();

	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const isOrgActive = currentOrganization?.isActive ?? true;

	const fetchUsers = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await organizationsAPI.listMyOrgUsers();
			setUsers(data);
		} catch {
			toast.error("Failed to load users");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!canViewUsers) return;
		void fetchUsers();
		void loadCurrentOrganization();
	}, [canViewUsers, loadCurrentOrganization, fetchUsers]);

	const stats = useMemo(() => {
		const total = users.length;
		const active = users.filter((u) => u.isActive).length;
		const inactive = total - active;
		return { total, active, inactive };
	}, [users]);

	const handleCreateUser = async (data: OrgUserCreateInput) => {
		try {
			const newUser = await organizationsAPI.createMyOrgUser(data);
			setUsers((prev) => [...prev, newUser]);
			toast.success(`User "${newUser.email}" created`);
		} catch (error: unknown) {
			const message =
				error instanceof APIClientError
					? error.message
					: error instanceof Error
						? error.message
						: "Failed to create user";
			toast.error(message);
			throw error;
		}
	};

	const handleRoleChange = async (
		userId: string,
		newRole: Exclude<UserRole, "admin">,
	) => {
		try {
			const updated = await organizationsAPI.updateMyOrgUser(userId, {
				role: newRole,
			});
			setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
			toast.success("Role updated");
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to update role";
			toast.error(message);
			throw error;
		}
	};

	const handleStatusChange = async (userId: string, isActive: boolean) => {
		try {
			const updated = await organizationsAPI.updateMyOrgUser(userId, {
				isActive,
			});
			setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
			toast.success(isActive ? "User activated" : "User deactivated");
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to update status";
			toast.error(message);
			throw error;
		}
	};

	if (!canViewUsers) {
		if (isSuperAdmin) {
			return (
				<div className="flex items-center justify-center min-h-[400px]">
					<p className="text-muted-foreground">
						Platform Admins should manage teams via Admin Console.
					</p>
				</div>
			);
		}
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground">
					Access denied. Only Org Admins can manage team members.
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Organization Members
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Members of your organization
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={fetchUsers}
						disabled={isLoading}
					>
						<RefreshCcw
							className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
						/>
					</Button>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span tabIndex={!isOrgActive ? 0 : undefined}>
									<Button
										onClick={() => setModalOpen(true)}
										disabled={!isOrgActive || !canCreateUsers}
									>
										<Plus className="h-4 w-4 mr-2" />
										Add Member
									</Button>
								</span>
							</TooltipTrigger>
							{!isOrgActive && (
								<TooltipContent>
									<p>Reactivate organization to add members</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
			{!isOrgActive && (
				<Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Organization inactive</AlertTitle>
					<AlertDescription>
						User changes are disabled until this organization is reactivated.
					</AlertDescription>
				</Alert>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<AdminStatsCard
					label="Total Members"
					value={stats.total}
					icon={Users}
					variant="default"
				/>
				<AdminStatsCard
					label="Active Members"
					value={stats.active}
					icon={CheckCircle}
					variant="success"
				/>
				<AdminStatsCard
					label="Inactive"
					value={stats.inactive}
					icon={XCircle}
					variant="muted"
				/>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-lg">Organization Members</CardTitle>
							<CardDescription>
								People with access to your organization
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : (
						<UsersTable
							users={users}
							currentUserId={currentUser?.id}
							canEditRoles={isOrgActive && canUpdateUsers}
							canEditStatus={isOrgActive && canUpdateUsers}
							onRoleChange={handleRoleChange}
							onStatusChange={handleStatusChange}
						/>
					)}
				</CardContent>
			</Card>

			<AddUserModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				onSubmit={handleCreateUser}
			/>
		</div>
	);
}
