"use client";

import { Building2, PlusCircle, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ClientPortfolioCard } from "@/components/features/clients/components/client-portfolio-card";
import {
	type ClientStatus,
	portfolioClients,
} from "@/components/features/clients/mock-data";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

const sortOptions = {
	"name-asc": "Name (A-Z)",
	"streams-desc": "Most streams",
	"pipeline-desc": "Pipeline value",
	"recent-activity": "Recent activity",
} as const;

type SortOption = keyof typeof sortOptions;

function bySortOption(
	a: (typeof portfolioClients)[number],
	b: (typeof portfolioClients)[number],
	sort: SortOption,
) {
	if (sort === "name-asc") {
		return a.name.localeCompare(b.name);
	}

	if (sort === "streams-desc") {
		return b.streamCount - a.streamCount;
	}

	if (sort === "pipeline-desc") {
		return b.pipelineValue - a.pipelineValue;
	}

	const weight = (value: string) => {
		if (value.endsWith("m ago")) {
			return 4;
		}

		if (value.endsWith("h ago")) {
			return 3;
		}

		if (value.endsWith("d ago")) {
			return 2;
		}

		return 1;
	};

	return weight(b.lastActivity) - weight(a.lastActivity);
}

export default function ClientsPage() {
	const [searchValue, setSearchValue] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | ClientStatus>("all");
	const [industryFilter, setIndustryFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<SortOption>("name-asc");

	const industries = useMemo(
		() =>
			Array.from(
				new Set(portfolioClients.map((client) => client.industry)),
			).sort(),
		[],
	);

	const filteredClients = useMemo(() => {
		const query = searchValue.trim().toLowerCase();

		return portfolioClients
			.filter((client) => {
				if (statusFilter !== "all" && client.status !== statusFilter) {
					return false;
				}

				if (industryFilter !== "all" && client.industry !== industryFilter) {
					return false;
				}

				if (!query) {
					return true;
				}

				return (
					client.name.toLowerCase().includes(query) ||
					client.contactName.toLowerCase().includes(query) ||
					client.contactEmail.toLowerCase().includes(query)
				);
			})
			.toSorted((a, b) => bySortOption(a, b, sortBy));
	}, [industryFilter, searchValue, sortBy, statusFilter]);

	const totalPipeline = useMemo(
		() =>
			filteredClients.reduce((sum, client) => sum + client.pipelineValue, 0),
		[filteredClients],
	);

	const totalStreams = useMemo(
		() => filteredClients.reduce((sum, client) => sum + client.streamCount, 0),
		[filteredClients],
	);

	return (
		<div className="flex flex-col gap-8">
			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
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
							Manage industrial accounts, monitor stream performance, and
							prioritize high-value opportunities.
						</p>
					</div>
					<Button>
						<PlusCircle data-icon="inline-start" aria-hidden="true" />
						Add New Client
					</Button>
				</div>

				<div className="mt-6 grid gap-3 md:grid-cols-3">
					<div className="rounded-xl bg-surface-container-low p-4">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Visible clients
						</p>
						<p className="mt-1 font-display text-3xl font-semibold text-foreground">
							{filteredClients.length}
						</p>
					</div>
					<div className="rounded-xl bg-surface-container-low p-4">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Active streams
						</p>
						<p className="mt-1 font-display text-3xl font-semibold text-foreground">
							{totalStreams}
						</p>
					</div>
					<div className="rounded-xl bg-surface-container-low p-4">
						<p className="text-[0.68rem] uppercase tracking-[0.08em] text-secondary">
							Pipeline value
						</p>
						<p className="mt-1 font-display text-3xl font-semibold text-foreground">
							{currencyFormatter.format(totalPipeline)}
						</p>
					</div>
				</div>
			</section>

			<section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div className="relative flex-1">
						<Search
							aria-hidden="true"
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							placeholder="Search client, contact, or email"
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
							className="pl-9"
						/>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row lg:w-auto">
						<Select
							value={industryFilter}
							onValueChange={(value) => setIndustryFilter(value)}
						>
							<SelectTrigger className="w-full bg-surface sm:w-48">
								<SelectValue placeholder="Industry" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All industries</SelectItem>
									{industries.map((industry) => (
										<SelectItem key={industry} value={industry}>
											{industry}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
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

				<div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<Tabs
						value={statusFilter}
						onValueChange={(value) =>
							setStatusFilter(value as "all" | ClientStatus)
						}
					>
						<TabsList className="bg-surface-container-low">
							<TabsTrigger value="all">All clients</TabsTrigger>
							<TabsTrigger value="active">Active</TabsTrigger>
							<TabsTrigger value="prospect">Prospects</TabsTrigger>
							<TabsTrigger value="inactive">Inactive</TabsTrigger>
						</TabsList>
					</Tabs>
					<p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
						<SlidersHorizontal aria-hidden="true" className="size-3.5" />
						Showing {filteredClients.length} of {portfolioClients.length}{" "}
						clients
					</p>
				</div>
			</section>

			<section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
				{filteredClients.map((client) => (
					<ClientPortfolioCard key={client.id} client={client} />
				))}
			</section>
		</div>
	);
}
