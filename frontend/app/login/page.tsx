"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
	AuthFormField,
	AuthLayout,
	SimplePasswordInput,
} from "@/components/features/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/contexts";
import { type LoginFormData, loginSchema } from "@/lib/validation/auth-schemas";

export default function LoginPage() {
	const [authError, setAuthError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { login } = useAuth();

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
	});

	const emailField = register("email", {
		onChange: () => setAuthError(null),
	});
	const passwordField = register("password", {
		onChange: () => setAuthError(null),
	});

	const onSubmit = async (data: LoginFormData) => {
		setIsLoading(true);
		setAuthError(null);

		try {
			await login(data.email, data.password);
			// Success toast is handled by AuthContext
		} catch (_error) {
			setAuthError("Invalid email or password. Please try again.");
			// Error toast is handled by AuthContext
			// Logging handled by AuthContext
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout
			title="Welcome back"
			subtitle="Sign in with the credentials provided by your admin"
			footer={
				<div className="text-center text-sm text-muted-foreground">
					Accounts are created by your organization admin. If you need access or
					forgot your password, please contact your admin.
				</div>
			}
		>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				{authError ? (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" aria-hidden="true" />
						<AlertDescription>{authError}</AlertDescription>
					</Alert>
				) : null}

				{/* Email Field */}
				<AuthFormField
					label="Email"
					htmlFor="email"
					error={errors.email}
					required
				>
					<div className="relative">
						<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							id="email"
							type="email"
							placeholder="you@company.com"
							className="h-11 pl-10"
							disabled={isLoading}
							{...emailField}
						/>
					</div>
				</AuthFormField>

				{/* Password Field */}
				<AuthFormField
					label="Password"
					htmlFor="password"
					error={errors.password}
					required
				>
					<SimplePasswordInput
						id="password"
						placeholder="Enter your password"
						className="h-11"
						disabled={isLoading}
						{...passwordField}
					/>
				</AuthFormField>

				{/* Remember Me & Forgot Password */}
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<Checkbox
							id="rememberMe"
							disabled={isLoading}
							{...register("rememberMe")}
						/>
						<label
							htmlFor="rememberMe"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
						>
							Remember me
						</label>
					</div>

					<span className="text-xs text-muted-foreground">
						Forgot your password? Ask your admin to reset it.
					</span>
				</div>

				{/* Submit Button */}
				<motion.div
					whileHover={{ scale: isLoading ? 1 : 1.01 }}
					whileTap={{ scale: isLoading ? 1 : 0.99 }}
				>
					<Button
						type="submit"
						className="w-full h-11 text-base font-medium"
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Signing in...
							</>
						) : (
							<>
								Sign in
								<ArrowRight className="ml-2 h-4 w-4" />
							</>
						)}
					</Button>
				</motion.div>
			</form>
		</AuthLayout>
	);
}
