import type { ReactNode } from "react";
import { AgentShellLayout } from "@/components/features/agent-shell/agent-shell-layout";

export default function AgentLayout({ children }: { children: ReactNode }) {
	return <AgentShellLayout>{children}</AgentShellLayout>;
}
