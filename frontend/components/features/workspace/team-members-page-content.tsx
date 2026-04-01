"use client";

import {
	Plus,
	RefreshCcw,
	UserCheck,
	Users,
	UserX,
	Layers,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { dashboardAPI } from "@/lib/api/dashboard";
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

// Metric Card - Horizontal layout como la referencia
function MetricCard({
	icon: Icon,
	label,
	value,
	loading,
	accent,
}: {
	icon: typeof Users;
	label: string;
	value: string | number;
	loading?: boolean;
	accent?: "blue" | "emerald" | "slate" | "violet";
}) {
	const accentStyles = {
		blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
		emerald:
			"bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
		slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
		violet:
			"bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
	};

	return (
		<div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
			<div
				className={cn(
					"flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
					accentStyles[accent ?? "slate"],
				)}
			>
				<Icon className="h-6 w-6" />
			</div>
			<div className="min-w-0">
				<p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
					{label}
				</p>
				<p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
					{loading ? "—" : value}
				</p>
			</div>
		</div>
	);
}

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

			// Fetch users
			const usersData = organizationId
				? await organizationsAPI.listOrgUsers(organizationId)
				: await organizationsAPI.listMyOrgUsers();

			// Fetch streams to calculate open_streams_count per user (REAL DATA)
			const dashboard = await dashboardAPI.getDashboard({
				bucket: "total",
				size: 1000,
			});

			// Count streams per owner
			const streamsByOwner = new Map<string, number>();
			for (const item of dashboard.items) {
				if (item.kind === "persisted_stream" && item.ownerUserId) {
					const current = streamsByOwner.get(item.ownerUserId) ?? 0;
					streamsByOwner.set(item.ownerUserId, current + 1);
				}
			}

			// Combine users with their real open streams count
			const usersWithStreams: UserWithStreams[] = usersData.map((user) => ({
				...user,
				openStreamsCount: streamsByOwner.get(user.id) ?? 0,
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
		<div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8">
			{/* Header Section */}
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
						Team Management
					</h1>
					<p className="text-slate-600 dark:text-slate-400">
						Manage team members and access for this organization.
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
									className="h-10 w-10"
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
										className="gap-2"
									>
										<Plus className="h-4 w-4" />
										Add member
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
				<Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
					<AlertTitle className="text-amber-800 dark:text-amber-200">
						Organization inactive
					</AlertTitle>
					<AlertDescription className="text-amber-700 dark:text-amber-300">
						User changes are disabled until this organization is reactivated.
					</AlertDescription>
				</Alert>
			)}

			{/* Metric Cards - Horizontal layout */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<MetricCard
					icon={Users}
					label="Total members"
					value={stats.total}
					loading={isLoading}
					accent="blue"
				/>
				<MetricCard
					icon={UserCheck}
					label="Active members"
					value={stats.active}
					loading={isLoading}
					accent="emerald"
				/>
				<MetricCard
					icon={UserX}
					label="Inactive members"
					value={stats.inactive}
					loading={isLoading}
					accent="slate"
				/>
				<MetricCard
					icon={Layers}
					label="Open streams"
					value={stats.totalOpenStreams}
					loading={isLoading}
					accent="violet"
				/>
			</div>

			{/* Team Members Table - Editorial style */}
			<div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
				<div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
								Team members
							</h2>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								Review members, manage roles, and control access.
							</p>
						</div>
						<span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-400">
							{isLoading ? "Loading..." : `${stats.total} members`}
						</span>
					</div>
				</div>

				<div>
					{isLoading ? (
						<div className="p-6">
							<div className="space-y-3">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
							</div>
						</div>
					) : (
						<UsersTable
							users={users}
							currentUserId={currentUser?.id}
							canEditRoles={orgAllowsUserChanges && canUpdateUsers}
							canEditStatus={orgAllowsUserChanges && canUpdateUsers}
							onRoleChange={handleRoleChange}
							onStatusChange={handleStatusChange}
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
