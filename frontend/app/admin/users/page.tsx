"use client";

import {
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ShieldCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	EmptyState,
	FadeIn,
	FilterBar,
	PageHeader,
	PageShell,
	Pressable,
	TablePagination,
} from "@/components/patterns";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
	type AdminUpdateUserInput,
	adminUsersAPI,
} from "@/lib/api/admin-users";
import { useAuth } from "@/lib/contexts";
import type { User } from "@/lib/types/user";
import {
	CreateAdminDialog,
	getColumns,
	ResetPasswordDialog,
} from "./components";

export default function AdminUsersPage() {
	const { isSuperAdmin, isLoading: authLoading, user: currentUser } = useAuth();
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
	const [resetUserId, setResetUserId] = useState<string | null>(null);

	// TanStack Table state
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	useEffect(() => {
		if (!isSuperAdmin) return;
		const fetchUsers = async () => {
			try {
				const data = await adminUsersAPI.list();
				setUsers(data);
			} catch {
				toast.error("Failed to load users");
			} finally {
				setIsLoading(false);
			}
		};
		fetchUsers();
	}, [isSuperAdmin]);

	const handleUpdateUser = useCallback(
		async (
			userId: string,
			updates: AdminUpdateUserInput,
			successMessage: string,
		): Promise<{ ok: boolean }> => {
			setUpdatingUserId(userId);
			try {
				const updated = await adminUsersAPI.update(userId, updates);
				setUsers((prev) =>
					prev.map((user) => (user.id === userId ? updated : user)),
				);
				toast.success(successMessage);
				return { ok: true };
			} catch (error) {
				const message =
					error instanceof Error && error.message
						? error.message
						: "Failed to update user";
				toast.error(message);
				return { ok: false };
			} finally {
				setUpdatingUserId(null);
			}
		},
		[],
	);

	const handleOpenResetDialog = useCallback((userId: string) => {
		setResetUserId(userId);
	}, []);

	const handleUserCreated = useCallback((newUser: User) => {
		setUsers((prev) => [newUser, ...prev]);
	}, []);

	const activeAdmins = users.filter(
		(user) => user.isSuperuser && user.isActive,
	);
	const lastActiveAdminId =
		activeAdmins.length === 1 ? (activeAdmins[0]?.id ?? null) : null;

	const resetUserName = useMemo(() => {
		if (!resetUserId) return "";
		const user = users.find((u) => u.id === resetUserId);
		return user?.firstName ?? "User";
	}, [resetUserId, users]);

	const columns = useMemo(
		() =>
			getColumns({
				currentUserId: currentUser?.id,
				lastActiveAdminId,
				updatingUserId,
				onUpdateUser: handleUpdateUser,
				onOpenResetDialog: handleOpenResetDialog,
			}),
		[
			currentUser?.id,
			lastActiveAdminId,
			updatingUserId,
			handleUpdateUser,
			handleOpenResetDialog,
		],
	);

	const table = useReactTable({
		data: users,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		globalFilterFn: "includesString",
		state: {
			sorting,
			columnFilters,
			globalFilter,
		},
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	});

	if (authLoading) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!isSuperAdmin) {
		return (
			<EmptyState
				icon={ShieldCheck}
				title="Access denied"
				description="You need superadmin permissions to view this page."
			/>
		);
	}

	const statusFilterValue =
		(table.getColumn("isActive")?.getFilterValue() as string) ?? "all";

	return (
		<TooltipProvider delayDuration={200}>
			<PageShell>
				<FadeIn direction="up">
					<PageHeader
						title="Platform Administrators"
						subtitle="Superuser accounts with full platform access."
						icon={ShieldCheck}
						actions={
							<Pressable>
								<Button onClick={() => setModalOpen(true)}>
									<UserPlus className="mr-2 size-4" aria-hidden />
									New Admin
								</Button>
							</Pressable>
						}
					/>
				</FadeIn>

				<FadeIn direction="up" delay={0.1}>
					<Card>
						<CardHeader>
							<CardTitle>Administrator Directory</CardTitle>
							<CardDescription>
								{users.length} administrator{users.length !== 1 ? "s" : ""} with
								full platform access.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							{isLoading ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-10 w-full max-w-sm" />
									{Array.from({ length: 4 }).map((_, idx) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton placeholders
										<Skeleton key={`skeleton-${idx}`} className="h-16 w-full" />
									))}
								</div>
							) : users.length === 0 ? (
								<EmptyState
									icon={ShieldCheck}
									title="No administrators yet"
									description="Create the first superadmin account."
									action={
										<Button onClick={() => setModalOpen(true)}>
											<UserPlus className="mr-2 size-4" aria-hidden />
											Create Admin
										</Button>
									}
									className="border-0 bg-transparent py-8"
								/>
							) : (
								<>
									{/* ── Unified filter bar ── */}
									<FilterBar
										search={{
											value: globalFilter,
											onChange: setGlobalFilter,
											placeholder: "Search administrators…",
										}}
										filters={[
											{
												key: "status",
												placeholder: "All statuses",
												value: statusFilterValue,
												onChange: (value) =>
													table
														.getColumn("isActive")
														?.setFilterValue(
															value === "all" ? undefined : value,
														),
												options: [
													{ value: "all", label: "All statuses" },
													{ value: "active", label: "Active" },
													{ value: "inactive", label: "Disabled" },
												],
												width: "w-full sm:w-[150px]",
											},
										]}
									/>

									{/* ── Table ── */}
									<div className="overflow-x-auto rounded-lg border border-border/60">
										<Table>
											<TableHeader>
												{table.getHeaderGroups().map((headerGroup) => (
													<TableRow key={headerGroup.id}>
														{headerGroup.headers.map((header) => (
															<TableHead
																key={header.id}
																className="whitespace-nowrap"
															>
																{header.isPlaceholder
																	? null
																	: flexRender(
																			header.column.columnDef.header,
																			header.getContext(),
																		)}
															</TableHead>
														))}
													</TableRow>
												))}
											</TableHeader>
											<TableBody>
												{table.getRowModel().rows.length ? (
													table.getRowModel().rows.map((row) => (
														<TableRow key={row.id}>
															{row.getVisibleCells().map((cell) => (
																<TableCell key={cell.id}>
																	{flexRender(
																		cell.column.columnDef.cell,
																		cell.getContext(),
																	)}
																</TableCell>
															))}
														</TableRow>
													))
												) : (
													<TableRow>
														<TableCell
															colSpan={columns.length}
															className="h-24 text-center text-muted-foreground text-sm"
														>
															No administrators match your search.
														</TableCell>
													</TableRow>
												)}
											</TableBody>
										</Table>
									</div>

									{/* ── Pagination ── */}
									<TablePagination
										total={table.getFilteredRowModel().rows.length}
										showing={table.getRowModel().rows.length}
										page={table.getState().pagination.pageIndex + 1}
										pageCount={table.getPageCount()}
										onPrevious={() => table.previousPage()}
										onNext={() => table.nextPage()}
										itemLabel="administrators"
										className="border-0 px-0 pt-0"
									/>
								</>
							)}
						</CardContent>
					</Card>
				</FadeIn>

				<CreateAdminDialog
					open={modalOpen}
					onOpenChange={setModalOpen}
					onUserCreated={handleUserCreated}
				/>

				<ResetPasswordDialog
					userId={resetUserId}
					userName={resetUserName}
					onClose={() => setResetUserId(null)}
					onUpdateUser={handleUpdateUser}
				/>
			</PageShell>
		</TooltipProvider>
	);
}
