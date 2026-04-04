"use client";

import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/patterns/feedback/loading-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	FEEDBACK_TYPE_CONFIG,
	type FeedbackPayload,
	type FeedbackType,
	feedbackAPI,
} from "@/lib/api/feedback";
import { cn } from "@/lib/utils";

const FEEDBACK_TYPE_OPTIONS = Object.entries(FEEDBACK_TYPE_CONFIG).map(
	([value, info]) => ({
		value: value as FeedbackType,
		label: info.label,
	}),
);

/** Character count thresholds for visual feedback */
function getCharCountClass(length: number, max: number): string {
	const percent = (length / max) * 100;
	if (percent >= 95) return "text-destructive font-medium";
	if (percent >= 80) return "text-warning";
	return "text-muted-foreground";
}

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	return `${(kb / 1024).toFixed(1)} MB`;
}

interface FeedbackDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
	const [content, setContent] = useState("");
	const [feedbackType, setFeedbackType] = useState<FeedbackType | undefined>();
	const [loading, setLoading] = useState(false);
	const [contentError, setContentError] = useState<string | null>(null);
	const [attachments, setAttachments] = useState<File[]>([]);
	const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(
		null,
	);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const feedbackTypeValue = feedbackType ?? "none";
	const contentErrorId = "feedback-content-error";
	const contentHelpId = "feedback-content-help";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (pendingFeedbackId) {
			if (attachments.length === 0) {
				toast.error("No attachments to retry.");
				return;
			}
			setLoading(true);
			try {
				await feedbackAPI.uploadAttachments(pendingFeedbackId, attachments);
				toast.success("Attachments uploaded.");
				resetForm();
				onOpenChange(false);
			} catch (_error) {
				toast.error("Failed to upload attachments");
			} finally {
				setLoading(false);
			}
			return;
		}

		const trimmedContent = content.trim();
		if (!trimmedContent) {
			setContentError("Feedback is required.");
			return;
		}

		setLoading(true);
		try {
			const payload: FeedbackPayload = {
				content: trimmedContent,
				pagePath: window.location.pathname,
				...(feedbackType && { feedbackType }),
			};
			const response = await feedbackAPI.submit(payload);
			if (attachments.length > 0) {
				try {
					await feedbackAPI.uploadAttachments(response.id, attachments);
					toast.success("Thanks for your feedback!");
					resetForm();
					onOpenChange(false);
				} catch (_error) {
					setPendingFeedbackId(response.id);
					toast.error("Feedback sent; attachments failed.");
				}
			} else {
				toast.success("Thanks for your feedback!");
				resetForm();
				onOpenChange(false);
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send feedback",
			);
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setContent("");
		setFeedbackType(undefined);
		setContentError(null);
		setAttachments([]);
		setPendingFeedbackId(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) resetForm();
		onOpenChange(open);
	};

	const handleAttachmentClick = () => {
		fileInputRef.current?.click();
	};

	const handleAttachmentChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const selected = Array.from(event.target.files ?? []);
		if (selected.length === 0) return;

		const next = [...attachments];
		for (const file of selected) {
			if (file.size > MAX_ATTACHMENT_SIZE) {
				toast.error(
					`${file.name} is too large (max ${formatFileSize(MAX_ATTACHMENT_SIZE)}).`,
				);
				continue;
			}
			if (next.length >= MAX_ATTACHMENTS) {
				toast.error(`Max ${MAX_ATTACHMENTS} attachments.`);
				break;
			}
			next.push(file);
		}
		setAttachments(next);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleRemoveAttachment = (index: number) => {
		setAttachments((prev) => prev.filter((_, i) => i !== index));
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Send Feedback</DialogTitle>
						<DialogDescription>
							Help us improve by sharing your thoughts.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="feedback-type">Type (optional)</Label>
							<Select
								value={feedbackTypeValue}
								onValueChange={(value) =>
									setFeedbackType(
										value === "none" ? undefined : (value as FeedbackType),
									)
								}
								disabled={loading || !!pendingFeedbackId}
							>
								<SelectTrigger id="feedback-type">
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No type</SelectItem>
									{FEEDBACK_TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="feedback-content">
								Your feedback <span className="text-destructive">*</span>
							</Label>
							<Textarea
								id="feedback-content"
								value={content}
								onChange={(e) => {
									setContent(e.target.value);
									if (contentError) setContentError(null);
								}}
								placeholder="Describe your feedback..."
								rows={4}
								maxLength={4000}
								className="resize-none"
								required
								aria-required="true"
								aria-invalid={!!contentError}
								aria-describedby={cn(
									contentError ? contentErrorId : undefined,
									contentHelpId,
								)}
								disabled={loading || !!pendingFeedbackId}
							/>
							{contentError && (
								<p
									id={contentErrorId}
									className="text-xs text-destructive"
									role="alert"
								>
									{contentError}
								</p>
							)}
							<p
								id={contentHelpId}
								className={cn(
									"text-xs text-right",
									getCharCountClass(content.length, 4000),
								)}
								aria-live="polite"
							>
								{content.length}/4000
							</p>
						</div>

						<div className="space-y-2">
							<Label>Attachments (optional)</Label>
							<div className="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleAttachmentClick}
									disabled={loading || attachments.length >= MAX_ATTACHMENTS}
								>
									<Paperclip className="h-4 w-4 mr-2" />
									Add files
								</Button>
								<p className="text-xs text-muted-foreground">
									Up to {MAX_ATTACHMENTS} files,{" "}
									{formatFileSize(MAX_ATTACHMENT_SIZE)} each
								</p>
							</div>
							<input
								ref={fileInputRef}
								type="file"
								multiple
								className="hidden"
								onChange={handleAttachmentChange}
							/>
							{attachments.length > 0 ? (
								<div className="space-y-2">
									{attachments.map((file, index) => (
										<div
											key={`${file.name}-${file.size}-${index}`}
											className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
										>
											<div className="min-w-0">
												<p className="truncate font-medium">{file.name}</p>
												<p className="text-xs text-muted-foreground">
													{formatFileSize(file.size)}
												</p>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												onClick={() => handleRemoveAttachment(index)}
												disabled={loading}
												aria-label={`Remove ${file.name}`}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							) : null}
							{pendingFeedbackId ? (
								<p className="text-xs text-warning">
									Feedback sent. Retry attachment upload below.
								</p>
							) : null}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<LoadingButton
							type="submit"
							loading={loading}
							disabled={
								loading ||
								(!pendingFeedbackId && !content.trim()) ||
								(!!pendingFeedbackId && attachments.length === 0)
							}
						>
							{pendingFeedbackId ? "Retry Attachments" : "Send Feedback"}
						</LoadingButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
