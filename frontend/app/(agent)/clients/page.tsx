"use client";

import {
	Building2,
	ChevronRight,
	Loader2,
	Search,
	SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddClientDialog } from "@/components/features/clients/add-client-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { companiesAPI } from "@/lib/api/companies";
import type { PortfolioRow } from "@/lib/mappers/company-client";
import { toPortfolioRow } from "@/lib/mappers/company-client";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

const AVATAR_COLORS = [
	"bg-primary/15 text-primary",
	"bg-success/15 text-success",
	"bg-warning/15 text-warning",
	"bg-destructive/15 text-destructive",
	"bg-info/15 text-info",
	"bg-accent/15 text-accent",
] as const;

function getAvatarColor(name: string): string {
	if (!name || name.length === 0) {
		return AVATAR_COLORS[0];
	}
	const index = name.charCodeAt(0) % AVATAR_COLORS.length;
	return AVATAR_COLORS[index] ?? AVATAR_COLORS[0];
}

const sortOptions = {
	"name-asc": "Name (A-Z)",
	"name-desc": "Name (Z-A)",
	"locations-desc": "Most locations",
	"recent-update": "Recently updated",
} as const;

type SortOption = keyof typeof sortOptions;

function bySortOption(a: PortfolioRow, b: PortfolioRow, sort: SortOption) {
	if (sort === "name-asc") return a.name.localeCompare(b.name);
	if (sort === "name-desc") return b.name.localeCompare(a.name);
	if (sort === "locations-desc") return b.locationCount - a.locationCount;
	// recent-update
	return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

// ── Component ────────────────────────────────────────────

export default function ClientsPage() {
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
			const data = await companiesAPI.list("active");
			setCompanies(data.map(toPortfolioRow));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load clients");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCompanies();
	}, [fetchCompanies]);

	const filteredClients = useMemo(() => {
		const query = searchValue.trim().toLowerCase();

		return companies
			.filter((row) => {
				if (!query) return true;
				return row.name.toLowerCase().includes(query);
			})
			.toSorted((a, b) => bySortOption(a, b, sortBy));
	}, [companies, searchValue, sortBy]);

	return (
		<div className="flex flex-col gap-10">
			{/* ── Header ── */}
			<section className="animate-fade-in-up relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-xs">
				<div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-container" />
				<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex flex-col gap-2">
						<div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-secondary">
							<Building2 aria-hidden="true" className="size-3.5" />
							Client portfolio
						</div>
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							Client Portfolio
						</h1>
						<p className="max-w-3xl text-sm text-muted-foreground">
							Manage industrial accounts and monitor active locations.
						</p>
					</div>
					<AddClientDialog onSubmitted={fetchCompanies} />
				</div>

				{/* ── KPI row ── */}
				<div className="animate-stagger mt-6 grid gap-3 md:grid-cols-2">
					<div className="rounded-xl bg-surface-container-low p-4">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Total clients
						</p>
						<p className="mt-1 font-display text-3xl font-semibold text-foreground">
							{loading ? "—" : companies.length}
						</p>
					</div>
					<div className="rounded-xl bg-surface-container-low p-4">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Visible clients
						</p>
						<p className="mt-1 font-display text-3xl font-semibold text-foreground">
							{loading ? "—" : filteredClients.length}
						</p>
					</div>
				</div>
			</section>

			{/* ── Filter bar ── */}
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-xs">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div className="relative flex-1">
						<Search
							aria-hidden="true"
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							placeholder="Search by company name"
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
							className="pl-9"
						/>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row lg:w-auto">
						<Select
							value={sortBy}
							onValueChange={(value) => setSortBy(value as SortOption)}
						>
							<SelectTrigger className="w-full bg-surface sm:w-48">
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{Object.entries(sortOptions).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="mt-4 flex items-center justify-between">
					<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
						<SlidersHorizontal aria-hidden="true" className="size-3.5" />
						Showing {filteredClients.length} of {companies.length} clients
					</p>
				</div>
			</section>

			{/* ── Operations table ── */}
			<section className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xs">
				{loading ? (
					<div className="flex items-center justify-center gap-3 px-6 py-16">
						<Loader2 className="size-5 animate-spin text-primary" />
						<p className="text-sm text-muted-foreground">Loading clients…</p>
					</div>
				) : error ? (
					<div className="flex flex-col items-center gap-3 px-6 py-16">
						<p className="text-sm text-destructive">{error}</p>
						<Button variant="outline" size="sm" onClick={fetchCompanies}>
							Retry
						</Button>
					</div>
				) : filteredClients.length === 0 ? (
					<div className="flex items-center justify-center px-6 py-16">
						<p className="text-sm text-muted-foreground">
							{companies.length === 0
								? "No clients yet. Use the Discovery Wizard to create waste streams for a company."
								: "No clients match your search."}
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow className="bg-surface-container-low">
								<TableHead className="px-4 py-3 text-[0.68rem]">
									Client name
								</TableHead>
								<TableHead className="px-4 py-3 text-[0.68rem]">
									Industry
								</TableHead>
								<TableHead className="px-4 py-3 text-center text-[0.68rem]">
									Locations
								</TableHead>
								<TableHead className="px-4 py-3 text-[0.68rem]">
									Updated
								</TableHead>
								<TableHead className="px-4 py-3 text-right text-[0.68rem]">
									&nbsp;
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredClients.map((row, index) => (
								<TableRow
									key={row.id}
									onClick={() => router.push(`/clients/${row.id}`)}
									className={cn(
										"cursor-pointer transition-colors hover:bg-surface-container-low/60",
										index % 2 === 0 ? "bg-surface" : "bg-surface-container-low",
									)}
								>
									<TableCell className="px-4 py-3">
										<div className="flex items-center gap-3">
											<Avatar className="h-9 w-9 shrink-0">
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
			</section>
		</div>
	);
}
