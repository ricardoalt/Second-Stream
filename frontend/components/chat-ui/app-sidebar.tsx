"use client";

import {
	ChevronsUpDown,
	GitBranch,
	Search,
	Settings,
	SquarePen,
	X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import { groupByDate } from "@/lib/date-utils";
import { ChatSearch } from "./chat-search";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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

// Local Thread type
interface Thread {
	id: string;
	title: string | null;
	resourceId: string;
	createdAt: string;
	updatedAt: string;
}

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

// Local storage helpers
const getStoredThreads = (): Thread[] => {
	if (typeof window === "undefined") return [];
	const stored = localStorage.getItem("secondstream_chat_threads");
	return stored ? JSON.parse(stored) : [];
};

const setStoredThreads = (threads: Thread[]) => {
	if (typeof window === "undefined") return;
	localStorage.setItem("secondstream_chat_threads", JSON.stringify(threads));
};

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
	const [searchOpen, setSearchOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [threadToDelete, setThreadToDelete] = useState<Thread | null>(null);
	const [threads, setThreads] = useState<Thread[]>([]);

	// Load threads on mount
	useEffect(() => {
		setThreads(getStoredThreads());
	}, []);

	// Subscribe to storage changes
	useEffect(() => {
		const handleStorage = () => {
			setThreads(getStoredThreads());
		};
		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	const groupedThreads = groupByDate(threads, (t) => t.updatedAt);

	const handleDeleteConfirm = () => {
		if (!threadToDelete) return;

		const isActive = threadToDelete.id === activeThreadId;
		const updatedThreads = threads.filter((t) => t.id !== threadToDelete.id);
		setThreads(updatedThreads);
		setStoredThreads(updatedThreads);

		// Clean up messages
		localStorage.removeItem(`secondstream_chat_messages_${threadToDelete.id}`);

		setThreadToDelete(null);

		if (isActive) {
			router.push("/chat");
			onNewChat?.();
		}
	};

	const handleAction = (actionId: SidebarActionItem["id"]) => {
		if (actionId === "new-chat") {
			onNewChat?.();
			router.push("/chat");
		} else if (actionId === "search-chats") {
			setSearchOpen(true);
		}
	};

	const handleBranch = (threadId: string) => {
		const sourceThread = threads.find((t) => t.id === threadId);
		if (!sourceThread) return;

		// Clone thread
		const newThread: Thread = {
			id: nanoid(),
			title: `${sourceThread.title || "Untitled"} (Copy)`,
			resourceId: sourceThread.resourceId,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const updatedThreads = [newThread, ...threads];
		setThreads(updatedThreads);
		setStoredThreads(updatedThreads);

		// Clone messages
		const sourceMessages = localStorage.getItem(
			`secondstream_chat_messages_${threadId}`,
		);
		if (sourceMessages) {
			localStorage.setItem(
				`secondstream_chat_messages_${newThread.id}`,
				sourceMessages,
			);
		}

		router.push(`/chat/${newThread.id}`);
		onThreadSelect?.(newThread.id);
	};

	const handleSelectThread = (threadId: string) => {
		router.push(`/chat/${threadId}`);
		onThreadSelect?.(threadId);
	};

	return (
		<>
			<ChatSearch open={searchOpen} onOpenChange={setSearchOpen} />
			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
			<Sidebar collapsible="icon" {...props}>
				<SidebarHeader className="px-3 pt-3 group-data-[collapsible=icon]:px-0">
					<div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
						<div className="size-9 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold group-data-[collapsible=icon]:size-8">
							S
						</div>
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
											<SidebarMenuAction
												showOnHover
												className="right-6"
												aria-label="Branch chat"
												onClick={(e) => {
													e.preventDefault();
													handleBranch(thread.id);
												}}
											>
												<GitBranch className="size-4" />
											</SidebarMenuAction>
											<SidebarMenuAction
												showOnHover
												aria-label="Delete chat"
												onClick={(e) => {
													e.preventDefault();
													setThreadToDelete(thread);
												}}
											>
												<X className="size-4" />
											</SidebarMenuAction>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroup>
						))
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
									<div className="bg-orange-500 text-white flex size-9 shrink-0 aspect-square items-center justify-center rounded-full text-lg font-medium group-data-[collapsible=icon]:size-7 group-data-[collapsible=icon]:text-base">
										GU
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
										<span className="truncate font-medium">Guest User</span>
										<span className="text-muted-foreground truncate text-xs">
											Plus
										</span>
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
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>

				<SidebarRail />
			</Sidebar>
			<AlertDialog
				open={threadToDelete !== null}
				onOpenChange={(open) => {
					if (!open) setThreadToDelete(null);
				}}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete chat</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this chat and all its messages. This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleDeleteConfirm}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
