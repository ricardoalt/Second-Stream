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
import {
	ChevronLeft,
	ChevronRight,
	Search,
	ShieldCheck,
	UserPlus,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/system";
import {
	FadeIn,
	Pressable,
	StaggerContainer,
	StaggerItem,
} from "@/components/patterns/animations/motion-components";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
			<div className="container mx-auto py-8">
				<div className="space-y-3">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		);
	}

	if (!isSuperAdmin) {
		return (
			<div className="container mx-auto py-8">
				<Card>
					<CardHeader>
						<CardTitle>Access denied</CardTitle>
						<CardDescription>
							You need admin permissions to view this page.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={200}>
			<div className="container mx-auto py-8 space-y-6">
				<FadeIn direction="up">
					<PageHeader
						title="Platform Administrators"
						subtitle="Superuser accounts with full platform access."
						icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
						actions={
							<Pressable>
								<Button onClick={() => setModalOpen(true)}>
									<UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
									New Admin
								</Button>
							</Pressable>
						}
					/>
				</FadeIn>

				<FadeIn direction="up" delay={0.15}>
					<Card>
						<CardHeader>
							<CardTitle>Administrator Directory</CardTitle>
							<CardDescription>
								{users.length} administrators with full platform access.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{isLoading ? (
								<div className="space-y-3">
									<Skeleton className="h-10 w-64" />
									{Array.from({ length: 4 }).map((_, idx) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton placeholders never reorder
										<Skeleton key={`skeleton-${idx}`} className="h-16 w-full" />
									))}
								</div>
							) : users.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<p>No administrators yet. Create the first one.</p>
								</div>
							) : (
								<>
									{/* Search and Filters */}
									<div className="flex flex-col sm:flex-row gap-3">
										<div className="relative flex-1">
											<Search
												className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
												aria-hidden="true"
											/>
											<Input
												type="search"
												name="search"
												placeholder="Search administrators\u2026"
												aria-label="Search administrators"
												value={globalFilter}
												onChange={(e) => setGlobalFilter(e.target.value)}
												className="pl-9 pr-9 max-w-sm"
											/>
											{globalFilter && (
												<button
													type="button"
													onClick={() => setGlobalFilter("")}
													className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
													aria-label="Clear search"
												>
													<X className="h-4 w-4" aria-hidden="true" />
												</button>
											)}
										</div>
										<Select
											value={
												(table
													.getColumn("isActive")
													?.getFilterValue() as string) ?? "all"
											}
											onValueChange={(value) =>
												table
													.getColumn("isActive")
													?.setFilterValue(value === "all" ? undefined : value)
											}
										>
											<SelectTrigger
												className="w-[130px]"
												aria-label="Filter by status"
											>
												<SelectValue placeholder="All Status" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All Status</SelectItem>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="inactive">Disabled</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Table */}
									<div className="rounded-md border overflow-x-auto">
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
															className="h-24 text-center"
														>
															No administrators match your search.
														</TableCell>
													</TableRow>
												)}
											</TableBody>
										</Table>
									</div>

									{/* Pagination */}
									<div className="flex items-center justify-between">
										<output
											className="text-sm text-muted-foreground tabular-nums"
											aria-live="polite"
										>
											Showing {table.getRowModel().rows.length} of{" "}
											{table.getFilteredRowModel().rows.length} administrators
										</output>
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => table.previousPage()}
												disabled={!table.getCanPreviousPage()}
											>
												<ChevronLeft className="h-4 w-4" aria-hidden="true" />
												Previous
											</Button>
											<span className="text-sm text-muted-foreground tabular-nums">
												Page {table.getState().pagination.pageIndex + 1} of{" "}
												{table.getPageCount()}
											</span>
											<Button
												variant="outline"
												size="sm"
												onClick={() => table.nextPage()}
												disabled={!table.getCanNextPage()}
											>
												Next
												<ChevronRight className="h-4 w-4" aria-hidden="true" />
											</Button>
										</div>
									</div>
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
			</div>
		</TooltipProvider>
	);
}
