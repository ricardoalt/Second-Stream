"use client";

import { RefreshCcw, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
import {
	type AdminCreateUserInput,
	adminUsersAPI,
} from "@/lib/api/admin-users";
import { APIClientError } from "@/lib/api/client";
import type { User } from "@/lib/types/user";
import { isValidPassword, PASSWORD_HINT, passwordsMatch } from "../utils";

interface CreateAdminDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUserCreated: (user: User) => void;
}

interface FormState {
	email: string;
	password: string;
	confirmPassword: string;
	firstName: string;
	lastName: string;
}

const INITIAL_FORM: FormState = {
	email: "",
	password: "",
	confirmPassword: "",
	firstName: "",
	lastName: "",
};

export function CreateAdminDialog({
	open,
	onOpenChange,
	onUserCreated,
}: CreateAdminDialogProps) {
	const emailInputRef = useRef<HTMLInputElement>(null);
	const [form, setForm] = useState<FormState>(INITIAL_FORM);
	const [submitting, setSubmitting] = useState(false);

	const handleInputChange = (field: keyof FormState, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setForm(INITIAL_FORM);
	};

	const canSubmit =
		form.email.trim() !== "" &&
		isValidPassword(form.password) &&
		passwordsMatch(form.password, form.confirmPassword) &&
		form.firstName.trim() !== "" &&
		form.lastName.trim() !== "";

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setSubmitting(true);
		const payload: AdminCreateUserInput = {
			email: form.email.trim(),
			password: form.password,
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim(),
			isSuperuser: true,
			role: "admin",
		};
		try {
			const newUser = await adminUsersAPI.create(payload);
			onUserCreated(newUser);
			toast.success("User created");
			onOpenChange(false);
			resetForm();
		} catch (error: unknown) {
			const message =
				error instanceof APIClientError
					? error.message
					: error instanceof Error
						? error.message
						: "Failed to create user";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) resetForm();
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				onOpenAutoFocus={(e) => {
					e.preventDefault();
					emailInputRef.current?.focus();
				}}
			>
				<DialogHeader>
					<DialogTitle>Create Platform Admin</DialogTitle>
					<DialogDescription>
						Create a new superuser with full platform access.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="create-email">Email</Label>
						<Input
							ref={emailInputRef}
							id="create-email"
							name="email"
							type="email"
							autoComplete="email"
							value={form.email}
							onChange={(e) => handleInputChange("email", e.target.value)}
							placeholder="user@example.com"
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="create-firstName">First Name</Label>
							<Input
								id="create-firstName"
								name="firstName"
								autoComplete="given-name"
								value={form.firstName}
								onChange={(e) => handleInputChange("firstName", e.target.value)}
								placeholder="Jane"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-lastName">Last Name</Label>
							<Input
								id="create-lastName"
								name="lastName"
								autoComplete="family-name"
								value={form.lastName}
								onChange={(e) => handleInputChange("lastName", e.target.value)}
								placeholder="Doe"
							/>
						</div>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="create-password">Password</Label>
						<Input
							id="create-password"
							name="password"
							type="password"
							autoComplete="new-password"
							value={form.password}
							onChange={(e) => handleInputChange("password", e.target.value)}
							placeholder="StrongPassword1"
						/>
						<p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="create-confirmPassword">Confirm Password</Label>
						<Input
							id="create-confirmPassword"
							name="confirmPassword"
							type="password"
							autoComplete="new-password"
							value={form.confirmPassword}
							onChange={(e) =>
								handleInputChange("confirmPassword", e.target.value)
							}
							placeholder="StrongPassword1"
						/>
						{form.confirmPassword &&
							!passwordsMatch(form.password, form.confirmPassword) && (
								<p className="text-xs text-destructive">
									Passwords do not match
								</p>
							)}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="create-role">Role</Label>
						<Input
							id="create-role"
							name="role"
							value="Platform Admin"
							disabled
							readOnly
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
						{submitting ? (
							<RefreshCcw
								className="mr-2 h-4 w-4 animate-spin"
								aria-hidden="true"
							/>
						) : (
							<UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
						)}
						Create Admin
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
