import { type ComponentProps, createElement } from "react";
import {
	getModalWidthClass,
	type ModalSizeInput,
} from "@/components/patterns/dialogs/modal";
import {
	DialogContent,
	DialogFooter,
	DialogHeader,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const DIALOG_FORM_BODY_CLASS = "grid gap-4 py-4";
export const DIALOG_FORM_FOOTER_CLASS = "pt-2";

type DialogContentProps = ComponentProps<typeof DialogContent>;
type DialogHeaderProps = ComponentProps<typeof DialogHeader>;
type DialogFooterProps = ComponentProps<typeof DialogFooter>;

interface DialogFormContentProps extends DialogContentProps {
	size: ModalSizeInput;
}

interface DialogFormBodyProps extends ComponentProps<"div"> {}

interface DialogFormActionsProps extends ComponentProps<"div"> {}

export function getDialogFormContentClass(
	size: ModalSizeInput,
	className?: string,
) {
	return cn(
		getModalWidthClass(size),
		"max-h-[90vh] overflow-y-auto",
		className,
	);
}

export function getScrollableDialogContentClass(
	size: ModalSizeInput,
	className?: string,
) {
	return getDialogFormContentClass(size, className);
}

export function DialogFormContent({
	size,
	className,
	...props
}: DialogFormContentProps) {
	return createElement(DialogContent, {
		...props,
		className: getDialogFormContentClass(size, className),
	});
}

export function DialogFormHeader({ className, ...props }: DialogHeaderProps) {
	return createElement(DialogHeader, {
		...props,
		className: cn("text-left", className),
	});
}

export function DialogFormBody({ className, ...props }: DialogFormBodyProps) {
	return createElement("div", {
		...props,
		className: cn(DIALOG_FORM_BODY_CLASS, className),
	});
}

export function DialogFormFooter({ className, ...props }: DialogFooterProps) {
	return createElement(DialogFooter, {
		...props,
		className: cn(DIALOG_FORM_FOOTER_CLASS, className),
	});
}

export function DialogFormActions({
	className,
	...props
}: DialogFormActionsProps) {
	return createElement("div", {
		...props,
		className: cn(
			"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
			className,
		),
	});
}
