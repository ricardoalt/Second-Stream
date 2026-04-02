"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
	TransferOrganizationInput,
	TransferOrganizationResult,
} from "@/lib/api/admin-users";
import type { Organization } from "@/lib/api/organizations";
import type { User } from "@/lib/types/user";

const TRANSFER_ERROR_MESSAGES: Record<string, string> = {
	TARGET_ORG_INACTIVE: "Target organization is inactive. Pick an active one.",
	SAME_ORGANIZATION: "User is already in that organization.",
	SUPERUSER_TRANSFER_BLOCKED: "Platform admins cannot be transferred.",
	LAST_ORG_ADMIN_BLOCKED:
		"Cannot move last active org admin. Promote another admin first.",
	REASSIGN_REQUIRED:
		"User has active projects. Choose an org admin to reassign ownership.",
	REASSIGN_INVALID:
		"Invalid reassignment user. Must be active org admin in source org.",
	REASSIGN_USER_NOT_FOUND: "Reassignment user not found.",
	USER_NOT_FOUND: "User not found.",
	TARGET_ORG_NOT_FOUND: "Target organization not found.",
	FORBIDDEN_SUPERADMIN_REQUIRED: "Only superadmins can move members.",
	TRANSFER_STATE_CONFLICT:
		"Member data changed during transfer. Refresh and retry the move.",
};

interface TransferUserModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: User | null;
	currentOrganizationId: string;
	availableOrganizations: Organization[];
	organizationMembers: User[];
	onSubmit: (
		userId: string,
		payload: TransferOrganizationInput,
	) => Promise<TransferOrganizationResult>;
}

export function TransferUserModal({
	open,
	onOpenChange,
	user,
	currentOrganizationId,
	availableOrganizations,
	organizationMembers,
	onSubmit,
}: TransferUserModalProps) {
	const [targetOrganizationId, setTargetOrganizationId] = useState("");
	const [reason, setReason] = useState("");
	const [reassignToUserId, setReassignToUserId] = useState("");
	const [confirmationText, setConfirmationText] = useState("");
	const [requiresReassign, setRequiresReassign] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const targetOrganizations = useMemo(
		() =>
			availableOrganizations.filter(
				(org) => org.id !== currentOrganizationId && org.isActive,
			),
		[availableOrganizations, currentOrganizationId],
	);

	const reassignCandidates = useMemo(() => {
		if (!user) {
			return [];
		}
		return organizationMembers.filter(
			(member) =>
				member.id !== user.id && member.role === "org_admin" && member.isActive,
		);
	}, [organizationMembers, user]);

	useEffect(() => {
		if (!open) {
			return;
		}
		setTargetOrganizationId("");
		setReason("");
		setReassignToUserId("");
		setConfirmationText("");
		setRequiresReassign(false);
		setErrorMessage(null);
	}, [open]);

	const canSubmit =
		Boolean(user) &&
		targetOrganizationId.trim() !== "" &&
		reason.trim().length >= 10 &&
		confirmationText.trim().toLowerCase() === user?.email.toLowerCase() &&
		(!requiresReassign || reassignToUserId.trim() !== "");

	const resolveErrorCode = (error: unknown): string | null => {
		if (typeof error !== "object" || error === null) {
			return null;
		}
		const rawCode = Reflect.get(error, "code");
		if (typeof rawCode === "string") {
			return rawCode;
		}
		return null;
	};

	const resolveErrorMessage = (error: unknown): string => {
		if (error instanceof Error && error.message.trim() !== "") {
			return error.message;
		}
		return "Could not move member";
	};

	const handleSubmit = async () => {
		if (!(user && canSubmit)) {
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);
		try {
			await onSubmit(user.id, {
				targetOrganizationId,
				reason: reason.trim(),
				reassignToUserId:
					reassignToUserId.trim() === "" ? null : reassignToUserId,
			});
			onOpenChange(false);
		} catch (error: unknown) {
			const errorCode = resolveErrorCode(error);
			if (errorCode === "REASSIGN_REQUIRED") {
				setRequiresReassign(true);
				if (reassignCandidates.length === 0) {
					setErrorMessage(
						"User has active projects, but source org has no active org admin. Promote one first, then retry.",
					);
					return;
				}
			}
			setErrorMessage(
				errorCode
					? (TRANSFER_ERROR_MESSAGES[errorCode] ?? resolveErrorMessage(error))
					: resolveErrorMessage(error),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!user) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[560px]">
				<DialogHeader>
					<DialogTitle>Transfer {user.firstName}</DialogTitle>
				</DialogHeader>

				<div className="space-y-6 py-2">
					<Alert variant="destructive" className="border-destructive/50">
						<AlertTriangle className="h-4 w-4" />
						<AlertDescription>
							{user.firstName} will lose access to all current projects and
							data. This action cannot be undone.
						</AlertDescription>
					</Alert>

					<Separator />

					<div className="space-y-2">
						<Label>Target organization *</Label>
						<Select
							value={targetOrganizationId}
							onValueChange={setTargetOrganizationId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select target organization" />
							</SelectTrigger>
							<SelectContent>
								{targetOrganizations.map((org) => (
									<SelectItem key={org.id} value={org.id}>
										{org.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Separator />

					<div className="space-y-2">
						<Label htmlFor="transfer-reason">Reason *</Label>
						<Textarea
							id="transfer-reason"
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							placeholder="Describe why this user must move (min 10 chars)"
							rows={4}
						/>
					</div>

					<Separator />

					<div className="space-y-2">
						<Label htmlFor="transfer-confirmation">
							Type member email to confirm *
						</Label>
						<Input
							id="transfer-confirmation"
							value={confirmationText}
							onChange={(event) => setConfirmationText(event.target.value)}
							placeholder={user?.email}
							autoComplete="off"
							className={
								confirmationText &&
								confirmationText.toLowerCase() !== user?.email.toLowerCase()
									? "border-destructive focus-visible:ring-destructive"
									: ""
							}
						/>
					</div>

					{requiresReassign && (
						<div className="space-y-2">
							<Separator />
							<Label>Reassign active projects to *</Label>
							<Select
								value={reassignToUserId}
								onValueChange={setReassignToUserId}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select active org admin" />
								</SelectTrigger>
								<SelectContent>
									{reassignCandidates.map((candidate) => (
										<SelectItem key={candidate.id} value={candidate.id}>
											{candidate.firstName} {candidate.lastName} (
											{candidate.email})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{reassignCandidates.length === 0 ? (
								<p className="text-sm text-warning">
									No active org admin available in source org. Promote one
									first.
								</p>
							) : null}
						</div>
					)}

					{errorMessage && (
						<p className="text-sm text-destructive" role="alert">
							{errorMessage}
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleSubmit}
						disabled={!canSubmit || isSubmitting}
					>
						{isSubmitting ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : null}
						Transfer member
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
