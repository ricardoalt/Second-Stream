"use client";

/**
 * CompanyCard - Display company summary in a card
 */
import {
	Building2,
	Edit,
	FolderKanban,
	MapPin,
	MoreVertical,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatSubsector } from "@/components/shared/forms/compact-sector-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjects } from "@/lib/stores/project-store";
import type { CompanySummary } from "@/lib/types/company";
import { CUSTOMER_TYPE_LABELS } from "@/lib/types/company";
import { CreateCompanyDialog } from "./create-company-dialog";

interface CompanyCardProps {
	company: CompanySummary;
	onDelete?: (companyId: string) => void;
}

export function CompanyCard({ company, onDelete }: CompanyCardProps) {
	const router = useRouter();
	const allProjects = useProjects();
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);

	// Memoized to avoid O(n) filter on every render
	const recentAssessments = useMemo(
		() =>
			allProjects
				.filter((p) => p.client === company.name)
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				)
				.slice(0, 2),
		[allProjects, company.name],
	);

	return (
		<Card className="transition-shadow hover:shadow-md hover:border-primary/50">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<Link
						href={`/companies/${company.id}`}
						className="flex items-center gap-2 flex-1 min-w-0"
					>
						<Building2 className="h-5 w-5 text-primary shrink-0" />
						<CardTitle className="text-lg truncate">{company.name}</CardTitle>
						<Badge variant="secondary" className="shrink-0">
							{CUSTOMER_TYPE_LABELS[company.customerType]}
						</Badge>
						<Badge variant="outline" className="shrink-0">
							{company.subsector
								? formatSubsector(company.subsector)
								: company.sector}
						</Badge>
					</Link>
					{onDelete && (
						<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0"
									aria-label="Company options"
								>
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onSelect={(event) => {
										event.preventDefault();
										setMenuOpen(false);
										requestAnimationFrame(() => {
											setEditDialogOpen(true);
										});
									}}
								>
									<Edit className="mr-2 h-4 w-4" />
									Edit
								</DropdownMenuItem>
								<DropdownMenuItem
									onSelect={(event) => {
										event.preventDefault();
										setMenuOpen(false);
										requestAnimationFrame(() => {
											onDelete?.(company.id);
										});
									}}
									className="text-destructive focus:text-destructive"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</CardHeader>

			<Link href={`/companies/${company.id}`} className="block">
				<CardContent className="space-y-3">
					{company.sector &&
						company.subsector &&
						company.subsector !== "other" && (
							<div className="flex flex-wrap gap-2">
								<Badge variant="secondary" className="capitalize">
									{company.sector}
								</Badge>
								<Badge variant="outline" className="text-xs">
									{company.subsector.replace(/_/g, " ")}
								</Badge>
							</div>
						)}

					{(company.contactName ||
						company.contactEmail ||
						company.contactPhone) && (
						<div className="space-y-1 text-sm">
							{company.contactName && (
								<div className="text-muted-foreground">
									<span className="font-medium">Contact:</span>{" "}
									{company.contactName}
								</div>
							)}
							{company.contactEmail && (
								<div className="text-muted-foreground">
									<span className="font-medium">Email:</span>{" "}
									{company.contactEmail}
								</div>
							)}
							{company.contactPhone && (
								<div className="text-muted-foreground">
									<span className="font-medium">Phone:</span>{" "}
									{company.contactPhone}
								</div>
							)}
						</div>
					)}

					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-1">
							<MapPin className="h-4 w-4 text-muted-foreground" />
							<span className="font-medium">{company.locationCount ?? 0}</span>
							<span className="text-muted-foreground">
								{(company.locationCount ?? 0) === 1 ? "location" : "locations"}
							</span>
						</div>
					</div>

					{company.tags && company.tags.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{company.tags.slice(0, 3).map((tag) => (
								<Badge key={tag} variant="secondary" className="text-xs">
									{tag}
								</Badge>
							))}
							{company.tags.length > 3 && (
								<Badge variant="secondary" className="text-xs">
									+{company.tags.length - 3}
								</Badge>
							)}
						</div>
					)}

					<div className="text-xs text-muted-foreground pt-2 border-t">
						Created {new Date(company.createdAt).toLocaleDateString()}
					</div>
				</CardContent>
			</Link>

			{recentAssessments.length > 0 && (
				<CardContent className="pt-0">
					<div className="space-y-2 pt-2 border-t">
						<div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<FolderKanban className="h-3.5 w-3.5" />
							Recent Waste Streams
						</div>
						<div className="space-y-1.5">
							{recentAssessments.map((assessment) => (
								<button
									type="button"
									key={assessment.id}
									className="flex items-center justify-between w-full p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer text-left"
									onClick={() => router.push(`/project/${assessment.id}`)}
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{assessment.name}
										</p>
										<p className="text-xs text-muted-foreground truncate">
											{assessment.location}
										</p>
									</div>
									<Badge variant="outline" className="text-xs capitalize ml-2">
										{assessment.status}
									</Badge>
								</button>
							))}
						</div>
					</div>
				</CardContent>
			)}

			{/* Edit Dialog - Reuse CreateCompanyDialog in edit mode (DRY) */}
			{editDialogOpen && (
				<CreateCompanyDialog
					companyToEdit={{
						id: company.id,
						name: company.name,
						industry: company.industry,
						sector: company.sector,
						subsector: company.subsector,
						customerType: company.customerType,
						...(company.contactName && { contactName: company.contactName }),
						...(company.contactEmail && { contactEmail: company.contactEmail }),
						...(company.contactPhone && { contactPhone: company.contactPhone }),
						...(company.notes && { notes: company.notes }),
					}}
					onSuccess={() => {
						setEditDialogOpen(false);
						// Store will auto-refresh
					}}
				/>
			)}
		</Card>
	);
}
