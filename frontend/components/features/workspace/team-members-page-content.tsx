"use client";

import {
	Layers,
	Plus,
	RefreshCcw,
	UserCheck,
	Users,
	UserX,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KpiCard } from "@/components/patterns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import type { User } from "@/lib/types/user";
import { cn } from "@/lib/utils";

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
			<div className="space-y-3 p-6">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
			</div>
		),
	},
);

// Extended user with real calculated streams count
type UserWithStreams = User & { openStreamsCount: number };

type TeamMembersPageContentProps = {
	organizationId?: string;
};

export function WorkspaceTeamMembersPageContent({
	organizationId,
}: TeamMembersPageContentProps) {
	const router = useRouter();
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

	const [users, setUsers] = useState<UserWithStreams[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [isOrgActive, setIsOrgActive] = useState<boolean | null>(
		currentOrganization?.isActive ?? null,
	);
	const orgAllowsUserChanges = isOrgActive === true;

	const fetchData = useCallback(async () => {
		try {
			setIsLoading(true);

			const usersData = organizationId
				? await organizationsAPI.listOrgUsers(organizationId)
				: await organizationsAPI.listMyOrgUsers();
			const usersWithStreams: UserWithStreams[] = usersData.map((user) => ({
				...user,
				openStreamsCount: user.openStreamsCount ?? 0,
			}));

			setUsers(usersWithStreams);
		} catch {
			toast.error("Failed to load team data");
		} finally {
			setIsLoading(false);
		}
	}, [organizationId]);

	useEffect(() => {
		if (!canViewUsers) return;

		void fetchData();

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
	}, [canViewUsers, loadCurrentOrganization, fetchData, organizationId]);

	const stats = useMemo(() => {
		const total = users.length;
		const active = users.filter((u) => u.isActive).length;
		const inactive = total - active;
		const totalOpenStreams = users.reduce(
			(sum, u) => sum + (u.openStreamsCount ?? 0),
			0,
		);
		return { total, active, inactive, totalOpenStreams };
	}, [users]);

	const handleCreateUser = async (data: OrgUserCreateInput) => {
		try {
			const newUser = organizationId
				? await organizationsAPI.createOrgUser(organizationId, data)
				: await organizationsAPI.createMyOrgUser(data);
			setUsers((prev) => [...prev, { ...newUser, openStreamsCount: 0 }]);
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
		newRole: Exclude<import("@/lib/types/user").UserRole, "admin">,
	) => {
		try {
			const updated = organizationId
				? await organizationsAPI.updateOrgUser(organizationId, userId, {
						role: newRole,
					})
				: await organizationsAPI.updateMyOrgUser(userId, {
						role: newRole,
					});
			setUsers((prev) =>
				prev.map((u) =>
					u.id === userId
						? { ...updated, openStreamsCount: u.openStreamsCount }
						: u,
				),
			);
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
			setUsers((prev) =>
				prev.map((u) =>
					u.id === userId
						? { ...updated, openStreamsCount: u.openStreamsCount }
						: u,
				),
			);
			toast.success(isActive ? "User activated" : "User deactivated");
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Failed to update status";
			toast.error(message);
			throw error;
		}
	};

	const handleUserRowClick = (user: User) => {
		if (user.role !== "field_agent") {
			return;
		}
		router.push(`/settings/team/${user.id}`);
	};

	if (!canViewUsers) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground">
					Access denied. Only Org Admins can manage team members.
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
			{/* Header Section */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Team Management
					</h1>
					<p className="text-muted-foreground text-base">
						Orchestrate your organization's members and open streams.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									onClick={fetchData}
									disabled={isLoading}
									className="h-10 w-10 shrink-0 border-border bg-background"
								>
									<RefreshCcw
										className={cn("h-4 w-4", isLoading && "animate-spin")}
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Refresh member list</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<span tabIndex={isOrgActive === false ? 0 : undefined}>
									<Button
										onClick={() => setModalOpen(true)}
										disabled={!orgAllowsUserChanges || !canCreateUsers}
										className="h-10 px-5 gap-2 bg-primary font-semibold shadow-sm hover:bg-primary/90"
									>
										<Plus className="h-4 w-4" />
										Add New Member
									</Button>
								</span>
							</TooltipTrigger>
							{isOrgActive === false && (
								<TooltipContent>
									<p>Reactivate organization to add members</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			{/* Org inactive alert */}
			{isOrgActive === false && (
				<Alert className="border-warning/30 bg-warning/5">
					<AlertTitle className="text-warning">
						Organization inactive
					</AlertTitle>
					<AlertDescription className="text-warning/80">
						User changes are disabled until this organization is reactivated.
					</AlertDescription>
				</Alert>
			)}

			{/* Metric Cards - Horizontal layout */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<KpiCard
					title="Total Members"
					value={stats.total}
					icon={Users}
					loading={isLoading}
					variant="default"
				/>
				<KpiCard
					title="Active Members"
					value={stats.active}
					icon={UserCheck}
					loading={isLoading}
					variant="success"
				/>
				<KpiCard
					title="Inactive Members"
					value={stats.inactive}
					icon={UserX}
					loading={isLoading}
					variant="warning"
				/>
				<KpiCard
					title="Open Streams"
					value={stats.totalOpenStreams}
					icon={Layers}
					loading={isLoading}
					variant="accent"
				/>
			</div>

			{/* Team Members Table - Editorial style */}
			<div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
				<div className="border-b border-border bg-background px-6 py-5">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-bold text-foreground">
								Team Members
							</h2>
						</div>
					</div>
				</div>

				<div className="p-6">
					{isLoading ? (
						<div className="space-y-3">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					) : (
						<UsersTable
							users={users}
							currentUserId={currentUser?.id}
							canEditRoles={orgAllowsUserChanges && canUpdateUsers}
							canEditStatus={orgAllowsUserChanges && canUpdateUsers}
							onRoleChange={handleRoleChange}
							onStatusChange={handleStatusChange}
							onRowClick={handleUserRowClick}
						/>
					)}
				</div>
			</div>

			<AddUserModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				onSubmit={handleCreateUser}
			/>
		</div>
	);
}
