"use client";

import {
	Archive,
	BriefcaseBusiness,
	Calendar,
	Edit2,
	Mail,
	Phone,
	RotateCcw,
	Settings,
	ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Organization } from "@/lib/api/organizations";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { cn } from "@/lib/utils";
import { OrgAvatar } from "./org-avatar";

interface OrgCardProps {
	organization: Organization;
	onEdit?: (org: Organization) => void;
	onArchive?: (org: Organization) => void;
	onRestore?: (org: Organization) => void;
	onPurge?: (org: Organization) => void;
	actionLoading?: boolean;
}

export function OrgCard({
	organization,
	onEdit,
	onArchive,
	onRestore,
	onPurge,
	actionLoading = false,
}: OrgCardProps) {
	const router = useRouter();
	const selectOrganization = useOrganizationStore(
		(state) => state.selectOrganization,
	);

	const createdDate = organization.createdAt
		? new Date(organization.createdAt).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: null;

	function handleOpenWorkspace() {
		selectOrganization(organization.id);
		router.push("/dashboard");
	}

	return (
		<Card
			className={cn(
				"group relative h-full transition-[box-shadow,border-color,transform] duration-200",
				"hover:shadow-lg hover:border-primary/40 hover:-translate-y-1",
				!organization.isActive && "opacity-70",
			)}
		>
			<CardHeader className="pb-4">
				<div className="flex items-start gap-4">
					<OrgAvatar
						name={organization.name}
						slug={organization.slug}
						size="lg"
					/>
					<div className="flex-1 min-w-0 space-y-1">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<h3 className="font-semibold text-base truncate leading-tight">
									{organization.name}
								</h3>
								<p className="font-mono text-xs text-muted-foreground mt-0.5">
									{organization.slug}
								</p>
							</div>
							<Badge
								variant={organization.isActive ? "default" : "secondary"}
								className={cn(
									"shrink-0",
									organization.isActive
										? "bg-success/10 text-success border-success/20"
										: "bg-muted text-muted-foreground",
								)}
							>
								{organization.isActive ? "Active" : "Archived"}
							</Badge>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0 space-y-4">
				<div className="grid grid-cols-2 gap-3">
					{createdDate && (
						<div className="flex items-center gap-2 text-sm">
							<div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/50">
								<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
							</div>
							<div>
								<p className="font-medium">{createdDate}</p>
								<p className="text-xs text-muted-foreground">Created</p>
							</div>
						</div>
					)}
				</div>

				{(organization.contactEmail || organization.contactPhone) && (
					<div className="space-y-1.5 pt-2 border-t border-border/50">
						{organization.contactEmail && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Mail className="h-3 w-3 shrink-0" />
								<span className="truncate">{organization.contactEmail}</span>
							</div>
						)}
						{organization.contactPhone && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Phone className="h-3 w-3 shrink-0" />
								<span>{organization.contactPhone}</span>
							</div>
						)}
					</div>
				)}

				<div className="flex items-center gap-2 pt-2">
					<Link
						href={`/admin/organizations/${organization.id}`}
						className="flex-1"
					>
						<Button variant="outline" size="sm" className="w-full">
							<Settings className="h-3.5 w-3.5 mr-2 text-info" />
							Management
						</Button>
					</Link>
					<div className="flex-1">
						<Button size="sm" className="w-full" onClick={handleOpenWorkspace}>
							<BriefcaseBusiness className="h-3.5 w-3.5 mr-2" />
							Workspace
						</Button>
					</div>
					{onEdit && organization.isActive && (
						<Button
							variant="ghost"
							size="sm"
							className="shrink-0"
							aria-label={`Edit ${organization.name}`}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onEdit(organization);
							}}
						>
							<Edit2 className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>

				{organization.isActive ? (
					onArchive && (
						<Button
							variant="outline"
							size="sm"
							className="w-full"
							onClick={() => onArchive(organization)}
							disabled={actionLoading}
						>
							<Archive className="mr-2 h-3.5 w-3.5" />
							Archive
						</Button>
					)
				) : (
					<div className="grid grid-cols-2 gap-2">
						{onRestore && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => onRestore(organization)}
								disabled={actionLoading}
							>
								<RotateCcw className="mr-2 h-3.5 w-3.5" />
								Restore
							</Button>
						)}
						{onPurge && (
							<Button
								variant="destructive"
								size="sm"
								onClick={() => onPurge(organization)}
								disabled={actionLoading}
							>
								<ShieldAlert className="mr-2 h-3.5 w-3.5" />
								Purge
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
