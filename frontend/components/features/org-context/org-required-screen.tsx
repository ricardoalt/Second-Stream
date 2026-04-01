"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { DSRLogo } from "@/components/shared/branding/dsr-logo";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Organization } from "@/lib/api/organizations";
import { OrgSelectorContent } from "./org-selector-content";

interface OrgRequiredScreenProps {
	organizations: Organization[];
	isLoading?: boolean;
	errorMessage?: string;
	onSelect: (orgId: string) => void;
}

/**
 * Full-page blocking screen shown when a super admin needs to select an organization.
 * This completely replaces the normal page content, preventing any data-loading hooks
 * from mounting and firing requests without org context.
 *
 * Features:
 * - Minimal header (logo only, no nav)
 * - Centered card with organization selector
 * - Link to organizations area for org management
 * - Error state display for invalid org scenarios
 */
export function OrgRequiredScreen({
	organizations,
	isLoading = false,
	errorMessage,
	onSelect,
}: OrgRequiredScreenProps) {
	const title = errorMessage
		? "Organization Unavailable"
		: "Select Organization";
	const description =
		errorMessage ??
		"Choose an organization to continue. All data will be scoped to your selection.";

	function handleSelect(orgId: string | null): void {
		if (!orgId) return;
		onSelect(orgId);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Minimal header - just logo, no nav that could trigger data loads */}
			<header className="border-b">
				<div className="mx-auto max-w-7xl px-4 py-4">
					<Link href="/admin/organizations" className="inline-block">
						<DSRLogo width={100} height={40} showText={false} />
					</Link>
				</div>
			</header>

			{/* Centered content */}
			<main className="flex min-h-[calc(100vh-73px)] items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<Building2 className="h-6 w-6 text-primary" />
						</div>
						<CardTitle>{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</CardHeader>

					<CardContent>
						<div className="rounded-lg border">
							<OrgSelectorContent
								organizations={organizations}
								selectedOrgId={null}
								onSelect={handleSelect}
								isLoading={isLoading}
							/>
						</div>
					</CardContent>

					<CardFooter className="flex-col gap-2 text-center">
						<p className="text-sm text-muted-foreground">
							Or go to the{" "}
							<Button variant="link" className="h-auto p-0" asChild>
								<Link href="/admin/organizations">Organizations</Link>
							</Button>{" "}
							to manage organizations.
						</p>
					</CardFooter>
				</Card>
			</main>
		</div>
	);
}
