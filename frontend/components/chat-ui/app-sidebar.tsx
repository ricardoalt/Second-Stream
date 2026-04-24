"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Archive,
	ChevronsUpDown,
	LogOut,
	MoreHorizontal,
	Pencil,
	Search,
	Settings,
	SquarePen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import {
	archiveChatThread,
	buildChatThreadsQueryKey,
	type ChatThreadSummaryDTO,
	listChatThreads,
	renameChatThread,
} from "@/lib/api/chat";
import { buildChatThreadUrl } from "@/lib/chat-runtime/routing";
import { preserveValidTitlesOnRefetch } from "@/lib/chat-runtime/sidebar-events";
import { sortThreadsByRecency } from "@/lib/chat-runtime/thread-order";
import { resolveChatThreadScope } from "@/lib/chat-runtime/thread-scope";
import { useAuth } from "@/lib/contexts";
import { groupByDate } from "@/lib/date-utils";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { ChatSearch } from "./chat-search";
import { OpenChatLogo } from "./openchat-logo";
import { SettingsDialog } from "./settings-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarTrigger,
} from "./ui/sidebar";

type SidebarActionItem = {
	id: "new-chat" | "search-chats";
	label: string;
	icon: React.ComponentType<{ className?: string }>;
};

const SIDEBAR_ACTIONS: ReadonlyArray<SidebarActionItem> = [
	{
		id: "new-chat",
		label: "New chat",
		icon: SquarePen,
	},
	{
		id: "search-chats",
		label: "Search chats",
		icon: Search,
	},
];

function getInitials(name: string): string {
	const parts = name.split(" ").filter(Boolean);
	const first = parts[0] ?? "";
	const second = parts[1] ?? "";
	if (!first) return "";
	if (parts.length === 1) return first.slice(0, 2).toUpperCase();
	return `${first[0]}${second[0] ?? ""}`.toUpperCase();
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	activeThreadId?: string;
	onThreadSelect?: (threadId: string) => void;
	onNewChat?: () => void;
}

export function AppSidebar({
	activeThreadId,
	onThreadSelect,
	onNewChat,
	...props
}: AppSidebarProps): React.JSX.Element {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user, logout } = useAuth();
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);
	const [searchOpen, setSearchOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
	const [renameTitle, setRenameTitle] = useState("");
	const [renameError, setRenameError] = useState<string | null>(null);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [archivingThread, setArchivingThread] =
		useState<ChatThreadSummaryDTO | null>(null);
	const [archiveError, setArchiveError] = useState<string | null>(null);
	const threadScope = resolveChatThreadScope({
		selectedOrgId,
		fallbackOrganizationId: user?.organizationId ?? null,
		userId: user?.id ?? null,
		isSuperuser: user?.isSuperuser ?? false,
	});
	const listThreadsOptions = threadScope.organizationId
		? { organizationId: threadScope.organizationId }
		: {};
	const threadsQueryKey = buildChatThreadsQueryKey(threadScope);

	type RenameMutationContext = {
		previousThreads: ChatThreadSummaryDTO[] | undefined;
	};

	type ArchiveMutationContext = {
		previousThreads: ChatThreadSummaryDTO[] | undefined;
	};

	const renameThreadMutation = useMutation<
		ChatThreadSummaryDTO,
		Error,
		{ threadId: string; title: string },
		RenameMutationContext
	>({
		mutationFn: ({ threadId, title }) =>
			renameChatThread(threadId, title, listThreadsOptions),
		onMutate: async ({ threadId, title }) => {
			await queryClient.cancelQueries({
				queryKey: threadsQueryKey,
				exact: true,
			});
			const previousThreads =
				queryClient.getQueryData<ChatThreadSummaryDTO[]>(threadsQueryKey);

			queryClient.setQueryData<ChatThreadSummaryDTO[]>(
				threadsQueryKey,
				(current) =>
					(current ?? []).map((thread) =>
						thread.id === threadId
							? { ...thread, title, updatedAt: new Date().toISOString() }
							: thread,
					),
			);

			return { previousThreads };
		},
		onError: (error, _variables, context) => {
			if (context?.previousThreads) {
				queryClient.setQueryData(threadsQueryKey, context.previousThreads);
			}
			setRenameError(error.message || "Unable to rename chat.");
		},
		onSuccess: (updatedThread) => {
			queryClient.setQueryData<ChatThreadSummaryDTO[]>(
				threadsQueryKey,
				(current) =>
					(current ?? []).map((thread) =>
						thread.id === updatedThread.id ? updatedThread : thread,
					),
			);
		},
	});

	const archiveThreadMutation = useMutation<
		void,
		Error,
		{ threadId: string },
		ArchiveMutationContext
	>({
		mutationFn: ({ threadId }) =>
			archiveChatThread(threadId, listThreadsOptions),
		onMutate: async ({ threadId }) => {
			await queryClient.cancelQueries({
				queryKey: threadsQueryKey,
				exact: true,
			});
			const previousThreads =
				queryClient.getQueryData<ChatThreadSummaryDTO[]>(threadsQueryKey);

			queryClient.setQueryData<ChatThreadSummaryDTO[]>(
				threadsQueryKey,
				(current) => (current ?? []).filter((thread) => thread.id !== threadId),
			);

			return { previousThreads };
		},
		onError: (error, _variables, context) => {
			if (context?.previousThreads) {
				queryClient.setQueryData(threadsQueryKey, context.previousThreads);
			}
			setArchiveError(error.message || "Unable to archive chat.");
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: threadsQueryKey,
				exact: true,
			});
		},
	});

	const {
		data: threads = [],
		error: threadsError,
		isPending: threadsPending,
	} = useQuery({
		queryKey: threadsQueryKey,
		queryFn: () => listChatThreads(listThreadsOptions),
		placeholderData: (previousThreads) => previousThreads,
		structuralSharing: (oldData, newData) =>
			preserveValidTitlesOnRefetch(oldData, newData),
	});

	const sortedThreads = sortThreadsByRecency(threads);
	const groupedThreads = groupByDate(
		sortedThreads,
		(thread) => thread.lastMessageAt ?? thread.updatedAt ?? thread.createdAt,
	);

	const fullName = user
		? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
		: "";
	const email = user?.email ?? "";
	const initials = fullName ? getInitials(fullName) : "";

	const handleAction = (actionId: SidebarActionItem["id"]) => {
		if (actionId === "new-chat") {
			onNewChat?.();
			// Navigate to /chat without threadId — ChatPageClient will mint a
			// fresh UUID on mount. Backend upserts it when the first stream
			// lands, so no "new" sentinel is needed anymore.
			router.push("/chat");
		} else if (actionId === "search-chats") {
			setSearchOpen(true);
		}
	};

	const handleSelectThread = (threadId: string) => {
		router.push(buildChatThreadUrl(threadId));
		onThreadSelect?.(threadId);
	};

	const handleOpenRenameDialog = (thread: ChatThreadSummaryDTO) => {
		setRenameError(null);
		setRenamingThreadId(thread.id);
		setRenameTitle((thread.title ?? "").trim());
		setRenameDialogOpen(true);
	};

	const handleOpenArchiveDialog = (thread: ChatThreadSummaryDTO) => {
		setArchiveError(null);
		setArchivingThread(thread);
		setArchiveDialogOpen(true);
	};

	const handleRenameSubmit = async () => {
		const trimmedTitle = renameTitle.trim();
		if (!renamingThreadId) {
			return;
		}
		if (!trimmedTitle) {
			setRenameError("Title cannot be empty.");
			return;
		}

		setRenameError(null);
		try {
			await renameThreadMutation.mutateAsync({
				threadId: renamingThreadId,
				title: trimmedTitle,
			});
			setRenameDialogOpen(false);
		} catch {
			// Error is handled by mutation onError.
		}
	};

	const handleArchiveSubmit = async () => {
		if (!archivingThread) {
			return;
		}

		setArchiveError(null);

		const isArchivingActiveThread = archivingThread.id === activeThreadId;
		if (isArchivingActiveThread) {
			handleAction("new-chat");
		}

		try {
			await archiveThreadMutation.mutateAsync({ threadId: archivingThread.id });
			setArchiveDialogOpen(false);
		} catch {
			// Error is handled by mutation onError.
		}
	};

	return (
		<>
			<AlertDialog
				open={archiveDialogOpen}
				onOpenChange={(open) => {
					setArchiveDialogOpen(open);
					if (!open) {
						setArchivingThread(null);
						setArchiveError(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Archive chat?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes this thread from your sidebar. You can’t undo this
							action from chat.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{archiveError ? (
						<p className="text-destructive text-xs" role="alert">
							{archiveError}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={archiveThreadMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={archiveThreadMutation.isPending}
							onClick={(event) => {
								event.preventDefault();
								void handleArchiveSubmit();
							}}
						>
							Archive
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<Dialog
				open={renameDialogOpen}
				onOpenChange={(open) => {
					setRenameDialogOpen(open);
					if (!open) {
						setRenameError(null);
						setRenamingThreadId(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename chat</DialogTitle>
						<DialogDescription>
							Update the thread title shown in your sidebar.
						</DialogDescription>
					</DialogHeader>
					<Input
						autoFocus
						maxLength={80}
						placeholder="Thread title"
						value={renameTitle}
						onChange={(event) => setRenameTitle(event.target.value)}
					/>
					{renameError ? (
						<p className="text-destructive text-xs" role="alert">
							{renameError}
						</p>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setRenameDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={renameThreadMutation.isPending}
							onClick={() => void handleRenameSubmit()}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<ChatSearch
				open={searchOpen}
				onOpenChange={setSearchOpen}
				threads={sortedThreads}
			/>
			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
			<Sidebar collapsible="icon" {...props}>
				<SidebarHeader className="px-3 pt-3 group-data-[collapsible=icon]:px-0">
					<div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
						<OpenChatLogo className="h-8 w-auto max-w-[160px] shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:max-w-[120px]" />
						<SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
					</div>
				</SidebarHeader>

				<SidebarGroup className="pt-1">
					<SidebarMenu>
						{SIDEBAR_ACTIONS.map((action: SidebarActionItem) => {
							const ActionIcon: React.ComponentType<{ className?: string }> =
								action.icon;

							return (
								<SidebarMenuItem key={action.id}>
									<SidebarMenuButton
										tooltip={action.label}
										type="button"
										aria-label={action.label}
										onClick={() => handleAction(action.id)}
									>
										<ActionIcon className="size-5 shrink-0" />
										<span>{action.label}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>

				<SidebarContent>
					{threadsError ? (
						<SidebarGroup className="group-data-[collapsible=icon]:hidden">
							<SidebarMenu>
								<p className="text-destructive px-2 py-1 text-xs" role="alert">
									{threadsError instanceof Error
										? threadsError.message
										: "Unable to load threads."}
								</p>
							</SidebarMenu>
						</SidebarGroup>
					) : null}

					{groupedThreads.length > 0 ? (
						groupedThreads.map((group) => (
							<SidebarGroup
								key={group.label}
								className="group-data-[collapsible=icon]:hidden"
							>
								<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
								<SidebarMenu>
									{group.items.map((thread) => (
										<SidebarMenuItem key={thread.id}>
											<SidebarMenuButton
												isActive={thread.id === activeThreadId}
												onClick={() => handleSelectThread(thread.id)}
												aria-label={thread.title ?? "Untitled chat"}
											>
												<span>{thread.title ?? "Untitled chat"}</span>
											</SidebarMenuButton>
											<DropdownMenu>
												<DropdownMenuTrigger
													render={
														<SidebarMenuAction
															showOnHover
															aria-label={`Open actions for ${thread.title ?? "chat"}`}
														/>
													}
												>
													<MoreHorizontal className="size-4" />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-40">
													<DropdownMenuItem
														onClick={() => handleOpenRenameDialog(thread)}
													>
														<Pencil className="size-4" />
														Rename
													</DropdownMenuItem>
													<DropdownMenuItem
														className="text-destructive focus:text-destructive"
														onClick={() => handleOpenArchiveDialog(thread)}
													>
														<Archive className="size-4" />
														Archive
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroup>
						))
					) : threadsPending ? (
						<SidebarGroup className="group-data-[collapsible=icon]:hidden">
							<SidebarMenu>
								<p className="text-muted-foreground px-2 py-1 text-xs">
									Loading chats...
								</p>
							</SidebarMenu>
						</SidebarGroup>
					) : (
						<SidebarGroup className="group-data-[collapsible=icon]:hidden">
							<SidebarMenu>
								<p className="text-muted-foreground px-2 py-1 text-xs">
									No chats yet
								</p>
							</SidebarMenu>
						</SidebarGroup>
					)}
				</SidebarContent>

				<SidebarFooter className="border-sidebar-border border-t p-3 group-data-[collapsible=icon]:px-0">
					<SidebarMenu>
						<SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<SidebarMenuButton
											size="lg"
											className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
										/>
									}
								>
									<div className="bg-primary text-primary-foreground flex size-9 shrink-0 aspect-square items-center justify-center rounded-full text-sm font-medium group-data-[collapsible=icon]:size-7 group-data-[collapsible=icon]:text-xs">
										{initials || "?"}
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
										<span className="truncate font-medium">
											{fullName || "Loading..."}
										</span>
										{email ? (
											<span className="text-muted-foreground truncate text-xs">
												{email}
											</span>
										) : null}
									</div>
									<ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
								</DropdownMenuTrigger>
								<DropdownMenuContent
									className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
									side="top"
									align="start"
									sideOffset={4}
								>
									<DropdownMenuItem onClick={() => setSettingsOpen(true)}>
										<Settings />
										Settings
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => logout()}>
										<LogOut />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>

				<SidebarRail />
			</Sidebar>
		</>
	);
}
