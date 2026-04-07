import type { ComponentProps, ReactNode } from "react";
import { Input, Label, ToggleGroup, ToggleGroupItem } from "@/components/ui";
import { cn } from "@/lib/utils";

type AccountStatus = "active" | "prospect";

export function ClientFieldLabel({
	required,
	htmlFor,
	children,
}: {
	required?: boolean;
	htmlFor?: string;
	children: ReactNode;
}) {
	return (
		<Label
			htmlFor={htmlFor}
			className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
		>
			{children} {required && <span className="text-destructive">*</span>}
		</Label>
	);
}

export function ClientInputWithIcon({
	icon,
	className,
	...props
}: ComponentProps<typeof Input> & {
	icon: ReactNode;
}) {
	return (
		<div className="relative">
			<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/50">
				{icon}
			</div>
			<Input
				className={cn("h-10 bg-surface-container-low/60 pl-10", className)}
				{...props}
			/>
		</div>
	);
}

export function AccountStatusToggle({
	value,
	onValueChange,
	className,
	id,
	"aria-label": ariaLabel,
	"aria-describedby": ariaDescribedBy,
	disabled,
}: {
	value: AccountStatus;
	onValueChange: (value: AccountStatus) => void;
	className?: string;
	id?: string;
	"aria-label"?: string;
	"aria-describedby"?: string;
	disabled?: boolean;
}) {
	const optionalProps = {
		...(id ? { id } : {}),
		...(ariaLabel ? { "aria-label": ariaLabel } : {}),
		...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
		...(disabled ? { disabled } : {}),
	};

	return (
		<ToggleGroup
			{...optionalProps}
			type="single"
			value={value}
			onValueChange={(next) => {
				if (next === "active" || next === "prospect") {
					onValueChange(next);
				}
			}}
			variant="outline"
			size="sm"
			spacing={0}
			className={cn(
				"h-10 w-full min-w-[220px] rounded-lg border border-border/40 bg-surface-container-high/40 p-[3px]",
				className,
			)}
		>
			<ToggleGroupItem
				value="active"
				className="flex-1 rounded-md font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
			>
				Active
			</ToggleGroupItem>
			<ToggleGroupItem
				value="prospect"
				className="flex-1 rounded-md font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
			>
				Prospect
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
