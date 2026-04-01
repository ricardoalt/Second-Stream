"use client";

import { Plus, RefreshCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

type TeamMembersPageContentProps = {
	organizationId?: string;
};

export function WorkspaceTeamMembersPageContent({
	organizationId,
}: TeamMembersPageContentProps) {
	const { user: currentUser, isSuperAdmin } = useAuth();
	const canViewUsers =
		isSuperAdmin ||
		Boolean(currentUser?.permissions?.includes(PERMISSIONS.ORG_USER_READ));
	const canCreateUsers =
		isSuperAdmin ||
		Boolean(currentUser?.permissions?.includes(PERMISSIONS.ORG_USER_CREATE));
	const canUpdateUsers =
		isSuperAdmin ||
		Boolean(currentUser?.permissions?.includes(PERMISSIONS.ORG_USER_UPDATE));
	const { currentOrganization, loadCurrentOrganization } =
		useOrganizationStore();

	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [isOrgActive, setIsOrgActive] = useState<boolean>(
		currentOrganization?.isActive ?? true,
	);

	const fetchUsers = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = organizationId
				? await organizationsAPI.listOrgUsers(organizationId)
				: await organizationsAPI.listMyOrgUsers();
			setUsers(data);
		} catch {
			toast.error("Failed to load users");
		} finally {
			setIsLoading(false);
		}
	}, [organizationId]);

	useEffect(() => {
		if (!canViewUsers) return;

		void fetchUsers();

		if (organizationId) {
			void organizationsAPI
				.get(organizationId)
				.then((org) => setIsOrgActive(org.isActive))
				.catch(() => {
					setIsOrgActive(true);
				});
			return;
		}

		void loadCurrentOrganization().then(() => {
			const { currentOrganization: org } = useOrganizationStore.getState();
			setIsOrgActive(org?.isActive ?? true);
		});
	}, [canViewUsers, loadCurrentOrganization, fetchUsers, organizationId]);

	const stats = useMemo(() => {
		const total = users.length;
		const active = users.filter((u) => u.isActive).length;
		const inactive = total - active;
		return { total, active, inactive };
	}, [users]);

	const handleCreateUser = async (data: OrgUserCreateInput) => {
		try {
			const newUser = organizationId
				? await organizationsAPI.createOrgUser(organizationId, data)
				: await organizationsAPI.createMyOrgUser(data);
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
			const updated = organizationId
				? await organizationsAPI.updateOrgUser(organizationId, userId, {
						role: newRole,
					})
				: await organizationsAPI.updateMyOrgUser(userId, {
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
			const updated = organizationId
				? await organizationsAPI.updateOrgUser(organizationId, userId, {
						isActive,
					})
				: await organizationsAPI.updateMyOrgUser(userId, {
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
		<div className="mx-auto w-full max-w-6xl space-y-6">
			<section className="space-y-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">
							Team Management
						</h1>
						<p className="text-sm text-muted-foreground">
							Manage organization members, role access, and activation status.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={fetchUsers}
							disabled={isLoading}
							className="h-9 w-9 text-muted-foreground hover:bg-transparent hover:text-foreground"
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
											size="sm"
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
						<AlertTitle>Organization inactive</AlertTitle>
						<AlertDescription>
							User changes are disabled until this organization is reactivated.
						</AlertDescription>
					</Alert>
				)}

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Card className="border-border/60 shadow-none">
						<CardContent className="p-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								Total Members
							</p>
							<p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
								{isLoading ? "—" : stats.total}
							</p>
						</CardContent>
					</Card>
					<Card className="border-border/60 shadow-none">
						<CardContent className="p-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								Active Members
							</p>
							<p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
								{isLoading ? "—" : stats.active}
							</p>
						</CardContent>
					</Card>
					<Card className="border-border/60 shadow-none">
						<CardContent className="p-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
								Inactive
							</p>
							<p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
								{isLoading ? "—" : stats.inactive}
							</p>
						</CardContent>
					</Card>
				</div>
			</section>

			<Card className="overflow-hidden border-border/60 shadow-none">
				<CardHeader className="border-b border-border/50 bg-muted/20 py-4">
					<CardTitle className="text-base">Organization Members</CardTitle>
					<CardDescription>
						Review users, update roles, and control member status.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="space-y-2 p-6">
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
