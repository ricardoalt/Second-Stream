"use client";

import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { APIClientError } from "@/lib/api/client";
import {
	type AgentDetailResponse,
	organizationsAPI,
} from "@/lib/api/organizations";
import { PERMISSIONS } from "@/lib/authz/permissions";
import { useAuth } from "@/lib/contexts";

type AgentDetailPageContentProps = {
	userId: string;
};

const PAGE_SIZE = 10;

export function resolveAgentDetailErrorMessage(error: unknown): string {
	if (
		error instanceof APIClientError &&
		error.message.toLowerCase().includes("not found")
	) {
		return "Field agent not found.";
	}

	return error instanceof Error
		? error.message
		: "Failed to load field agent detail.";
}

function KpiCard({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex flex-col justify-between rounded-xl border border-border bg-background p-5 shadow-sm border-t-2 border-t-primary/20">
			<p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4">
				{label}
			</p>
			<p className="text-3xl font-bold tracking-tight text-foreground">
				{value}
			</p>
		</div>
	);
}

export function AgentDetailLoadedState({
	detail,
	displayName,
	page,
	onPrevPage,
	onNextPage,
}: {
	detail: AgentDetailResponse;
	displayName: string;
	page: number;
	onPrevPage: () => void;
	onNextPage: () => void;
}) {
	return (
		<div className="space-y-8">
			{/* Hero / Header */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-muted/20 p-8 rounded-2xl border border-border">
				<div className="flex items-center gap-6">
					<div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold uppercase border border-primary/20">
						{detail.user.firstName?.[0]}
						{detail.user.lastName?.[0]}
					</div>
					<div className="space-y-1.5">
						<div className="flex items-center gap-3">
							<h1 className="text-3xl font-extrabold tracking-tight text-foreground">
								{displayName}
							</h1>
							<Badge
								variant={detail.user.isActive ? "default" : "secondary"}
								className="uppercase tracking-wider text-[10px]"
							>
								{detail.user.isActive ? "Active" : "Inactive"}
							</Badge>
						</div>
						<p className="text-base text-muted-foreground flex items-center gap-2">
							{detail.user.email}
							<span className="text-muted-foreground/30">•</span>
							<span className="capitalize">
								{detail.user.role.replace("_", " ")}
							</span>
						</p>
					</div>
				</div>
			</div>

			{/* KPI Strip */}
			<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
				<KpiCard label="OPEN STREAMS" value={detail.kpis.openStreams} />
				<KpiCard
					label="MISSING INFORMATION"
					value={detail.kpis.missingInformation}
				/>
				<KpiCard
					label="OFFERS IN PROGRESS"
					value={detail.kpis.offersInProgress}
				/>
				<KpiCard
					label="COMPLETED STREAMS"
					value={detail.kpis.completedStreams}
				/>
			</div>

			{/* Streams Table */}
			<div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
				<div className="border-b border-border bg-background px-6 py-5">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-bold text-foreground">
								Owned Streams
							</h2>
						</div>
					</div>
				</div>
				{detail.streams.length === 0 ? (
					<div className="px-6 py-12 text-center flex flex-col items-center justify-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/5 mb-4">
							<span className="text-xl text-muted-foreground">—</span>
						</div>
						<p className="text-base font-medium text-foreground">
							No streams found
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							This agent is not assigned to any open streams.
						</p>
					</div>
				) : (
					<div className="p-6 pt-0">
						<div className="rounded-none border-t border-border mt-4">
							<Table>
								<TableHeader className="bg-muted/30">
									<TableRow>
										<TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											STREAM
										</TableHead>
										<TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											STATUS
										</TableHead>
										<TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											COMPANY
										</TableHead>
										<TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											LOCATION
										</TableHead>
										<TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											MISSING INFO
										</TableHead>
										<TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
											OFFER STATE
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{detail.streams.map((stream) => (
										<TableRow
											key={stream.projectId}
											className="hover:bg-muted/50 transition-colors"
										>
											<TableCell className="font-semibold text-foreground">
												{stream.streamName}
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className="capitalize text-xs font-medium"
												>
													{stream.status.replace("_", " ")}
												</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{stream.companyLabel ?? "—"}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{stream.locationLabel ?? "—"}
											</TableCell>
											<TableCell>
												{stream.missingRequiredInfo ? (
													<Badge
														variant="secondary"
														className="bg-warning/10 text-warning border-transparent"
													>
														Yes
													</Badge>
												) : (
													<Badge
														variant="outline"
														className="text-muted-foreground"
													>
														No
													</Badge>
												)}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{stream.proposalFollowUpState ?? "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				)}
			</div>

			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onPrevPage}
					disabled={page <= 1}
				>
					<ChevronLeft className="mr-1 h-4 w-4" /> Prev
				</Button>
				<span className="text-sm text-muted-foreground">
					Page {detail.page} of {detail.pages}
				</span>
				<Button
					variant="outline"
					size="sm"
					onClick={onNextPage}
					disabled={page >= detail.pages}
				>
					Next <ChevronRight className="ml-1 h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

export function AgentDetailPageContent({
	userId,
}: AgentDetailPageContentProps) {
	const { user: currentUser, isSuperAdmin } = useAuth();
	const canViewUsers =
		isSuperAdmin ||
		Boolean(currentUser?.permissions?.includes(PERMISSIONS.ORG_USER_READ));

	const [detail, setDetail] = useState<AgentDetailResponse | null>(null);
	const [page, setPage] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		if (!canViewUsers) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setErrorMessage(null);

		void organizationsAPI
			.getMyOrgUserDetail(userId, { page, size: PAGE_SIZE })
			.then((response) => setDetail(response))
			.catch((error: unknown) => {
				setErrorMessage(resolveAgentDetailErrorMessage(error));
			})
			.finally(() => setIsLoading(false));
	}, [canViewUsers, page, userId]);

	const displayName = useMemo(() => {
		if (!detail) return "Field Agent";
		return (
			`${detail.user.firstName} ${detail.user.lastName}`.trim() ||
			detail.user.email
		);
	}, [detail]);

	if (!canViewUsers) {
		return (
			<div className="flex items-center justify-center min-h-[300px]">
				<p className="text-muted-foreground">
					Access denied. Only Org Admins can view team details.
				</p>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8">
			<div className="flex items-center gap-3">
				<Button
					asChild
					variant="ghost"
					size="sm"
					className="text-muted-foreground hover:text-foreground"
				>
					<Link href="/settings/team">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Team Management
					</Link>
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-8">
					<Skeleton className="h-40 w-full rounded-2xl" />
					<div className="grid gap-4 md:grid-cols-4">
						<Skeleton className="h-32 w-full rounded-xl" />
						<Skeleton className="h-32 w-full rounded-xl" />
						<Skeleton className="h-32 w-full rounded-xl" />
						<Skeleton className="h-32 w-full rounded-xl" />
					</div>
					<Skeleton className="h-96 w-full rounded-xl" />
				</div>
			) : errorMessage ? (
				<Alert variant="destructive">
					<AlertTitle>Unable to load detail</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			) : detail ? (
				<AgentDetailLoadedState
					detail={detail}
					displayName={displayName}
					page={page}
					onPrevPage={() => setPage((prev) => prev - 1)}
					onNextPage={() => setPage((prev) => prev + 1)}
				/>
			) : null}
		</div>
	);
}
