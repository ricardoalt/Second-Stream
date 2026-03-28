"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { StreamFilesSection } from "@/components/features/streams/files-section";
import { FileUploader } from "@/components/shared/common/file-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface StreamFilesPageContentProps {
	projectId: string;
	backHref: string;
	onFilesChanged?: (() => void) | undefined;
	showBackToWorkspace?: boolean;
	showUploadSection?: boolean;
}

const MAX_FILES_HINT = 50;

export function StreamFilesPageContent({
	projectId,
	backHref,
	onFilesChanged,
	showBackToWorkspace = true,
	showUploadSection = true,
}: StreamFilesPageContentProps) {
	const [refreshSignal, setRefreshSignal] = useState(0);
	const [filesCount, setFilesCount] = useState(0);

	const handleUploadComplete = useCallback(async () => {
		setRefreshSignal((current) => current + 1);
		onFilesChanged?.();
	}, [onFilesChanged]);

	return (
		<div className="flex h-full flex-col gap-4 overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm">
			<header className="flex flex-col gap-3">
				{showBackToWorkspace ? (
					<Button asChild size="sm" variant="ghost" className="w-fit">
						<Link href={backHref}>
							<ArrowLeft data-icon="inline-start" aria-hidden />
							Back to workspace
						</Link>
					</Button>
				) : null}
				<div className="flex items-center gap-2">
					<h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
						Files
					</h1>
					<Badge variant="secondary" className="rounded-full">
						{filesCount} uploaded
					</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					Browse stream evidence, discover files fast, and inspect detailed
					previews with contextual actions.
				</p>
			</header>

			<div className="flex-1 overflow-y-auto py-2 pr-2">
				{showUploadSection ? (
					<>
						<FileUploader
							projectId={projectId}
							onUploadComplete={() => {
								void handleUploadComplete();
							}}
							maxFiles={MAX_FILES_HINT}
						/>

						<Separator className="my-6" />
					</>
				) : null}

				<StreamFilesSection
					projectId={projectId}
					refreshSignal={refreshSignal}
					onDataImported={onFilesChanged}
					onFilesCountChange={setFilesCount}
				/>
			</div>
		</div>
	);
}
