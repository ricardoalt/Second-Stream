"use client";

import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatFileSize, formatRelativeDate } from "@/lib/format";
import type { UploadedFile } from "@/lib/types/proposal-detail";

interface ProposalFileCardProps {
	file: UploadedFile | null;
}

export function ProposalFileCard({ file }: ProposalFileCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">Uploaded Proposal</CardTitle>
				<CardDescription>
					The proposal document sent to the client
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!file ? (
					<div className="flex flex-col items-center justify-center py-6 text-center">
						<FileText className="h-8 w-8 text-muted-foreground/30" />
						<p className="mt-2 text-sm text-muted-foreground">
							No proposal uploaded yet
						</p>
					</div>
				) : (
					<div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
						<FileText className="h-5 w-5 shrink-0 text-primary" />
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">{file.name}</p>
							<p className="text-xs text-muted-foreground">
								{formatFileSize(file.sizeBytes)} ·{" "}
								{formatRelativeDate(file.uploadedAt)}
							</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							aria-label={`Download ${file.name}`}
							onClick={() => toast.success("Download started")}
							className="shrink-0"
						>
							<Download className="h-4 w-4" />
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
