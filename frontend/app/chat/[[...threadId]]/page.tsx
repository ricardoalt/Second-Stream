import { notFound } from "next/navigation";
import { SidebarProvider } from "@/components/chat-ui/ui/sidebar";
import { ChatShell } from "../chat-shell";

type ChatRouteParams = {
	threadId?: string[];
};

export default async function ChatPage({
	params,
}: {
	params: Promise<ChatRouteParams>;
}) {
	const resolvedParams = await params;
	const threadSegments = resolvedParams.threadId ?? [];

	if (threadSegments.length > 1) {
		notFound();
	}

	const routeThreadId = threadSegments[0] ?? null;

	return (
		<SidebarProvider defaultOpen={true}>
			<ChatShell routeThreadId={routeThreadId} />
		</SidebarProvider>
	);
}
