"use client";

import { motion } from "framer-motion";
import { Check, Download, Mail, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
	proposalId: string;
	proposalTitle: string;
	onApprove?: () => void;
	isApproved?: boolean;
}

export function QuickActions({
	proposalId: _proposalId,
	proposalTitle,
	onApprove,
	isApproved = false,
}: QuickActionsProps) {
	const [isExporting, setIsExporting] = useState(false);

	const handleShare = async () => {
		const url = window.location.href;

		if (navigator.share) {
			try {
				await navigator.share({
					title: proposalTitle,
					text: `Check out this opportunity report: ${proposalTitle}`,
					url,
				});
			} catch {
				// User cancelled or share failed
			}
		} else {
			// Fallback to clipboard
			await navigator.clipboard.writeText(url);
			toast.success("Link copied to clipboard");
		}
	};

	const handleExportPDF = async () => {
		setIsExporting(true);

		// Simulate PDF export (replace with actual implementation)
		await new Promise((resolve) => setTimeout(resolve, 1500));

		toast.success("PDF export ready", {
			description: "Your report has been downloaded",
		});
		setIsExporting(false);
	};

	const handleEmailShare = () => {
		const subject = encodeURIComponent(`DSR Opportunity: ${proposalTitle}`);
		const body = encodeURIComponent(
			`Check out this opportunity report:\n\n${window.location.href}`,
		);
		window.open(`mailto:?subject=${subject}&body=${body}`);
	};

	const handleApprove = () => {
		if (onApprove) {
			onApprove();
			toast.success("Proposal approved for field operations");
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.5 }}
		>
			<Card className="bg-muted/30 border-dashed">
				<CardContent className="p-4">
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
						<div>
							<h4 className="font-semibold text-foreground">Quick Actions</h4>
							<p className="text-xs text-muted-foreground">
								Share, export, or approve this opportunity
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							{/* Share Button with Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="gap-2">
										<Share2 className="h-4 w-4" />
										Share
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={handleShare}>
										<Share2 className="h-4 w-4 mr-2" />
										Copy Link
									</DropdownMenuItem>
									<DropdownMenuItem onClick={handleEmailShare}>
										<Mail className="h-4 w-4 mr-2" />
										Email
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Export PDF */}
							<Button
								variant="outline"
								size="sm"
								className="gap-2"
								onClick={handleExportPDF}
								disabled={isExporting}
							>
								<Download
									className={cn("h-4 w-4", isExporting && "animate-bounce")}
								/>
								{isExporting ? "Exporting..." : "Export PDF"}
							</Button>

							{/* Approve Button */}
							<Button
								size="sm"
								className={cn(
									"gap-2",
									isApproved && "bg-success hover:bg-success/90",
								)}
								onClick={handleApprove}
								disabled={isApproved}
							>
								<Check className="h-4 w-4" />
								{isApproved ? "Approved" : "Approve for Field"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}
