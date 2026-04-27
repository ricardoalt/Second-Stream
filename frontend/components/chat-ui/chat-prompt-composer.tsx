import type { ChatStatus } from "ai";
import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
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
import { ChatComposerAttachments } from "@/components/chat-ui/chat-composer-attachments";
import {
	MAX_ATTACHMENT_BYTES,
	MAX_ATTACHMENTS_PER_REQUEST,
	SUPPORTED_ATTACHMENT_MIME_PATTERNS,
} from "@/config/models";
import { useDraftInput } from "@/hooks/use-draft-input";

type ChatPromptComposerProps = {
	busy?: boolean;
	className: string;
	draftScopeKey: string;
	errorMessage?: string | null;
	onInteract?: () => void;
	onStop?: () => void;
	onSubmitMessage: (
		message: PromptInputMessage,
		onAccepted: () => void,
	) => Promise<void>;
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
			<ChatComposerAttachments
				attachments={attachments.files}
				onRemove={attachments.remove}
			/>
		</PromptInputHeader>
	);
}

function PromptSubmitButton({
	busy,
	status,
	onStop,
}: {
	busy: boolean;
	status: ChatStatus;
	onStop?: () => void;
}): React.JSX.Element {
	const { textInput } = usePromptInputController();
	const isStreamingOrSubmitted =
		status === "submitted" || status === "streaming";
	const canStop = isStreamingOrSubmitted && Boolean(onStop);
	return (
		<PromptInputSubmit
			disabled={
				(!canStop && busy) ||
				(textInput.value.trim().length === 0 && !isStreamingOrSubmitted)
			}
			status={status}
			{...(onStop && { onStop })}
		/>
	);
}

export function ChatPromptComposer({
	busy = false,
	className,
	draftScopeKey,
	errorMessage,
	onInteract,
	onStop,
	onSubmitMessage,
	placeholder,
	status,
	textareaClassName,
}: ChatPromptComposerProps): React.JSX.Element {
	const draft = useDraftInput(draftScopeKey);
	const [input, setInput] = useState(() => draft.initialText ?? "");
	const [resetKey, setResetKey] = useState(0);
	const [attachmentError, setAttachmentError] = useState<string | null>(null);

	const handleInputChange = useCallback(
		(value: string) => {
			setInput(value);
			draft.setText(value);
		},
		[draft],
	);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage): Promise<void> => {
			setAttachmentError(null);
			await onSubmitMessage(message, () => {
				setInput("");
				draft.clear();
				setResetKey((key) => key + 1);
			});
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
		<PromptInputProvider
			input={input}
			key={`${draftScopeKey}:${resetKey}`}
			onInputChange={handleInputChange}
		>
			<PromptComposerStateWatcher
				onComposerChange={() => {
					setAttachmentError(null);
					onInteract?.();
				}}
			/>
			<PromptInput
				accept={SUPPORTED_ATTACHMENT_MIME_PATTERNS.join(",")}
				className={className}
				data-busy={busy ? "true" : "false"}
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
						disabled={busy}
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

					<PromptSubmitButton
						busy={busy}
						status={status}
						{...(onStop && { onStop })}
					/>
				</PromptInputFooter>
			</PromptInput>
		</PromptInputProvider>
	);
}
