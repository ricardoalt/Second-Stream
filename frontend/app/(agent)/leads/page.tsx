"use client";

import {
	AlertCircle,
	ChevronRight,
	LayoutDashboard,
	UserRoundSearch,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddClientDialog } from "@/components/features/clients/add-client-dialog";
import {
	EmptyState,
	FadeIn,
	FilterBar,
	HoverLift,
	KpiCard,
	PageHeader,
	PageShell,
	StatRail,
	TableContainer,
} from "@/components/patterns";
import {
	Avatar,
	AvatarFallback,
	Button,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui";
import { companiesAPI } from "@/lib/api/companies";
import type { PortfolioRow } from "@/lib/mappers/company-client";
import { toPortfolioRow } from "@/lib/mappers/company-client";
import type { CompanySummary } from "@/lib/types/company";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

const AVATAR_COLORS = [
	"bg-primary/10 text-primary border border-primary/30",
	"bg-success/10 text-success border border-success/30",
	"bg-warning/10 text-warning border border-warning/30",
	"bg-destructive/10 text-destructive border border-destructive/30",
	"bg-info/10 text-info border border-info/30",
	"bg-muted text-muted-foreground border border-muted-foreground/30",
] as const;

function getAvatarColor(name: string): string {
	if (!name || name.length === 0) return AVATAR_COLORS[0];
	const index = name.charCodeAt(0) % AVATAR_COLORS.length;
	return AVATAR_COLORS[index] ?? AVATAR_COLORS[0];
}

const SORT_OPTIONS = [
	{ value: "name-asc", label: "Name (A-Z)" },
	{ value: "name-desc", label: "Name (Z-A)" },
	{ value: "locations-desc", label: "Most locations" },
	{ value: "recent-update", label: "Recently updated" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export default function LeadsPage() {
	const router = useRouter();
	const [searchValue, setSearchValue] = useState("");
	const [sortBy, setSortBy] = useState<SortOption>("name-asc");
	const [companies, setCompanies] = useState<PortfolioRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchCompanies = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const data: CompanySummary[] = await companiesAPI.list("active", "lead");
			setCompanies(data.map(toPortfolioRow));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load leads");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCompanies();
	}, [fetchCompanies]);

	const filteredLeads = useMemo(() => {
		const query = searchValue.trim().toLowerCase();
		return companies
			.filter((row) => !query || row.name.toLowerCase().includes(query))
			.toSorted((a, b) => {
				if (sortBy === "name-asc") return a.name.localeCompare(b.name);
				if (sortBy === "name-desc") return b.name.localeCompare(a.name);
				if (sortBy === "locations-desc")
					return b.locationCount - a.locationCount;
				return (
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
				);
			});
	}, [companies, searchValue, sortBy]);

	const activeFilterCount =
		(searchValue.trim() ? 1 : 0) + (sortBy !== "name-asc" ? 1 : 0);

	return (
		<PageShell gap="lg">
			<FadeIn direction="up">
				<PageHeader
					title="Lead Portfolio"
					subtitle="Track pre-client companies before their first stream is created."
					icon={UserRoundSearch}
					badge="Leads"
					variant="hero"
					breadcrumbs={[{ label: "Home", href: "/" }, { label: "Leads" }]}
					actions={
						<AddClientDialog
							onSubmitted={() => {
								void fetchCompanies();
							}}
						/>
					}
				/>
			</FadeIn>

			<StatRail columns={2}>
				<HoverLift>
					<KpiCard
						title="Total Leads"
						value={loading ? "—" : companies.length}
						icon={UserRoundSearch}
						variant="warning"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Visible Leads"
						value={loading ? "—" : filteredLeads.length}
						icon={LayoutDashboard}
						variant="accent"
					/>
				</HoverLift>
			</StatRail>

			<div className="flex flex-col gap-4">
				<FilterBar
					search={{
						value: searchValue,
						onChange: setSearchValue,
						placeholder: "Search by company name…",
					}}
					filters={[
						{
							key: "sort",
							placeholder: "Sort by",
							value: sortBy,
							onChange: (v) => setSortBy(v as SortOption),
							options: [...SORT_OPTIONS],
							width: "w-[200px]",
						},
					]}
					activeFilterCount={activeFilterCount}
					onClear={() => {
						setSearchValue("");
						setSortBy("name-asc");
					}}
				/>

				<TableContainer>
					{loading ? (
						<div className="flex flex-col gap-3 px-6 py-5">
							<Skeleton className="h-10 w-full" />
							{Array.from({ length: 5 }).map((_, index) => (
								<Skeleton
									key={`leads-skeleton-row-${index + 1}`}
									className="h-14 w-full"
								/>
							))}
						</div>
					) : error ? (
						<div className="flex flex-col items-center gap-3 px-6 py-16">
							<div className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
								<AlertCircle
									aria-hidden
									className="size-4 shrink-0 text-destructive"
								/>
								<p className="text-sm text-destructive">{error}</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => void fetchCompanies()}
							>
								Retry
							</Button>
						</div>
					) : filteredLeads.length === 0 ? (
						<EmptyState
							title={
								companies.length === 0
									? "No leads yet"
									: "No leads match your search"
							}
							description={
								companies.length === 0
									? "Create a company to start lead qualification before first stream creation."
									: "Try adjusting your search terms."
							}
							icon={UserRoundSearch}
							action={
								companies.length === 0 ? (
									<AddClientDialog />
								) : (
									<Button variant="outline" onClick={() => setSearchValue("")}>
										Clear Search
									</Button>
								)
							}
							className="border-0 bg-transparent"
						/>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="bg-surface-container-low">
									<TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide">
										Lead name
									</TableHead>
									<TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide">
										Industry
									</TableHead>
									<TableHead className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide">
										Locations
									</TableHead>
									<TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide">
										Updated
									</TableHead>
									<TableHead className="px-4 py-3 text-right">&nbsp;</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredLeads.map((row) => (
									<TableRow
										key={row.id}
										onClick={() => router.push(`/leads/${row.id}`)}
										className="cursor-pointer transition-colors duration-150 hover:bg-surface-container-low/80"
									>
										<TableCell className="px-4 py-3">
											<div className="flex items-center gap-3">
												<Avatar className="size-9 shrink-0">
													<AvatarFallback
														className={cn(
															"text-xs font-semibold",
															getAvatarColor(row.name),
														)}
													>
														{getInitials(row.name)}
													</AvatarFallback>
												</Avatar>
												<span className="font-medium text-foreground">
													{row.name}
												</span>
											</div>
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground">
											{row.industry || "—"}
										</TableCell>
										<TableCell className="px-4 py-3 text-center text-sm text-muted-foreground">
											{row.locationCount}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground">
											{new Date(row.updatedAt).toLocaleDateString()}
										</TableCell>
										<TableCell className="px-4 py-3 text-right">
											<ChevronRight
												aria-hidden
												className="size-4 text-muted-foreground"
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TableContainer>
			</div>
		</PageShell>
	);
}
