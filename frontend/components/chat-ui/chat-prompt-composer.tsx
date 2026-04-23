import type { ChatStatus } from "ai";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Attachment,
	AttachmentInfo,
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
	errorMessage?: string | null;
	hintMessage?: string | null;
	onInteract?: () => void;
	onSubmitMessage: (message: PromptInputMessage) => Promise<void>;
	placeholder: string;
	status: ChatStatus;
	textareaClassName: string;
};

type ChatPromptComposerInnerProps = {
	className: string;
	attachmentError: string | null;
	errorMessage?: string | null;
	hintMessage?: string | null;
	markUserInteraction: () => void;
	onSubmitMessage: (message: PromptInputMessage) => Promise<void>;
	placeholder: string;
	setAttachmentError: React.Dispatch<React.SetStateAction<string | null>>;
	status: ChatStatus;
	textareaClassName: string;
	textareaRef: (el: HTMLTextAreaElement | null) => void;
	draftSetText: (text: string) => void;
	draftClear: () => void;
	didUserInteractRef: React.RefObject<boolean>;
	onInteract?: () => void;
};

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

export function shouldClearSubmitErrorOnComposerChange(options: {
	errorMessage?: string | null;
	hadUserInteraction: boolean;
}): boolean {
	if (!options.errorMessage) {
		return true;
	}

	return options.hadUserInteraction;
}

function PromptInputAttachmentsHeader(): React.JSX.Element | null {
	const attachments = usePromptInputAttachments();

	if (attachments.files.length === 0) {
		return null;
	}

	const attachmentCount = attachments.files.length;
	const attachmentLabel =
		attachmentCount === 1
			? "1 attachment ready"
			: `${attachmentCount} attachments ready`;

	return (
		<PromptInputHeader className="space-y-2">
			<p className="px-1 text-muted-foreground text-xs" role="status">
				{attachmentLabel}
			</p>
			<Attachments className="w-full" variant="list">
				{attachments.files.map((attachment) => (
					<Attachment
						data={attachment}
						key={attachment.id}
						onRemove={() => attachments.remove(attachment.id)}
					>
						<AttachmentPreview />
						<AttachmentInfo showMediaType />
						<AttachmentRemove />
					</Attachment>
				))}
			</Attachments>
		</PromptInputHeader>
	);
}

function PdfInstructionHint(): React.JSX.Element | null {
	const attachments = usePromptInputAttachments();
	const { textInput } = usePromptInputController();

	const hasPdfAttachment = attachments.files.some(
		(file) => file.mediaType === "application/pdf",
	);

	if (!hasPdfAttachment || textInput.value.trim().length > 0) {
		return null;
	}

	return (
		<div className="px-3 pb-1 text-muted-foreground text-xs" role="status">
			Add a short instruction.
		</div>
	);
}

function PromptSubmitButton({
	status,
}: {
	status: ChatStatus;
}): React.JSX.Element {
	const attachments = usePromptInputAttachments();
	const { textInput } = usePromptInputController();

	const hasPdfAttachment = attachments.files.some(
		(file) => file.mediaType === "application/pdf",
	);

	const requiresInstruction =
		hasPdfAttachment && textInput.value.trim().length === 0;

	return <PromptInputSubmit disabled={requiresInstruction} status={status} />;
}

function ChatPromptComposerInner({
	className,
	attachmentError,
	errorMessage,
	hintMessage,
	markUserInteraction,
	onSubmitMessage,
	placeholder,
	setAttachmentError,
	status,
	textareaClassName,
	textareaRef,
	draftSetText,
	draftClear,
	didUserInteractRef,
	onInteract,
}: ChatPromptComposerInnerProps): React.JSX.Element {
	const { textInput } = usePromptInputController();
	const attachments = usePromptInputAttachments();
	const prevTextValueRef = useRef(textInput.value);

	// Clear text and attachments immediately on submit, before async work,
	// so the user gets responsive feedback that their message was accepted.
	//
	// CRITICAL: also call draftClear() to flush localStorage synchronously.
	// Without it, AnimatePresence remount on isEmptyState→conversation
	// transition reads stale localStorage (the debounced "" write hasn't
	// fired yet) and the remounted composer rehydrates the sent text.
	const handleSubmitInner = useCallback(
		(message: PromptInputMessage): void => {
			textInput.clear();
			attachments.clear();
			draftClear();
			void onSubmitMessage(message);
		},
		[textInput, attachments, draftClear, onSubmitMessage],
	);

	// Sync draft text to localStorage when value changes.
	useEffect(() => {
		if (textInput.value !== prevTextValueRef.current) {
			prevTextValueRef.current = textInput.value;
			draftSetText(textInput.value);
		}
	}, [textInput.value, draftSetText]);

	// Clear attachment error and resolve submit error when inputs change.
	useEffect(() => {
		if (
			attachments.files.length === 0 &&
			prevTextValueRef.current === textInput.value
		) {
			return;
		}

		setAttachmentError((previous) => (previous ? null : previous));

		const shouldClear = shouldClearSubmitErrorOnComposerChange({
			errorMessage,
			hadUserInteraction: didUserInteractRef.current,
		});

		didUserInteractRef.current = false;

		if (shouldClear) {
			onInteract?.();
		}
	}, [attachments.files.length, textInput.value, errorMessage, onInteract]);

	return (
		<PromptInput
			accept={SUPPORTED_ATTACHMENT_MIME_PATTERNS.join(",")}
			className={className}
			maxFileSize={MAX_ATTACHMENT_BYTES}
			maxFiles={MAX_ATTACHMENTS_PER_REQUEST}
			multiple
			onPointerDownCapture={markUserInteraction}
			onError={({ code }) => {
				setAttachmentError(getAttachmentValidationMessage(code));
			}}
			onSubmit={handleSubmitInner}
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

			{!attachmentError && !errorMessage && hintMessage ? (
				<div className="px-3 pb-1 text-muted-foreground text-xs" role="status">
					{hintMessage}
				</div>
			) : null}

			<PdfInstructionHint />

			<PromptInputBody>
				<PromptInputTextarea
					ref={textareaRef}
					className={textareaClassName}
					onChange={markUserInteraction}
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
	);
}

export function ChatPromptComposer({
	className,
	errorMessage,
	hintMessage,
	onInteract,
	onSubmitMessage,
	placeholder,
	status,
	textareaClassName,
}: ChatPromptComposerProps): React.JSX.Element {
	const draft = useDraftInput();
	const [attachmentError, setAttachmentError] = useState<string | null>(null);
	const didUserInteractRef = useRef(false);
	const selectedModelId = draft.modelId;

	const markUserInteraction = useCallback(() => {
		didUserInteractRef.current = true;
	}, []);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage): Promise<void> => {
			setAttachmentError(null);
			await onSubmitMessage({
				...message,
				modelId: selectedModelId,
				webSearchEnabled: false,
			});
		},
		[onSubmitMessage, selectedModelId],
	);

	const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
		if (!el) return;
		// Defer so React's controlled value reconciliation finishes first.
		requestAnimationFrame(() => {
			el.focus();
			el.selectionStart = el.value.length;
			el.selectionEnd = el.value.length;
		});
	}, []);

	return (
		<PromptInputProvider initialInput={draft.initialText}>
			<ChatPromptComposerInner
				className={className}
				attachmentError={attachmentError}
				errorMessage={errorMessage}
				hintMessage={hintMessage}
				markUserInteraction={markUserInteraction}
				onSubmitMessage={handleSubmit}
				placeholder={placeholder}
				setAttachmentError={setAttachmentError}
				status={status}
				textareaClassName={textareaClassName}
				textareaRef={textareaRef}
				draftSetText={draft.setText}
				draftClear={draft.clear}
				didUserInteractRef={didUserInteractRef}
				onInteract={onInteract}
			/>
		</PromptInputProvider>
	);
}
