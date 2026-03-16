"use client";

import {
	Download,
	File,
	FileSpreadsheet,
	FileText,
	Image,
	type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

const FILE_ICONS: Record<string, LucideIcon> = {
	pdf: FileText,
	docx: FileText,
	doc: FileText,
	xlsx: FileSpreadsheet,
	xls: FileSpreadsheet,
	png: Image,
	jpg: Image,
	jpeg: Image,
};

interface UploadedFilesCardProps {
	files: UploadedFile[];
}

export function UploadedFilesCard({ files }: UploadedFilesCardProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">All Uploaded Files</CardTitle>
					{files.length > 0 && (
						<Badge variant="muted" className="text-xs">
							{files.length}
						</Badge>
					)}
				</div>
				<CardDescription>Supporting documents and attachments</CardDescription>
			</CardHeader>
			<CardContent>
				{files.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-6 text-center">
						<File className="h-8 w-8 text-muted-foreground/30" />
						<p className="mt-2 text-sm text-muted-foreground">
							No files uploaded
						</p>
					</div>
				) : (
					<div className="divide-y divide-border/40">
						{files.map((file) => {
							const Icon = FILE_ICONS[file.fileType] ?? File;
							return (
								<div
									key={file.id}
									className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
								>
									<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
									<div className="flex-1 min-w-0">
										<p className="text-sm truncate">{file.name}</p>
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
										className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
									>
										<Download className="h-3.5 w-3.5" />
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
