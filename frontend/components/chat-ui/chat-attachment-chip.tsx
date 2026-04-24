"use client";

import { DownloadIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	Attachment,
	AttachmentInfo,
	AttachmentPreview,
	Attachments,
} from "@/components/ai-elements/attachments";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	downloadChatAttachment,
	getChatAttachmentIdFromDownloadUrl,
} from "@/lib/api/chat";

type ChatAttachmentChipProps = {
	filename: string | undefined;
	mediaType: string;
	url: string;
};

type AttachmentAction = "open" | "download";

function triggerDownload(url: string, filename?: string): void {
	const link = document.createElement("a");
	link.href = url;
	if (filename) {
		link.download = filename;
	}
	link.rel = "noreferrer";
	document.body.append(link);
	link.click();
	link.remove();
}

function openObjectUrl(url: string): void {
	const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
	if (!openedWindow) {
		triggerDownload(url);
	}
}

export function ChatAttachmentChip({
	filename,
	mediaType,
	url,
}: ChatAttachmentChipProps) {
	const [activeAction, setActiveAction] = useState<AttachmentAction | null>(
		null,
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const attachmentId = useMemo(
		() => getChatAttachmentIdFromDownloadUrl(url),
		[url],
	);
	const isPersistedAttachment = attachmentId !== null;

	const handleAction = useCallback(
		async (action: AttachmentAction) => {
			setActiveAction(action);
			setErrorMessage(null);
			const pendingWindow =
				action === "open" && isPersistedAttachment
					? window.open("", "_blank")
					: null;

			try {
				if (!isPersistedAttachment || !attachmentId) {
					if (action === "open") {
						openObjectUrl(url);
						return;
					}

					triggerDownload(url, filename);
					return;
				}

				const blob = await downloadChatAttachment(attachmentId);
				const objectUrl = URL.createObjectURL(blob);

				if (action === "open") {
					if (pendingWindow) {
						pendingWindow.location.href = objectUrl;
						pendingWindow.opener = null;
					} else {
						openObjectUrl(objectUrl);
					}
					setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
					return;
				}

				triggerDownload(objectUrl, filename);
				setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
			} catch {
				if (pendingWindow && !pendingWindow.closed) {
					pendingWindow.close();
				}
				setErrorMessage("No pudimos abrir este archivo. Inténtalo de nuevo.");
			} finally {
				setActiveAction(null);
			}
		},
		[attachmentId, filename, isPersistedAttachment, url],
	);

	const isBusy = activeAction !== null;

	return (
		<div className="mb-2 max-w-full">
			<Attachments variant="list">
				<Attachment
					data={{
						id: attachmentId ?? url,
						type: "file",
						filename,
						mediaType,
						url,
					}}
				>
					<AttachmentPreview allowMediaPreview={!isPersistedAttachment} />
					<AttachmentInfo showMediaType />
					<div className="flex shrink-0 items-center gap-0.5">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8"
									onClick={() => {
										void handleAction("open");
									}}
									disabled={isBusy}
									aria-label="Abrir adjunto"
								>
									{activeAction === "open" ? (
										<Loader2Icon className="animate-spin" />
									) : (
										<ExternalLinkIcon />
									)}
									<span className="sr-only">Open</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Abrir en una nueva pestaña</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8"
									onClick={() => {
										void handleAction("download");
									}}
									disabled={isBusy}
									aria-label="Descargar adjunto"
								>
									{activeAction === "download" ? (
										<Loader2Icon className="animate-spin" />
									) : (
										<DownloadIcon />
									)}
									<span className="sr-only">Download</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Descargar archivo</TooltipContent>
						</Tooltip>
					</div>
				</Attachment>
			</Attachments>
			{errorMessage ? (
				<p className="mt-1 text-destructive text-xs" role="alert">
					{errorMessage}
				</p>
			) : null}
		</div>
	);
}
