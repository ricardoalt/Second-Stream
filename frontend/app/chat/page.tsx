import { AppSidebar } from "@/components/chat-ui/app-sidebar";
import { SidebarProvider } from "@/components/chat-ui/ui/sidebar";
import { ChatPageClient } from "./chat-page-client";

export default function ChatPage({
	searchParams,
}: {
	searchParams?: { threadId?: string };
}) {
	const initialThreadId = searchParams?.threadId ?? null;

	return (
		<SidebarProvider defaultOpen={true}>
			<div className="flex h-screen w-full bg-background">
				<AppSidebar activeThreadId={initialThreadId ?? undefined} />
				<div className="flex flex-1 flex-col h-full overflow-hidden">
					{/* key forces a fresh mount per URL. Without it, navigating
					    from /chat?threadId=abc to /chat (new chat) would leave
					    ChatPageClient mounted and its useState-frozen threadId
					    stale. key="new" on fresh chats, key=<threadId> on
					    existing threads. */}
					<ChatPageClient
						key={initialThreadId ?? "new"}
						initialThreadId={initialThreadId}
					/>
				</div>
			</div>
		</SidebarProvider>
	);
}
