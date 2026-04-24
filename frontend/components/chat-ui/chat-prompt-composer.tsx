import type { ChatStatus } from "ai";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Attachment,
	AttachmentPreview,
	AttachmentRemove,
	Attachments,
} from "@/components/ai-elements/attachments";
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputFooter,
	PromptInputHeader,
	type PromptInputMessage,
	PromptInputProvider,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputAttachments,
	usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import {
	MAX_ATTACHMENT_BYTES,
	MAX_ATTACHMENTS_PER_REQUEST,
	SUPPORTED_ATTACHMENT_MIME_PATTERNS,
} from "@/config/models";
import { useDraftInput } from "@/hooks/use-draft-input";

type ChatPromptComposerProps = {
	className: string;
	draftScopeKey: string;
	errorMessage?: string | null;
	onInteract?: () => void;
	onSubmitMessage: (message: PromptInputMessage) => Promise<void>;
	placeholder: string;
	status: ChatStatus;
	textareaClassName: string;
};

type PromptInputErrorCode =
	| "max_files"
	| "max_file_size"
	| "accept"
	| "read_failed";

export const getAttachmentValidationMessage = (
	code: PromptInputErrorCode,
): string => {
	switch (code) {
		case "max_file_size":
			return "Each file must be 4MB or smaller.";
		case "max_files":
			return `You can attach up to ${MAX_ATTACHMENTS_PER_REQUEST} files per message.`;
		case "accept":
			return "Unsupported file type. Use image/*, application/pdf, or text/*.";
		case "read_failed":
			return "We couldn't read one or more files. Remove them and try again.";
		default:
			return "We couldn't attach that file.";
	}
};

function PromptComposerStateWatcher({
	onComposerChange,
}: {
	onComposerChange: () => void;
}): React.JSX.Element | null {
	const attachments = usePromptInputAttachments();
	const { textInput } = usePromptInputController();

	// biome-ignore lint/correctness/useExhaustiveDependencies: attachments.files.length and textInput.value are intentional trigger deps — effect fires onComposerChange when either changes
	useEffect(() => {
		onComposerChange();
	}, [attachments.files.length, onComposerChange, textInput.value]);

	return null;
}

function PromptInputAttachmentsHeader(): React.JSX.Element | null {
	const attachments = usePromptInputAttachments();

	if (attachments.files.length === 0) {
		return null;
	}

	return (
		<PromptInputHeader>
			<Attachments className="w-full" variant="list">
				{attachments.files.map((attachment) => (
					<Attachment
						data={attachment}
						key={attachment.id}
						onRemove={() => attachments.remove(attachment.id)}
					>
						<AttachmentPreview />
						<AttachmentRemove />
					</Attachment>
				))}
			</Attachments>
		</PromptInputHeader>
	);
}

function PromptSubmitButton({
	status,
}: {
	status: ChatStatus;
}): React.JSX.Element {
	const { textInput } = usePromptInputController();
	return (
		<PromptInputSubmit
			disabled={textInput.value.trim().length === 0}
			status={status}
		/>
	);
}

function DraftSync({
	onTextChange,
}: {
	onTextChange: (value: string) => void;
}) {
	const { textInput } = usePromptInputController();
	const previousValueRef = useRef(textInput.value);

	useEffect(() => {
		if (textInput.value !== previousValueRef.current) {
			previousValueRef.current = textInput.value;
			onTextChange(textInput.value);
		}
	}, [textInput.value, onTextChange]);

	return null;
}

export function ChatPromptComposer({
	className,
	draftScopeKey,
	errorMessage,
	onInteract,
	onSubmitMessage,
	placeholder,
	status,
	textareaClassName,
}: ChatPromptComposerProps): React.JSX.Element {
	const draft = useDraftInput(draftScopeKey);
	const [attachmentError, setAttachmentError] = useState<string | null>(null);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage): Promise<void> => {
			setAttachmentError(null);
			draft.clear();
			await onSubmitMessage(message);
		},
		[draft, onSubmitMessage],
	);

	const textareaRef = useCallback((element: HTMLTextAreaElement | null) => {
		if (!element) {
			return;
		}

		requestAnimationFrame(() => {
			element.focus();
			element.selectionStart = element.value.length;
			element.selectionEnd = element.value.length;
		});
	}, []);

	return (
		<PromptInputProvider initialInput={draft.initialText}>
			<DraftSync onTextChange={draft.setText} />
			<PromptComposerStateWatcher
				onComposerChange={() => {
					setAttachmentError(null);
					onInteract?.();
				}}
			/>
			<PromptInput
				accept={SUPPORTED_ATTACHMENT_MIME_PATTERNS.join(",")}
				className={className}
				maxFileSize={MAX_ATTACHMENT_BYTES}
				maxFiles={MAX_ATTACHMENTS_PER_REQUEST}
				multiple
				onError={({ code }) => {
					setAttachmentError(getAttachmentValidationMessage(code));
				}}
				onSubmit={(message) => {
					void handleSubmit(message);
				}}
			>
				<PromptInputAttachmentsHeader />

				{attachmentError ? (
					<div className="px-3 pb-1 text-destructive text-xs" role="alert">
						{attachmentError}
					</div>
				) : null}

				{!attachmentError && errorMessage ? (
					<div className="px-3 pb-1 text-destructive text-xs" role="alert">
						{errorMessage}
					</div>
				) : null}

				<PromptInputBody>
					<PromptInputTextarea
						ref={textareaRef}
						className={textareaClassName}
						placeholder={placeholder}
					/>
				</PromptInputBody>

				<PromptInputFooter>
					<PromptInputTools>
						<PromptInputActionMenu>
							<PromptInputActionMenuTrigger />
							<PromptInputActionMenuContent className="min-w-48 w-auto">
								<PromptInputActionAddAttachments />
							</PromptInputActionMenuContent>
						</PromptInputActionMenu>
					</PromptInputTools>

					<PromptSubmitButton status={status} />
				</PromptInputFooter>
			</PromptInput>
		</PromptInputProvider>
	);
}
