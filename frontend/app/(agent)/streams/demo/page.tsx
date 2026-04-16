import { WorkspaceDemo } from "@/components/features/workspace-demo/workspace-demo";

export const metadata = {
	title: "Stream Workspace Demo — SecondStream",
	description:
		"Frontend demo of the AI-native Stream Workspace. Isolated sandbox — not production UI.",
};

// ── /streams/demo ─────────────────────────────────────────────────────────────
// Isolated demo route for the AI-native workspace redesign.
// Inherits AgentShellLayout (sidebar + top bar) from (agent) route group.
// Does NOT affect the productive /streams/[id] flow.
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkspaceDemoPage() {
	// AgentShellLayout already provides max-w-[1400px] mx-auto and p-6.
	// No extra wrapper needed — let the workspace breathe within the shell.
	return <WorkspaceDemo />;
}
