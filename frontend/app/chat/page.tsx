import { AppSidebar } from "@/components/chat-ui/app-sidebar";
import { ChatScreen } from "@/components/chat-ui/chat-screen";
import { resolveChatRouteState } from "@/lib/chat-runtime/routing";
import { SidebarProvider } from "@/components/chat-ui/ui/sidebar";

interface ChatPageProps {
	searchParams?: {
		threadId?: string;
	};
}

export default function ChatPage({ searchParams }: ChatPageProps) {
	const routeState = resolveChatRouteState(searchParams?.threadId);

	return (
		<SidebarProvider defaultOpen={true}>
			<div className="flex h-screen w-full bg-background">
				<AppSidebar activeThreadId={routeState.threadId} />
				<div className="flex flex-1 flex-col h-full overflow-hidden">
					<ChatScreen routeState={routeState} />
				</div>
			</div>
		</SidebarProvider>
	);
}
