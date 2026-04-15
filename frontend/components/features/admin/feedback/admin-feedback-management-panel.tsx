"use client";

import {
	AlertCircle,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Download,
	ExternalLink,
	FileText,
	MessageSquare,
	Paperclip,
	RefreshCw,
	RotateCcw,
	Search,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import {
	EmptyState,
	FilterBar,
	KpiCard,
	StatRail,
} from "@/components/patterns";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui";
import {
	type AdminFeedbackAttachment,
	type AdminFeedbackItem,
	FEEDBACK_TYPE_CONFIG,
	type FeedbackType,
	feedbackAPI,
	type ListFeedbackParams,
} from "@/lib/api/feedback";
import { cn } from "@/lib/utils";

type DaysFilter = "7" | "30" | "all";
type StatusFilter = "all" | "open" | "resolved";
type FeedbackPanelVariant = "full" | "compact";

interface AdminFeedbackManagementPanelProps {
	organizationId: string;
	title: string;
	description: string;
	variant?: FeedbackPanelVariant;
	limit?: number;
	showStats?: boolean;
	allowDelete?: boolean;
	fullViewHref?: string;
	fullViewLabel?: string;
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}...`;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	return `${(kb / 1024).toFixed(1)} MB`;
}

function omitRecordKey<T>(
	record: Record<string, T>,
	key: string,
): Record<string, T> {
	const next = { ...record };
	delete next[key];
	return next;
}

export function AdminFeedbackManagementPanel({
	organizationId,
	title,
	description,
	variant = "full",
	limit = 100,
	showStats = true,
	allowDelete = variant === "full",
	fullViewHref,
	fullViewLabel = "Open full feedback manager",
}: AdminFeedbackManagementPanelProps) {
	const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [feedbackLoadError, setFeedbackLoadError] = useState<string | null>(
		null,
	);
	const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [attachmentsById, setAttachmentsById] = useState<
		Record<string, AdminFeedbackAttachment[]>
	>({});
	const [attachmentsLoading, setAttachmentsLoading] = useState<
		Record<string, boolean>
	>({});
	const [attachmentsError, setAttachmentsError] = useState<
		Record<string, string | null>
	>({});
	const [deleteTarget, setDeleteTarget] = useState<AdminFeedbackItem | null>(
		null,
	);
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const [deleteLoading, setDeleteLoading] = useState(false);

	const [daysFilter, setDaysFilter] = useState<DaysFilter>("all");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");

	const requestIdRef = useRef(0);

	const loadFeedback = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		setLoading(true);
		setFeedbackLoadError(null);

		try {
			const params: ListFeedbackParams = {
				limit,
				...(daysFilter !== "all" && { days: Number(daysFilter) as 7 | 30 }),
				...(statusFilter !== "all" && {
					resolved: statusFilter === "resolved",
				}),
				...(typeFilter !== "all" && { feedbackType: typeFilter }),
			};

			const data = await feedbackAPI.list(params, { organizationId });
			if (requestId !== requestIdRef.current) return;
			setFeedback(data);
		} catch {
			if (requestId !== requestIdRef.current) return;
			setFeedback([]);
			setFeedbackLoadError("Failed to load feedback. Please retry.");
			toast.error("Failed to load feedback");
		} finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
			}
		}
	}, [organizationId, limit, daysFilter, statusFilter, typeFilter]);

	useEffect(() => {
		void loadFeedback();
	}, [loadFeedback]);

	const isDeleteConfirmValid = deleteConfirmText === "DELETE";

	const handleDeleteOpenChange = (open: boolean) => {
		if (!open) {
			setDeleteTarget(null);
			setDeleteConfirmText("");
		}
	};

	const handleDelete = useCallback(async () => {
		if (!deleteTarget || deleteConfirmText !== "DELETE") return;
		setDeleteLoading(true);

		try {
			await feedbackAPI.delete(deleteTarget.id, { organizationId });
			setFeedback((prev) => prev.filter((item) => item.id !== deleteTarget.id));
			setAttachmentsById((prev) => omitRecordKey(prev, deleteTarget.id));
			setAttachmentsLoading((prev) => omitRecordKey(prev, deleteTarget.id));
			setAttachmentsError((prev) => omitRecordKey(prev, deleteTarget.id));
			setExpandedId((prev) => (prev === deleteTarget.id ? null : prev));
			setDeleteTarget(null);
			setDeleteConfirmText("");
			toast.success("Feedback deleted");
		} catch {
			toast.error("Failed to delete feedback");
		} finally {
			setDeleteLoading(false);
		}
	}, [deleteTarget, deleteConfirmText, organizationId]);

	const loadAttachments = useCallback(
		async (feedbackId: string, force = false) => {
			if (!force && attachmentsById[feedbackId]) return;
			if (attachmentsLoading[feedbackId]) return;

			setAttachmentsLoading((prev) => ({ ...prev, [feedbackId]: true }));
			setAttachmentsError((prev) => ({ ...prev, [feedbackId]: null }));

			try {
				const data = await feedbackAPI.listAttachments(feedbackId, {
					organizationId,
				});
				setAttachmentsById((prev) => ({ ...prev, [feedbackId]: data }));
			} catch {
				setAttachmentsError((prev) => ({
					...prev,
					[feedbackId]: "Failed to load attachments",
				}));
			} finally {
				setAttachmentsLoading((prev) => ({ ...prev, [feedbackId]: false }));
			}
		},
		[organizationId, attachmentsById, attachmentsLoading],
	);

	const handleToggleExpand = useCallback(
		(feedbackId: string) => {
			setExpandedId((prev) => {
				const next = prev === feedbackId ? null : feedbackId;
				if (next) {
					const item = feedback.find((entry) => entry.id === feedbackId);
					if (item && item.attachmentCount > 0) {
						void loadAttachments(feedbackId);
					}
				}
				return next;
			});
		},
		[feedback, loadAttachments],
	);

	const handleToggleResolved = useCallback(
		async (id: string, resolve: boolean) => {
			let shouldProceed = false;
			setPendingActionIds((prev) => {
				if (prev.has(id)) return prev;
				shouldProceed = true;
				const next = new Set(prev);
				next.add(id);
				return next;
			});
			if (!shouldProceed) return;

			try {
				const updated = resolve
					? await feedbackAPI.resolve(id, { organizationId })
					: await feedbackAPI.reopen(id, { organizationId });

				setFeedback((prev) =>
					prev
						.map((item) => (item.id === id ? updated : item))
						.filter((item) => {
							if (statusFilter === "open") return !item.resolvedAt;
							if (statusFilter === "resolved") return !!item.resolvedAt;
							return true;
						}),
				);

				toast.success(
					resolve ? "Feedback marked as resolved" : "Feedback reopened",
				);
			} catch {
				toast.error(
					resolve ? "Failed to resolve feedback" : "Failed to reopen feedback",
				);
			} finally {
				setPendingActionIds((prev) => {
					const next = new Set(prev);
					next.delete(id);
					return next;
				});
			}
		},
		[organizationId, statusFilter],
	);

	const filteredFeedback = useMemo(() => {
		if (!searchQuery.trim()) return feedback;
		const query = searchQuery.toLowerCase();

		return feedback.filter((item) => {
			const fullName =
				`${item.user.firstName} ${item.user.lastName}`.toLowerCase();
			return (
				item.content.toLowerCase().includes(query) || fullName.includes(query)
			);
		});
	}, [feedback, searchQuery]);

	const stats = useMemo(() => {
		const open = feedback.filter((entry) => !entry.resolvedAt).length;
		return { total: feedback.length, open, resolved: feedback.length - open };
	}, [feedback]);

	const hasActiveFilters =
		daysFilter !== "all" ||
		statusFilter !== "all" ||
		typeFilter !== "all" ||
		searchQuery.trim() !== "";

	const clearFilters = useCallback(() => {
		setDaysFilter("all");
		setStatusFilter("all");
		setTypeFilter("all");
		setSearchQuery("");
	}, []);

	const compact = variant === "compact";

	const compactStats = [
		{
			title: "Total",
			value: stats.total,
			icon: MessageSquare,
			iconClassName: "text-muted-foreground",
		},
		{
			title: "Open",
			value: stats.open,
			icon: AlertCircle,
			iconClassName: "text-warning",
		},
		{
			title: "Resolved",
			value: stats.resolved,
			icon: CheckCircle2,
			iconClassName: "text-success",
		},
	] as const;

	return (
		<TooltipProvider delayDuration={200}>
			<AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteOpenChange}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete feedback?</AlertDialogTitle>
						<AlertDialogDescription className="mt-3 flex flex-col gap-2">
							<span className="block font-medium text-destructive">
								This action cannot be undone.
							</span>
							<span className="block">
								This will permanently delete the feedback and all attachments.
							</span>
							{deleteTarget ? (
								<span className="block text-xs text-muted-foreground">
									{truncate(deleteTarget.content, 120)}
								</span>
							) : null}
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="flex flex-col gap-2">
						<Label htmlFor="feedback-delete-confirm">
							Type <span className="font-mono font-semibold">DELETE</span> to
							confirm:
						</Label>
						<Input
							id="feedback-delete-confirm"
							value={deleteConfirmText}
							onChange={(event) => setDeleteConfirmText(event.target.value)}
							placeholder="DELETE"
							autoComplete="off"
							disabled={deleteLoading}
						/>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={deleteLoading || !isDeleteConfirmValid}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteLoading ? "Deleting…" : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className={cn("space-y-4", compact && "space-y-3")}>
				{showStats ? (
					compact ? (
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{compactStats.map((stat) => {
								const Icon = stat.icon;
								return (
									<div
										key={stat.title}
										className="flex items-center justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-2"
									>
										<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
											<Icon
												className={cn("size-3.5", stat.iconClassName)}
												aria-hidden="true"
											/>
											<span>{stat.title}</span>
										</div>
										<span className="text-base font-semibold leading-none text-foreground">
											{stat.value}
										</span>
									</div>
								);
							})}
						</div>
					) : (
						<StatRail columns={3}>
							<KpiCard
								title="Total"
								value={stats.total}
								icon={MessageSquare}
								variant="default"
							/>
							<KpiCard
								title="Open"
								value={stats.open}
								icon={AlertCircle}
								variant="warning"
							/>
							<KpiCard
								title="Resolved"
								value={stats.resolved}
								icon={CheckCircle2}
								variant="success"
							/>
						</StatRail>
					)
				) : null}

				<Card>
					<CardHeader className="pb-3">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="space-y-1">
								<CardTitle className={cn(compact ? "text-lg" : "text-xl")}>
									{title}
								</CardTitle>
								<CardDescription>{description}</CardDescription>
							</div>
							<div className="flex items-center gap-2">
								{fullViewHref ? (
									<Button variant="outline" size="sm" asChild>
										<Link href={fullViewHref}>
											<ExternalLink
												data-icon="inline-start"
												aria-hidden="true"
											/>
											{fullViewLabel}
										</Link>
									</Button>
								) : null}
								<Button
									variant="outline"
									size="sm"
									onClick={loadFeedback}
									disabled={loading}
								>
									<RefreshCw
										data-icon="inline-start"
										aria-hidden="true"
										className={cn(loading && "animate-spin")}
									/>
									Refresh
								</Button>
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-4">
						<FilterBar
							search={{
								value: searchQuery,
								onChange: setSearchQuery,
								placeholder: "Search feedback content or user name...",
							}}
							filters={[
								{
									key: "days",
									value: daysFilter,
									onChange: (value) => setDaysFilter(value as DaysFilter),
									options: [
										{ value: "7", label: "Last 7 days" },
										{ value: "30", label: "Last 30 days" },
										{ value: "all", label: "All time" },
									],
									width: "w-[140px]",
								},
								{
									key: "status",
									placeholder: "Status",
									value: statusFilter,
									onChange: (value) => setStatusFilter(value as StatusFilter),
									options: [
										{ value: "all", label: "All status" },
										{ value: "open", label: "Open" },
										{ value: "resolved", label: "Resolved" },
									],
									width: "w-[130px]",
								},
								{
									key: "type",
									placeholder: "Type",
									value: typeFilter,
									onChange: (value) =>
										setTypeFilter(value as FeedbackType | "all"),
									options: [
										{ value: "all", label: "All types" },
										{ value: "bug", label: "Bug" },
										{
											value: "incorrect_response",
											label: "Incorrect Response",
										},
										{ value: "feature_request", label: "Feature Request" },
										{ value: "general", label: "General" },
									],
									width: "w-[160px]",
								},
							]}
							activeFilterCount={
								[
									daysFilter !== "all",
									statusFilter !== "all",
									typeFilter !== "all",
									searchQuery.trim() !== "",
								].filter(Boolean).length
							}
							onClear={clearFilters}
						/>

						{loading ? (
							<div className="flex flex-col gap-3">
								{["s1", "s2", "s3", "s4", "s5"].map((key) => (
									<Skeleton key={key} className="h-16 w-full" />
								))}
							</div>
						) : feedbackLoadError ? (
							<div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
								<span className="text-destructive">{feedbackLoadError}</span>
								<Button variant="outline" size="sm" onClick={loadFeedback}>
									Retry
								</Button>
							</div>
						) : filteredFeedback.length === 0 ? (
							hasActiveFilters ? (
								<EmptyState
									icon={Search}
									title="No matches"
									description="Try a different search term or clear your filters."
									action={
										<Button variant="outline" size="sm" onClick={clearFilters}>
											Clear filters
										</Button>
									}
								/>
							) : (
								<EmptyState
									icon={MessageSquare}
									title="No feedback yet"
									description="Feedback submitted by users will appear here."
									action={
										<Button variant="outline" size="sm" onClick={loadFeedback}>
											Refresh
										</Button>
									}
								/>
							)
						) : (
							<Table>
								<caption className="sr-only">
									User feedback - {filteredFeedback.length} items
									{statusFilter !== "all" &&
										`, filtered by ${statusFilter} status`}
								</caption>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[120px]">Date</TableHead>
										<TableHead className="w-[140px]">Type</TableHead>
										<TableHead>Content</TableHead>
										<TableHead className="w-[100px]">Status</TableHead>
										<TableHead className="w-[140px] text-right">
											Action
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredFeedback.map((item) => {
										const isResolved = !!item.resolvedAt;
										const isExpanded = expandedId === item.id;
										const typeInfo = item.feedbackType
											? FEEDBACK_TYPE_CONFIG[item.feedbackType]
											: null;
										const attachments = attachmentsById[item.id] ?? [];
										const attachmentsLoadingState = attachmentsLoading[item.id];
										const attachmentsErrorState = attachmentsError[item.id];
										const canExpand =
											item.attachmentCount > 0 || item.content.length > 100;

										return (
											<React.Fragment key={item.id}>
												<TableRow
													className={cn(isExpanded && "border-b-0")}
													data-state={isExpanded ? "expanded" : undefined}
												>
													<TableCell className="text-sm text-muted-foreground">
														{formatDate(item.createdAt)}
													</TableCell>
													<TableCell>
														{typeInfo ? (
															<Badge variant={typeInfo.variant}>
																{typeInfo.label}
															</Badge>
														) : (
															<span className="text-sm text-muted-foreground">
																—
															</span>
														)}
													</TableCell>
													<TableCell>
														<div className="flex items-start gap-2">
															<div className="min-w-0 flex-1">
																<p className="text-sm">
																	{isExpanded
																		? item.content
																		: truncate(item.content, 80)}
																</p>
																<p className="mt-0.5 text-xs text-muted-foreground">
																	{item.pagePath ? (
																		<>
																			<span>{item.pagePath}</span>{" "}
																			<span aria-hidden="true">·</span>{" "}
																		</>
																	) : null}
																	<span>
																		{item.user.firstName} {item.user.lastName}
																	</span>
																	{item.attachmentCount > 0 ? (
																		<>
																			<span aria-hidden="true"> &middot; </span>
																			<Paperclip className="inline h-3 w-3" />
																			<span> {item.attachmentCount}</span>
																		</>
																	) : null}
																</p>
															</div>
															{canExpand ? (
																<Button
																	variant="ghost"
																	size="icon"
																	className="size-6 shrink-0"
																	onClick={() => handleToggleExpand(item.id)}
																	aria-label={
																		isExpanded
																			? "Collapse details"
																			: "Expand details"
																	}
																	aria-expanded={isExpanded}
																>
																	{isExpanded ? (
																		<ChevronUp className="size-4" />
																	) : (
																		<ChevronDown className="size-4" />
																	)}
																</Button>
															) : null}
														</div>
													</TableCell>
													<TableCell>
														<Badge variant={isResolved ? "success" : "warning"}>
															{isResolved ? "Resolved" : "Open"}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex items-center justify-end gap-2">
															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		variant="ghost"
																		size="icon"
																		className={cn(
																			"size-8",
																			!isResolved &&
																				"text-success hover:bg-success/10 hover:text-success/80",
																		)}
																		onClick={() =>
																			handleToggleResolved(item.id, !isResolved)
																		}
																		disabled={pendingActionIds.has(item.id)}
																		aria-label={
																			isResolved
																				? "Reopen feedback"
																				: "Mark as resolved"
																		}
																	>
																		{isResolved ? (
																			<RotateCcw className="size-4" />
																		) : (
																			<Check className="size-4" />
																		)}
																	</Button>
																</TooltipTrigger>
																<TooltipContent>
																	{isResolved ? "Reopen" : "Mark as resolved"}
																</TooltipContent>
															</Tooltip>

															{allowDelete && isResolved ? (
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
																			onClick={() => setDeleteTarget(item)}
																			aria-label="Delete feedback"
																		>
																			<Trash2 className="size-4" />
																		</Button>
																	</TooltipTrigger>
																	<TooltipContent>
																		Delete feedback
																	</TooltipContent>
																</Tooltip>
															) : null}
														</div>
													</TableCell>
												</TableRow>

												{isExpanded ? (
													<TableRow className="bg-muted/30">
														<TableCell colSpan={5} className="py-4">
															<div className="flex flex-col gap-3">
																<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
																	<Paperclip className="size-4" />
																	Attachments
																</div>
																{attachmentsLoadingState ? (
																	<div className="flex flex-col gap-2">
																		<Skeleton className="h-16 w-full" />
																		<Skeleton className="h-16 w-full" />
																	</div>
																) : attachmentsErrorState ? (
																	<div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
																		<span className="text-destructive">
																			{attachmentsErrorState}
																		</span>
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() =>
																				loadAttachments(item.id, true)
																			}
																		>
																			Retry
																		</Button>
																	</div>
																) : attachments.length === 0 ? (
																	<p className="text-sm text-muted-foreground">
																		No attachments.
																	</p>
																) : (
																	<div className="flex flex-col gap-2">
																		{attachments.map((attachment) => (
																			<div
																				key={attachment.id}
																				className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
																			>
																				{attachment.isPreviewable &&
																				attachment.previewUrl ? (
																					<Image
																						unoptimized
																						src={attachment.previewUrl}
																						alt={attachment.originalFilename}
																						width={48}
																						height={48}
																						className="h-12 w-12 rounded-md object-cover"
																						referrerPolicy="no-referrer"
																					/>
																				) : (
																					<div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted">
																						<FileText className="size-5 text-muted-foreground" />
																					</div>
																				)}
																				<div className="min-w-0 flex-1">
																					<p className="truncate text-sm font-medium">
																						{attachment.originalFilename}
																					</p>
																					<p className="text-xs text-muted-foreground">
																						{formatFileSize(
																							attachment.sizeBytes,
																						)}
																					</p>
																				</div>
																				<Button
																					variant="outline"
																					size="sm"
																					asChild
																				>
																					<a
																						href={attachment.downloadUrl}
																						target="_blank"
																						rel="noreferrer noopener"
																					>
																						<Download
																							data-icon="inline-start"
																							aria-hidden="true"
																						/>
																						Download
																					</a>
																				</Button>
																			</div>
																		))}
																	</div>
																)}
															</div>
														</TableCell>
													</TableRow>
												) : null}
											</React.Fragment>
										);
									})}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>
		</TooltipProvider>
	);
}
