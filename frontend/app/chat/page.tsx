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
					<ChatPageClient initialThreadId={initialThreadId} />
				</div>
			</div>
		</SidebarProvider>
	);
}
