"use client";

import {
	AlertCircle,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Download,
	FileText,
	MessageSquare,
	Paperclip,
	RefreshCw,
	RotateCcw,
	Search,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { KpiCard } from "@/components/patterns";
import {
	FadeIn,
	HoverLift,
	Pressable,
	StaggerContainer,
	StaggerItem,
} from "@/components/patterns/animations/motion-components";
import { PageHeader, EmptyState } from "@/components/patterns";
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
	CardHeader,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
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
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { cn } from "@/lib/utils";

type DaysFilter = "7" | "30" | "all";
type StatusFilter = "all" | "open" | "resolved";

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

export default function AdminFeedbackPage() {
	const { selectedOrgId } = useOrganizationStore();
	const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
	const [loading, setLoading] = useState(true);
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

	// Filters
	const [daysFilter, setDaysFilter] = useState<DaysFilter>("all");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");

	const requestIdRef = useRef(0);

	const loadFeedback = useCallback(async () => {
		const requestId = ++requestIdRef.current;

		if (!selectedOrgId) {
			setFeedback([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const params: ListFeedbackParams = {
				limit: 100,
				...(daysFilter !== "all" && { days: Number(daysFilter) as 7 | 30 }),
				...(statusFilter !== "all" && {
					resolved: statusFilter === "resolved",
				}),
				...(typeFilter !== "all" && { feedbackType: typeFilter }),
			};
			const data = await feedbackAPI.list(params);
			if (requestId !== requestIdRef.current) return;
			setFeedback(data);
		} catch (_error) {
			if (requestId !== requestIdRef.current) return;
			toast.error("Failed to load feedback");
		} finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
			}
		}
	}, [selectedOrgId, daysFilter, statusFilter, typeFilter]);

	useEffect(() => {
		loadFeedback();
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
			await feedbackAPI.delete(deleteTarget.id);
			setFeedback((prev) => prev.filter((item) => item.id !== deleteTarget.id));
			setAttachmentsById((prev) => omitRecordKey(prev, deleteTarget.id));
			setAttachmentsLoading((prev) => omitRecordKey(prev, deleteTarget.id));
			setAttachmentsError((prev) => omitRecordKey(prev, deleteTarget.id));
			setExpandedId((prev) => (prev === deleteTarget.id ? null : prev));
			toast.success("Feedback deleted");
			setDeleteTarget(null);
			setDeleteConfirmText("");
		} catch (_error) {
			toast.error("Failed to delete feedback");
		} finally {
			setDeleteLoading(false);
		}
	}, [deleteConfirmText, deleteTarget]);

	const loadAttachments = useCallback(
		async (feedbackId: string, force = false) => {
			if (!force && attachmentsById[feedbackId]) return;
			if (attachmentsLoading[feedbackId]) return;

			setAttachmentsLoading((prev) => ({ ...prev, [feedbackId]: true }));
			setAttachmentsError((prev) => ({ ...prev, [feedbackId]: null }));
			try {
				const data = await feedbackAPI.listAttachments(feedbackId);
				setAttachmentsById((prev) => ({ ...prev, [feedbackId]: data }));
			} catch (_error) {
				setAttachmentsError((prev) => ({
					...prev,
					[feedbackId]: "Failed to load attachments",
				}));
			} finally {
				setAttachmentsLoading((prev) => ({ ...prev, [feedbackId]: false }));
			}
		},
		[attachmentsById, attachmentsLoading],
	);

	const handleToggleExpand = useCallback(
		(feedbackId: string) => {
			setExpandedId((prev) => {
				const next = prev === feedbackId ? null : feedbackId;
				if (next) {
					const item = feedback.find((f) => f.id === feedbackId);
					if (item && item.attachmentCount > 0) {
						void loadAttachments(feedbackId);
					}
				}
				return next;
			});
		},
		[feedback, loadAttachments],
	);

	/** Consolidated handler for resolve/reopen actions */
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
					? await feedbackAPI.resolve(id)
					: await feedbackAPI.reopen(id);
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
		[statusFilter],
	);

	/** Filter feedback by search query (content + user name) */
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
		const open = feedback.filter((f) => !f.resolvedAt).length;
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

	if (!selectedOrgId) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center space-y-2">
					<p className="text-muted-foreground">
						Select an organization to view feedback
					</p>
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={200}>
			<div className="space-y-6">
				<AlertDialog
					open={!!deleteTarget}
					onOpenChange={handleDeleteOpenChange}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete feedback?</AlertDialogTitle>
							<AlertDialogDescription className="mt-3 space-y-2">
								<span className="block text-destructive font-medium">
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

						<div className="space-y-2">
							<Label htmlFor="feedback-delete-confirm">
								Type <span className="font-mono font-semibold">DELETE</span> to
								confirm:
							</Label>
							<Input
								id="feedback-delete-confirm"
								value={deleteConfirmText}
								onChange={(e) => setDeleteConfirmText(e.target.value)}
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
				<PageHeader
					title="User Feedback"
					subtitle="Review and manage user feedback"
					actions={
						<Pressable>
							<Button
								variant="outline"
								size="sm"
								onClick={loadFeedback}
								disabled={loading}
							>
								<RefreshCw
									className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
								/>
								Refresh
							</Button>
						</Pressable>
					}
				/>

				<StaggerContainer
					staggerDelay={0.08}
					className="grid grid-cols-1 sm:grid-cols-3 gap-4"
				>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								title="Total"
								value={stats.total}
								icon={MessageSquare}
								variant="default"
							/>
						</HoverLift>
					</StaggerItem>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								title="Open"
								value={stats.open}
								icon={AlertCircle}
								variant="warning"
							/>
						</HoverLift>
					</StaggerItem>
					<StaggerItem>
						<HoverLift>
							<KpiCard
								title="Resolved"
								value={stats.resolved}
								icon={CheckCircle2}
								variant="success"
							/>
						</HoverLift>
					</StaggerItem>
				</StaggerContainer>

				{/* Search */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search feedback content or user name..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
						aria-label="Search feedback"
					/>
				</div>

				<Card>
					<CardHeader className="pb-4">
						<div className="flex flex-wrap items-center gap-3">
							<Select
								value={daysFilter}
								onValueChange={(v) => setDaysFilter(v as DaysFilter)}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Time range" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="7">Last 7 days</SelectItem>
									<SelectItem value="30">Last 30 days</SelectItem>
									<SelectItem value="all">All time</SelectItem>
								</SelectContent>
							</Select>

							<Select
								value={statusFilter}
								onValueChange={(v) => setStatusFilter(v as StatusFilter)}
							>
								<SelectTrigger className="w-[130px]">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All status</SelectItem>
									<SelectItem value="open">Open</SelectItem>
									<SelectItem value="resolved">Resolved</SelectItem>
								</SelectContent>
							</Select>

							<Select
								value={typeFilter}
								onValueChange={(v) => setTypeFilter(v as FeedbackType | "all")}
							>
								<SelectTrigger className="w-[160px]">
									<SelectValue placeholder="Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All types</SelectItem>
									<SelectItem value="bug">Bug</SelectItem>
									<SelectItem value="incorrect_response">
										Incorrect Response
									</SelectItem>
									<SelectItem value="feature_request">
										Feature Request
									</SelectItem>
									<SelectItem value="general">General</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
							<span>
								Showing {filteredFeedback.length} of {feedback.length}
							</span>
							{hasActiveFilters && (
								<Button variant="ghost" size="sm" onClick={clearFilters}>
									Clear filters
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="space-y-3">
								{["s1", "s2", "s3", "s4", "s5"].map((key) => (
									<Skeleton key={key} className="h-16 w-full" />
								))}
							</div>
						) : filteredFeedback.length === 0 ? (
							hasActiveFilters ? (
								<EmptyState
									icon={Search}
									title="No matches"
									description="Try a different search term or clear your filters."
									action={{
										label: "Clear filters",
										onClick: clearFilters,
										variant: "outline",
									}}
								/>
							) : (
								<EmptyState
									icon={MessageSquare}
									title="No feedback yet"
									description="Feedback submitted by users will appear here."
									action={{
										label: "Refresh",
										onClick: loadFeedback,
										variant: "outline",
									}}
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
															<span className="text-muted-foreground text-sm">
																—
															</span>
														)}
													</TableCell>
													<TableCell>
														<div className="flex items-start gap-2">
															<div className="flex-1 min-w-0">
																<p className="text-sm">
																	{isExpanded
																		? item.content
																		: truncate(item.content, 80)}
																</p>
																<p className="text-xs text-muted-foreground mt-0.5">
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
																			{" "}
																			<span aria-hidden="true">&middot;</span>{" "}
																			<Paperclip className="inline h-3 w-3" />
																			<span> {item.attachmentCount}</span>
																		</>
																	) : null}
																</p>
															</div>
															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6 shrink-0"
																onClick={() => handleToggleExpand(item.id)}
																aria-label={
																	isExpanded
																		? "Collapse details"
																		: "Expand details"
																}
																aria-expanded={isExpanded}
															>
																{isExpanded ? (
																	<ChevronUp className="h-4 w-4" />
																) : (
																	<ChevronDown className="h-4 w-4" />
																)}
															</Button>
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
																			"h-8 w-8",
																			!isResolved &&
																				"text-success hover:text-success/80 hover:bg-success/10",
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
																			<RotateCcw className="h-4 w-4" />
																		) : (
																			<Check className="h-4 w-4" />
																		)}
																	</Button>
																</TooltipTrigger>
																<TooltipContent>
																	{isResolved ? "Reopen" : "Mark as resolved"}
																</TooltipContent>
															</Tooltip>
															{isResolved ? (
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
																			onClick={() => setDeleteTarget(item)}
																			aria-label="Delete feedback"
																		>
																			<Trash2 className="h-4 w-4" />
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
															<div className="space-y-3">
																<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
																	<Paperclip className="h-4 w-4" />
																	Attachments
																</div>
																{attachmentsLoadingState ? (
																	<div className="space-y-2">
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
																	<div className="space-y-2">
																		{attachments.map((attachment) => (
																			<div
																				key={attachment.id}
																				className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
																			>
																				{attachment.isPreviewable &&
																				attachment.previewUrl ? (
																					<Image
																						// URL is presigned + short-lived; skip Next optimization to avoid cache/expiry issues.
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
																						<FileText className="h-5 w-5 text-muted-foreground" />
																					</div>
																				)}
																				<div className="min-w-0 flex-1">
																					<p className="text-sm font-medium truncate">
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
																						<Download className="h-4 w-4 mr-2" />
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
