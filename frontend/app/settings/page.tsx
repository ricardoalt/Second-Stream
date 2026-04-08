"use client";

import { Key, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";

import { SimplePasswordInput } from "@/components/features/auth";
import { PageHeader, PageShell } from "@/components/patterns";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI } from "@/lib/api/auth";
import { useAuth } from "@/lib/contexts";

const MIN_LENGTH = 8;

export default function SettingsPage() {
	const { logout, isAdmin } = useAuth();
	const { theme, setTheme } = useTheme();

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [changingPassword, setChangingPassword] = useState(false);
	const [deleteText, setDeleteText] = useState("");
	const [deleting, setDeleting] = useState(false);

	const passwordValid =
		newPassword.length >= MIN_LENGTH &&
		/[A-Z]/.test(newPassword) &&
		/[0-9]/.test(newPassword);
	const passwordsMatch = newPassword === confirmPassword;
	const canChangePassword =
		passwordValid && passwordsMatch && confirmPassword.length > 0;

	const handleChangePassword = async () => {
		if (!canChangePassword) return;
		setChangingPassword(true);
		try {
			await authAPI.changePassword("", newPassword);
			toast.success("Password changed successfully");
			setNewPassword("");
			setConfirmPassword("");
		} catch {
			toast.error("Failed to change password");
		} finally {
			setChangingPassword(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (deleteText !== "DELETE") return;
		setDeleting(true);
		try {
			await authAPI.deleteAccount();
			toast.success("Account deleted");
			logout();
		} catch {
			toast.error("Failed to delete account");
			setDeleting(false);
		}
	};

	return (
		<PageShell gap="default">
			<PageHeader
				title="Settings"
				subtitle="Manage your account preferences and security."
				variant="compact"
				breadcrumbs={[
					{ label: "Dashboard", href: "/dashboard" },
					{ label: "Settings" },
				]}
			/>

			<div className="mx-auto w-full max-w-xl flex flex-col gap-6">
				{/* Appearance */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{theme === "dark" ? (
								<Moon className="size-5" />
							) : (
								<Sun className="size-5" />
							)}
							Appearance
						</CardTitle>
						<CardDescription>Choose your preferred theme</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2">
							<Button
								variant={theme === "light" ? "default" : "outline"}
								onClick={() => setTheme("light")}
								className="flex-1"
							>
								<Sun data-icon="inline-start" aria-hidden />
								Light
							</Button>
							<Button
								variant={theme === "dark" ? "default" : "outline"}
								onClick={() => setTheme("dark")}
								className="flex-1"
							>
								<Moon data-icon="inline-start" aria-hidden />
								Dark
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Change Password */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Key className="size-5" />
							Change Password
						</CardTitle>
						<CardDescription>Update your account password</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<Label htmlFor="newPassword">New Password</Label>
							<SimplePasswordInput
								id="newPassword"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Enter new password"
							/>
							<p className="text-xs text-muted-foreground">
								Min {MIN_LENGTH} chars, 1 uppercase, 1 number
							</p>
						</div>

						<div className="flex flex-col gap-1">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<SimplePasswordInput
								id="confirmPassword"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="Confirm new password"
							/>
							{confirmPassword && !passwordsMatch && (
								<p className="text-xs text-destructive">
									Passwords don&apos;t match
								</p>
							)}
						</div>

						<Button
							onClick={handleChangePassword}
							disabled={!canChangePassword || changingPassword}
							className="w-full"
						>
							{changingPassword ? (
								<Loader2
									data-icon="inline-start"
									aria-hidden
									className="animate-spin"
								/>
							) : (
								<Key data-icon="inline-start" aria-hidden />
							)}
							Change Password
						</Button>
					</CardContent>
				</Card>

				{/* Danger Zone */}
				{isAdmin && (
					<Card className="border-destructive/50">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-destructive">
								<Trash2 className="size-5" />
								Danger Zone
							</CardTitle>
							<CardDescription>Permanently delete your account</CardDescription>
						</CardHeader>
						<CardContent>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" className="w-full">
										<Trash2 data-icon="inline-start" aria-hidden />
										Delete Account
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete Account?</AlertDialogTitle>
										<AlertDialogDescription>
											This action cannot be undone. All your data will be
											permanently deleted.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<div className="flex flex-col gap-2 py-4">
										<Label htmlFor="deleteConfirm">
											Type <span className="font-bold">DELETE</span> to confirm
										</Label>
										<Input
											id="deleteConfirm"
											value={deleteText}
											onChange={(e) =>
												setDeleteText(e.target.value.toUpperCase())
											}
											placeholder="DELETE"
										/>
									</div>
									<AlertDialogFooter>
										<AlertDialogCancel onClick={() => setDeleteText("")}>
											Cancel
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleDeleteAccount}
											disabled={deleteText !== "DELETE" || deleting}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											{deleting && (
												<Loader2
													data-icon="inline-start"
													aria-hidden
													className="animate-spin"
												/>
											)}
											Delete Account
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</CardContent>
					</Card>
				)}
			</div>
		</PageShell>
	);
}
