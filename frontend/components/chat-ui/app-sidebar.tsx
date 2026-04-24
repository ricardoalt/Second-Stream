"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ChevronsUpDown,
	LogOut,
	Search,
	Settings,
	SquarePen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import { buildChatThreadsQueryKey, listChatThreads } from "@/lib/api/chat";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
	const { user, logout } = useAuth();
	const selectedOrgId = useOrganizationStore((state) => state.selectedOrgId);
	const [searchOpen, setSearchOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
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

	return (
		<>
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
