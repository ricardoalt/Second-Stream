"use client";

import { ChevronsUpDown, Search, Settings, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";
import { type ChatThreadSummaryDTO, listChatThreads } from "@/lib/api/chat";
import { buildChatThreadUrl } from "@/lib/chat-runtime/routing";
import { groupByDate } from "@/lib/date-utils";
import { ChatSearch } from "./chat-search";
import { SettingsDialog } from "./settings-dialog";
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
	const [threads, setThreads] = useState<ChatThreadSummaryDTO[]>([]);
	const [threadsError, setThreadsError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		void listChatThreads()
			.then((listedThreads) => {
				if (cancelled) {
					return;
				}

				setThreads(listedThreads);
				setThreadsError(null);
			})
			.catch((loadError: unknown) => {
				if (cancelled) {
					return;
				}

				setThreadsError(
					loadError instanceof Error
						? loadError.message
						: "Unable to load threads.",
				);
				setThreads([]);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const groupedThreads = groupByDate(threads, (t) => t.updatedAt);

	const handleAction = (actionId: SidebarActionItem["id"]) => {
		if (actionId === "new-chat") {
			onNewChat?.();
			router.push(buildChatThreadUrl("new"));
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
				threads={threads}
			/>
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
					{threadsError ? (
						<SidebarGroup className="group-data-[collapsible=icon]:hidden">
							<SidebarMenu>
								<p className="text-destructive px-2 py-1 text-xs" role="alert">
									{threadsError}
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
		</>
	);
}
