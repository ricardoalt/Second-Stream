import type { ReactNode } from "react";
import { AgentShellLayout } from "@/components/features/agent-shell/agent-shell-layout";

export default function SettingsLayout({ children }: { children: ReactNode }) {
	return <AgentShellLayout>{children}</AgentShellLayout>;
}
