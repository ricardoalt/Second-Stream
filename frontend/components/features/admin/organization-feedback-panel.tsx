"use client";

import {
	ChevronDown,
	ChevronUp,
	Download,
	FileText,
	Paperclip,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type AdminFeedbackAttachment,
	type AdminFeedbackItem,
	FEEDBACK_TYPE_CONFIG,
	feedbackAPI,
} from "@/lib/api/feedback";
import { cn } from "@/lib/utils";

interface OrganizationFeedbackPanelProps {
	orgId: string;
	orgName: string;
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

export function OrganizationFeedbackPanel({
	orgId,
	orgName,
}: OrganizationFeedbackPanelProps) {
	const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [feedbackLoadError, setFeedbackLoadError] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [attachmentsById, setAttachmentsById] = useState<
		Record<string, AdminFeedbackAttachment[]>
	>({});
	const [attachmentsLoading, setAttachmentsLoading] = useState<
		Record<string, boolean>
	>({});
	const [attachmentsError, setAttachmentsError] = useState<
		Record<string, string | null>
	>({});
	const requestIdRef = useRef(0);

	const loadFeedback = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		setLoading(true);
		setFeedbackLoadError(null);
		try {
			const data = await feedbackAPI.list(
				{ limit: 20 },
				{ organizationId: orgId },
			);
			if (requestId !== requestIdRef.current) return;
			setFeedback(data);
		} catch {
			if (requestId !== requestIdRef.current) return;
			toast.error("Failed to load organization feedback");
			setFeedback([]);
			setFeedbackLoadError(
				"Could not load organization feedback. Please retry.",
			);
		} finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
			}
		}
	}, [orgId]);

	useEffect(() => {
		void loadFeedback();
	}, [loadFeedback]);

	const loadAttachments = useCallback(
		async (feedbackId: string, force = false) => {
			if (!force && attachmentsById[feedbackId]) return;
			if (attachmentsLoading[feedbackId]) return;

			setAttachmentsLoading((prev) => ({ ...prev, [feedbackId]: true }));
			setAttachmentsError((prev) => ({ ...prev, [feedbackId]: null }));

			try {
				const data = await feedbackAPI.listAttachments(feedbackId, {
					organizationId: orgId,
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
		[attachmentsById, attachmentsLoading, orgId],
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

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<div>
						<CardTitle className="text-lg">Organization Feedback</CardTitle>
						<CardDescription>
							Recent feedback submitted by members of {orgName}
						</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={loadFeedback}
						disabled={loading}
					>
						Refresh
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="flex flex-col gap-3">
						{["s1", "s2", "s3"].map((key) => (
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
				) : feedback.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No feedback has been submitted for this organization yet.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[140px]">Date</TableHead>
								<TableHead className="w-[140px]">Type</TableHead>
								<TableHead>Content</TableHead>
								<TableHead className="w-[100px]">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{feedback.map((item) => {
								const isExpanded = expandedId === item.id;
								const canExpand =
									item.attachmentCount > 0 || item.content.length > 120;
								const typeInfo = item.feedbackType
									? FEEDBACK_TYPE_CONFIG[item.feedbackType]
									: null;
								const isResolved = !!item.resolvedAt;
								const attachments = attachmentsById[item.id] ?? [];
								const attachmentsLoadingState = attachmentsLoading[item.id];
								const attachmentsErrorState = attachmentsError[item.id];

								return (
									<React.Fragment key={item.id}>
										<TableRow className={cn(isExpanded && "border-b-0")}>
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
																: truncate(item.content, 120)}
														</p>
														<p className="mt-0.5 text-xs text-muted-foreground">
															{item.user.firstName} {item.user.lastName}
															{item.pagePath ? (
																<>
																	<span aria-hidden="true">·</span>{" "}
																	{item.pagePath}
																</>
															) : null}
															{item.attachmentCount > 0 ? (
																<>
																	<span aria-hidden="true">·</span>{" "}
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
										</TableRow>

										{isExpanded ? (
											<TableRow className="bg-muted/30">
												<TableCell colSpan={4} className="py-4">
													<div className="flex flex-col gap-3">
														<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
															<Paperclip className="size-4" />
															Attachments
														</div>
														{item.attachmentCount === 0 ? (
															<p className="text-sm text-muted-foreground">
																No attachments for this feedback.
															</p>
														) : attachmentsLoadingState ? (
															<Skeleton className="h-16 w-full" />
														) : attachmentsErrorState ? (
															<div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
																<span className="text-destructive">
																	{attachmentsErrorState}
																</span>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => loadAttachments(item.id, true)}
																>
																	Retry
																</Button>
															</div>
														) : attachments.length === 0 ? null : (
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
																				{formatFileSize(attachment.sizeBytes)}
																			</p>
																		</div>
																		<Button variant="outline" size="sm" asChild>
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
	);
}
