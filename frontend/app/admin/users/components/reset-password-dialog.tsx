"use client";

import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUpdateUserInput } from "@/lib/api/admin-users";
import { isValidPassword, PASSWORD_HINT, passwordsMatch } from "../utils";

interface ResetPasswordDialogProps {
	userId: string | null;
	userName: string;
	onClose: () => void;
	onUpdateUser: (
		userId: string,
		updates: AdminUpdateUserInput,
		successMessage: string,
	) => Promise<{ ok: boolean }>;
}

export function ResetPasswordDialog({
	userId,
	userName,
	onClose,
	onUpdateUser,
}: ResetPasswordDialogProps) {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const canSubmit =
		isValidPassword(password) && passwordsMatch(password, confirmPassword);

	const handleSubmit = async () => {
		if (!userId || !canSubmit) return;
		setSubmitting(true);
		try {
			const result = await onUpdateUser(
				userId,
				{ password },
				`Password for ${userName} updated`,
			);
			if (result.ok) {
				handleClose();
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleClose = () => {
		setPassword("");
		setConfirmPassword("");
		onClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	return (
		<Dialog open={userId !== null} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Reset password</DialogTitle>
					<DialogDescription>
						Set a new password for this user. Share it securely with them.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="reset-password">New password</Label>
						<Input
							id="reset-password"
							name="newPassword"
							type="password"
							autoComplete="new-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="StrongPassword1"
						/>
						<p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="reset-confirmPassword">Confirm password</Label>
						<Input
							id="reset-confirmPassword"
							name="confirmNewPassword"
							type="password"
							autoComplete="new-password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="StrongPassword1"
						/>
						{confirmPassword && !passwordsMatch(password, confirmPassword) && (
							<p className="text-xs text-destructive">Passwords do not match</p>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!canSubmit || submitting}
						aria-busy={submitting}
					>
						{submitting ? (
							<RefreshCcw
								data-icon="inline-start"
								className="animate-spin"
								aria-hidden="true"
							/>
						) : null}
						{submitting ? "Updating\u2026" : "Update password"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
