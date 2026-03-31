"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompleteView({
	confirmed,
	skipped,
	onGoToStreams,
	onGoToDrafts,
}: {
	confirmed: number;
	skipped: number;
	onGoToStreams: () => void;
	onGoToDrafts: () => void;
}) {
	return (
		<section className="flex flex-col flex-1 px-6 pt-8 pb-6">
			<div className="flex items-start gap-3 mb-2">
				<div className="rounded-xl bg-primary/10 p-2.5">
					<CheckCircle className="h-5 w-5 text-primary" />
				</div>
				<div>
					<h3 className="font-display text-xl font-semibold tracking-tight">
						Waste Streams Created
					</h3>
					<p className="text-sm text-muted-foreground mt-0.5 max-w-md">
						{confirmed} stream{confirmed === 1 ? "" : "s"} confirmed and
						created. {skipped} stream{skipped === 1 ? "" : "s"} kept as draft.
					</p>
				</div>
			</div>

			<div className="mt-auto flex items-center justify-end gap-3 pt-6">
				<Button variant="ghost" onClick={onGoToDrafts}>
					Done
				</Button>
				<Button
					onClick={onGoToStreams}
					className="bg-gradient-to-r from-primary to-primary/90 shadow-water"
				>
					View Streams
				</Button>
			</div>
		</section>
	);
}

export function NoResultsView({
	onClose,
	onTryAgain,
	onCreateManually,
}: {
	onClose: () => void;
	onTryAgain: () => void;
	onCreateManually: () => void;
}) {
	return (
		<section className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
			<div className="rounded-full bg-muted/70 p-4">
				<AlertCircle className="h-7 w-7 text-muted-foreground" />
			</div>
			<h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
				No streams detected
			</h3>
			<p className="mt-1 max-w-md text-sm text-muted-foreground">
				Second Stream AI could not identify candidates from this input.
			</p>

			<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
				<Button onClick={onTryAgain}>Try Again</Button>
				<Button variant="secondary" onClick={onCreateManually}>
					Create Manually
				</Button>
			</div>
		</section>
	);
}

export function ErrorView({
	error,
	onTryAgain,
	onClose,
	onCreateManually,
}: {
	error: string;
	onTryAgain: () => void;
	onClose: () => void;
	onCreateManually: () => void;
}) {
	return (
		<div
			role="alert"
			className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center flex-1 px-6 py-12"
		>
			<div className="rounded-full bg-destructive/10 p-4 mb-4">
				<AlertCircle className="h-8 w-8 text-destructive" />
			</div>

			<h3 className="font-display text-lg font-semibold tracking-tight mb-1">
				Something went wrong
			</h3>
			<p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
				{error}
			</p>

			<div className="flex gap-3">
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
				<Button onClick={onTryAgain}>Try Again</Button>
				<Button variant="secondary" onClick={onCreateManually}>
					Create Manually
				</Button>
			</div>
		</div>
	);
}
