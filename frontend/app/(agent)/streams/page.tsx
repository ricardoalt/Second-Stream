"use client";

import { Download, Filter, PlusCircle, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useDiscoveryWizard } from "@/components/features/discovery/discovery-wizard-provider";
import { allStreams } from "@/components/features/streams/mock-data";
import { StreamsAllTable } from "@/components/features/streams/streams-all-table";
import { StreamsRouteTabs } from "@/components/features/streams/streams-route-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export default function AgentStreamsPage() {
	const discoveryWizard = useDiscoveryWizard();
	const [search, setSearch] = useState("");
	const [clientFilter, setClientFilter] = useState("all");
	const [phaseFilter, setPhaseFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const filteredRows = useMemo(() => {
		const normalizedSearch = search.trim().toLowerCase();

		return allStreams.filter((row) => {
			const matchSearch =
				normalizedSearch.length === 0 ||
				row.name.toLowerCase().includes(normalizedSearch) ||
				row.client.toLowerCase().includes(normalizedSearch) ||
				row.wasteType.toLowerCase().includes(normalizedSearch);

			const matchClient = clientFilter === "all" || row.client === clientFilter;
			const matchPhase =
				phaseFilter === "all" || String(row.phase) === phaseFilter;
			const matchStatus = statusFilter === "all" || row.status === statusFilter;

			return matchSearch && matchClient && matchPhase && matchStatus;
		});
	}, [clientFilter, phaseFilter, search, statusFilter]);

	function toggleRow(id: string, checked: boolean) {
		setSelectedIds((current) => {
			if (checked) {
				return current.includes(id) ? current : [...current, id];
			}
			return current.filter((selectedId) => selectedId !== id);
		});
	}

	function toggleAll(checked: boolean) {
		if (checked) {
			setSelectedIds(filteredRows.map((row) => row.id));
			return;
		}
		setSelectedIds([]);
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
							Waste Streams
						</h1>
						<p className="text-sm text-muted-foreground">
							Track, validate, and propose disposal routes for active industrial
							byproduct flows.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button variant="secondary">
							<PlusCircle data-icon="inline-start" aria-hidden />
							New stream
						</Button>
						<Button onClick={discoveryWizard.open}>
							<Sparkles data-icon="inline-start" aria-hidden />
							New Discovery
						</Button>
					</div>
				</div>
			</section>

			<StreamsRouteTabs />

			<Card className="bg-surface-container-lowest shadow-sm">
				<CardHeader className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<CardTitle className="font-display text-xl">
							All active streams
						</CardTitle>
						<div className="flex flex-wrap gap-2">
							<Button variant="ghost">
								<Filter data-icon="inline-start" aria-hidden />
								Advanced filter
							</Button>
							<Button variant="ghost">
								<Download data-icon="inline-start" aria-hidden />
								Export
							</Button>
						</div>
					</div>

					<div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
						<div className="relative">
							<Search
								aria-hidden
								className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search stream, client, waste type"
								className="pl-9"
							/>
						</div>

						<Select value={clientFilter} onValueChange={setClientFilter}>
							<SelectTrigger>
								<SelectValue placeholder="Client" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All clients</SelectItem>
									{[...new Set(allStreams.map((stream) => stream.client))].map(
										(client) => (
											<SelectItem key={client} value={client}>
												{client}
											</SelectItem>
										),
									)}
								</SelectGroup>
							</SelectContent>
						</Select>

						<Select value={phaseFilter} onValueChange={setPhaseFilter}>
							<SelectTrigger>
								<SelectValue placeholder="Phase" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All phases</SelectItem>
									<SelectItem value="1">Phase 1</SelectItem>
									<SelectItem value="2">Phase 2</SelectItem>
									<SelectItem value="3">Phase 3</SelectItem>
									<SelectItem value="4">Phase 4</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>

						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger>
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All statuses</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="missing_info">Missing info</SelectItem>
									<SelectItem value="blocked">Blocked</SelectItem>
									<SelectItem value="ready_for_offer">
										Ready for offer
									</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					{selectedIds.length > 0 && (
						<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3">
							<Badge variant="muted" className="rounded-full border-0">
								{selectedIds.length} selected
							</Badge>
							<div className="flex flex-wrap gap-2">
								<Button size="sm" variant="secondary">
									Assign agent
								</Button>
								<Button size="sm" variant="secondary">
									Change status
								</Button>
								<Button size="sm" variant="ghost">
									Archive
								</Button>
							</div>
						</div>
					)}
				</CardHeader>
				<CardContent className="pt-0">
					<StreamsAllTable
						rows={filteredRows}
						selectedIds={selectedIds.filter((id) =>
							filteredRows.some((row) => row.id === id),
						)}
						onToggleRow={toggleRow}
						onToggleAll={toggleAll}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
