"use client";

import { Suspense } from "react";
import { Toaster } from "sonner";
import { OrgContextGuard } from "@/components/features/org-context";
import { ProposalGenerationManager } from "@/components/providers/proposal-generation-manager";
import { CommandPalette } from "@/components/shared/command-palette";
import { AuthProvider } from "@/lib/contexts";

export function ClientLayout({ children }: { children: React.ReactNode }) {
	return (
		<AuthProvider>
			<Toaster
				position="bottom-right"
				theme="system"
				richColors
				closeButton
				toastOptions={{
					classNames: {
						toast: "bg-background border-border shadow-lg",
						title: "text-foreground font-semibold",
						description: "text-muted-foreground",
						actionButton:
							"bg-primary text-primary-foreground hover:bg-primary/90",
						cancelButton:
							"bg-muted text-muted-foreground hover:bg-muted/80",
						closeButton: "bg-background border-border hover:bg-muted",
						success: "bg-background border-border",
						error: "bg-background border-border",
						warning: "bg-background border-border",
						info: "bg-background border-border",
					},
				}}
			/>
			<OrgContextGuard>
				<Suspense fallback={null}>
					<ProposalGenerationManager />
					{children}
					<CommandPalette />
				</Suspense>
			</OrgContextGuard>
		</AuthProvider>
	);
}
