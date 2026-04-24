import type { FileUIPart } from "ai";
import type * as React from "react";
import {
	Attachment,
	AttachmentHoverCard,
	AttachmentHoverCardContent,
	AttachmentHoverCardTrigger,
	AttachmentInfo,
	AttachmentPreview,
	AttachmentRemove,
	Attachments,
} from "@/components/ai-elements/attachments";

type ComposerAttachment = FileUIPart & { id: string };

type ChatComposerAttachmentsProps = {
	attachments: ComposerAttachment[];
	onRemove: (id: string) => void;
};

function getComposerAttachmentName(attachment: ComposerAttachment): string {
	return attachment.filename?.trim() || "Attachment";
}

export function ChatComposerAttachments({
	attachments,
	onRemove,
}: ChatComposerAttachmentsProps): React.JSX.Element | null {
	// Composer attachments are intentionally compact (name + remove only).
	// Message attachments use chat-attachment-chip with open/download + metadata.
	if (attachments.length === 0) {
		return null;
	}

	return (
		<Attachments className="max-w-full overflow-hidden px-0.5" variant="inline">
			{attachments.map((attachment) => {
				const filename = getComposerAttachmentName(attachment);

				return (
					<AttachmentHoverCard key={attachment.id}>
						<AttachmentHoverCardTrigger asChild>
							<Attachment
								aria-label={filename}
								className="max-w-[min(11rem,100%)] min-w-0"
								data={attachment}
								title={filename}
								onRemove={() => onRemove(attachment.id)}
							>
								<AttachmentPreview allowMediaPreview={false} />
								<AttachmentInfo className="text-xs" title={filename} />
								<AttachmentRemove className="opacity-100" label={`Remove ${filename}`} />
							</Attachment>
						</AttachmentHoverCardTrigger>
						<AttachmentHoverCardContent className="max-w-80 break-all text-xs">
							{filename}
						</AttachmentHoverCardContent>
					</AttachmentHoverCard>
				);
			})}
		</Attachments>
	);
}
