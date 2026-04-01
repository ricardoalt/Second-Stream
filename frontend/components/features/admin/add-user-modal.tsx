"use client";

import { Loader2, Lock, Mail, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { OrgUserCreateInput } from "@/lib/api/organizations";
import type { UserRole } from "@/lib/types/user";
import { cn } from "@/lib/utils";

const PASSWORD_REQUIREMENTS = [
	{
		key: "length",
		label: "At least 8 characters",
		test: (p: string) => p.length >= 8,
	},
	{
		key: "uppercase",
		label: "Contains uppercase letter",
		test: (p: string) => /[A-Z]/.test(p),
	},
	{
		key: "number",
		label: "Contains number",
		test: (p: string) => /[0-9]/.test(p),
	},
] as const;

const TENANT_ROLES: {
	value: Exclude<UserRole, "admin">;
	label: string;
}[] = [
	{
		value: "org_admin",
		label: "Org Admin",
	},
	{
		value: "field_agent",
		label: "Field Agent",
	},
];

export const ADD_USER_MODAL_COPY = {
	title: "Add team member",
	subtitle: "Enter the required account details.",
	fields: {
		firstName: "First name",
		lastName: "Last name",
		email: "Email address",
		role: "Role",
		password: "Password",
		confirmPassword: "Confirm password",
	},
} as const;

function getPasswordStrength(password: string): {
	score: number;
	label: string;
	color: string;
} {
	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;

	if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
	if (score <= 3) return { score, label: "Fair", color: "bg-yellow-500" };
	if (score <= 4) return { score, label: "Good", color: "bg-blue-500" };
	return { score, label: "Strong", color: "bg-green-500" };
}

interface AddUserModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: OrgUserCreateInput) => Promise<void>;
	organizationName?: string;
}

export function AddUserModal({
	open,
	onOpenChange,
	onSubmit,
}: AddUserModalProps) {
	const [form, setForm] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		firstName: "",
		lastName: "",
		role: "" as Exclude<UserRole, "admin"> | "",
	});
	const [submitting, setSubmitting] = useState(false);

	const handleInputChange = (field: keyof typeof form, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setForm({
			email: "",
			password: "",
			confirmPassword: "",
			firstName: "",
			lastName: "",
			role: "",
		});
	};

	const passwordStrength = useMemo(
		() => getPasswordStrength(form.password),
		[form.password],
	);

	const canSubmitForm = useMemo(() => {
		return (
			form.email.trim() !== "" &&
			form.password.length >= 8 &&
			/[A-Z]/.test(form.password) &&
			/[0-9]/.test(form.password) &&
			form.password === form.confirmPassword &&
			form.firstName.trim() !== "" &&
			form.lastName.trim() !== "" &&
			form.role !== ""
		);
	}, [form]);

	const handleSubmit = async () => {
		if (!canSubmitForm) return;

		setSubmitting(true);
		try {
			await onSubmit({
				email: form.email.trim(),
				password: form.password,
				firstName: form.firstName.trim(),
				lastName: form.lastName.trim(),
				role: form.role as Exclude<UserRole, "admin">,
			});
			resetForm();
			onOpenChange(false);
		} finally {
			setSubmitting(false);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
		resetForm();
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="overflow-hidden border-border/60 p-0 sm:max-w-[560px]">
				<div className="relative border-b border-border/60 bg-muted/30 px-6 py-5">
					<button
						type="button"
						onClick={handleClose}
						className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>

					<DialogTitle className="text-xl font-semibold text-foreground">
						{ADD_USER_MODAL_COPY.title}
					</DialogTitle>
					<p className="mt-1 text-sm text-muted-foreground">
						{ADD_USER_MODAL_COPY.subtitle}
					</p>
				</div>

				<div className="space-y-5 px-6 py-6">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label
								htmlFor="firstName"
								className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
							>
								{ADD_USER_MODAL_COPY.fields.firstName}
							</Label>
							<Input
								id="firstName"
								placeholder="First name"
								value={form.firstName}
								onChange={(e) => handleInputChange("firstName", e.target.value)}
								className="h-11"
							/>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="lastName"
								className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
							>
								{ADD_USER_MODAL_COPY.fields.lastName}
							</Label>
							<Input
								id="lastName"
								placeholder="Last name"
								value={form.lastName}
								onChange={(e) => handleInputChange("lastName", e.target.value)}
								className="h-11"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label
								htmlFor="email"
								className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
							>
								{ADD_USER_MODAL_COPY.fields.email}
							</Label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="email"
									type="email"
									placeholder="name@company.com"
									value={form.email}
									onChange={(e) => handleInputChange("email", e.target.value)}
									className="h-11 pl-10"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="role"
								className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
							>
								{ADD_USER_MODAL_COPY.fields.role}
							</Label>
							<Select
								value={form.role}
								onValueChange={(value) =>
									handleInputChange("role", value as Exclude<UserRole, "admin">)
								}
							>
								<SelectTrigger className="h-11 w-full">
									<SelectValue placeholder="Select role" />
								</SelectTrigger>
								<SelectContent>
									{TENANT_ROLES.map((role) => (
										<SelectItem key={role.value} value={role.value}>
											{role.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label
								htmlFor="password"
								className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
							>
								{ADD_USER_MODAL_COPY.fields.password}
							</Label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="password"
									type="password"
									placeholder="••••••••"
									value={form.password}
									onChange={(e) =>
										handleInputChange("password", e.target.value)
									}
									className="h-11 pl-10"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="confirmPassword"
								className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
							>
								{ADD_USER_MODAL_COPY.fields.confirmPassword}
							</Label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="confirmPassword"
									type="password"
									placeholder="Re-enter password"
									value={form.confirmPassword}
									onChange={(e) =>
										handleInputChange("confirmPassword", e.target.value)
									}
									aria-invalid={
										form.confirmPassword.length > 0 &&
										form.password !== form.confirmPassword
									}
									className={cn(
										"h-11 pl-10",
										form.confirmPassword.length > 0 &&
											form.password !== form.confirmPassword &&
											"border-red-400 focus:border-red-400 focus-visible:ring-red-400/20",
									)}
								/>
							</div>
							{form.confirmPassword.length > 0 &&
								form.password !== form.confirmPassword && (
									<p className="mt-1 text-xs text-red-500" role="alert">
										Passwords do not match
									</p>
								)}
						</div>
					</div>

					{form.password && (
						<div className="space-y-2 pt-1">
							<div className="flex items-center gap-2">
								<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
									<div
										className={cn(
											"h-full transition-all duration-300",
											passwordStrength.color,
										)}
										style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
									/>
								</div>
								<span className="min-w-[50px] text-xs font-medium text-muted-foreground">
									{passwordStrength.label}
								</span>
							</div>

							<ul className="flex flex-wrap gap-3">
								{PASSWORD_REQUIREMENTS.map((req) => {
									const passed =
										form.password.length > 0 && req.test(form.password);
									return (
										<li
											key={req.key}
											className={cn(
												"flex items-center gap-1 text-[10px] transition-colors",
												passed
													? "text-emerald-600 dark:text-emerald-400"
													: "text-muted-foreground",
											)}
										>
											<span
												className={cn(
													"w-3.5 h-3.5 rounded-full flex items-center justify-center",
													passed
														? "bg-emerald-100 dark:bg-emerald-900/30"
														: "bg-muted",
												)}
											>
												{passed ? (
													<span
														aria-hidden="true"
														className="text-[10px] leading-none"
													>
														✓
													</span>
												) : (
													<span className="w-1 h-1 rounded-full bg-current" />
												)}
											</span>
											<span>{req.label}</span>
										</li>
									);
								})}
							</ul>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-3 border-t border-border/60 px-6 py-4">
					<Button variant="ghost" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!canSubmitForm || submitting}
						className="px-6"
					>
						{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						{submitting ? "Adding..." : "Add member"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
