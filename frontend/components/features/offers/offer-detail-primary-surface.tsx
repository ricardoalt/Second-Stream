import { FileUp, RefreshCcw, Shield } from "lucide-react";
import { OFFER_FOLLOW_UP_LABELS } from "@/components/features/offers/utils";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OfferDetailDTO } from "@/lib/api/offers";
import { formatFileSize } from "@/lib/format";
import type { ProposalFollowUpState } from "@/lib/types/dashboard";

function formatDate(value: string | null | undefined) {
	if (!value) {
		return "N/A";
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return "N/A";
	}
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(parsed);
}

interface OfferDetailPrimarySurfaceProps {
	detail: OfferDetailDTO;
	nextTransitions: ProposalFollowUpState[];
	isRefreshing: boolean;
	isUploading: boolean;
	isTransitioning: boolean;
	refreshError: string | null;
	uploadError: string | null;
	transitionError: string | null;
	onRefreshInsights: () => void;
	onUploadClick: () => void;
	onTransition: (nextState: ProposalFollowUpState) => void;
	onDownload: () => void;
}

export function OfferDetailPrimarySurface({
	detail,
	nextTransitions,
	isRefreshing,
	isUploading,
	isTransitioning,
	refreshError,
	uploadError,
	transitionError,
	onRefreshInsights,
	onUploadClick,
	onTransition,
	onDownload,
}: OfferDetailPrimarySurfaceProps) {
	return (
		<section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
			<div className="flex flex-col gap-6">
				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold text-foreground">
							Stream snapshot
						</CardTitle>
						<CardDescription>
							Workspace baseline currently driving Offer insights.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<dl className="grid gap-3 sm:grid-cols-2">
							<div>
								<dt className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
									Material type
								</dt>
								<dd className="text-sm text-foreground">
									{detail.streamSnapshot.materialType ?? "N/A"}
								</dd>
							</div>
							<div>
								<dt className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
									Material name
								</dt>
								<dd className="text-sm text-foreground">
									{detail.streamSnapshot.materialName ?? "N/A"}
								</dd>
							</div>
							<div>
								<dt className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
									Composition
								</dt>
								<dd className="text-sm text-foreground">
									{detail.streamSnapshot.composition ?? "N/A"}
								</dd>
							</div>
							<div>
								<dt className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
									Volume
								</dt>
								<dd className="text-sm text-foreground">
									{detail.streamSnapshot.volume ?? "N/A"}
								</dd>
							</div>
							<div>
								<dt className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
									Frequency
								</dt>
								<dd className="text-sm text-foreground">
									{detail.streamSnapshot.frequency ?? "N/A"}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold text-foreground">
							Offer insights
						</CardTitle>
						<CardDescription>
							Generated from workspace and discovery evidence only.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{detail.insights ? (
							<>
								<p className="text-sm text-foreground">
									{detail.insights.summary}
								</p>
								<Separator />
								<div className="grid gap-4 md:grid-cols-3">
									<div className="space-y-2">
										<p className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
											Key points
										</p>
										<ul className="space-y-1 text-sm text-muted-foreground">
											{detail.insights.keyPoints.map((point) => (
												<li key={point}>• {point}</li>
											))}
										</ul>
									</div>
									<div className="space-y-2">
										<p className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
											Risks
										</p>
										<ul className="space-y-1 text-sm text-muted-foreground">
											{detail.insights.risks.map((risk) => (
												<li key={risk}>• {risk}</li>
											))}
										</ul>
									</div>
									<div className="space-y-2">
										<p className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary">
											Recommendations
										</p>
										<ul className="space-y-1 text-sm text-muted-foreground">
											{detail.insights.recommendations.map((rec) => (
												<li key={rec}>• {rec}</li>
											))}
										</ul>
									</div>
								</div>
							</>
						) : (
							<p className="text-sm text-muted-foreground">
								No Offer insights yet. Generate them from the current discovery
								evidence.
							</p>
						)}
						{refreshError ? (
							<p className="text-sm text-destructive">{refreshError}</p>
						) : null}
					</CardContent>
				</Card>
			</div>

			<div className="flex flex-col gap-6">
				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
							<RefreshCcw aria-hidden className="size-5 text-primary" />
							Insight freshness
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>
							<span className="font-medium text-foreground">Generated:</span>{" "}
							{formatDate(detail.insights?.freshness.generatedAt)}
						</p>
						<p>
							<span className="font-medium text-foreground">
								Source updated:
							</span>{" "}
							{formatDate(detail.insights?.freshness.sourceUpdatedAt)}
						</p>
						<Button
							size="sm"
							onClick={onRefreshInsights}
							disabled={isRefreshing}
						>
							<RefreshCcw data-icon="inline-start" aria-hidden />
							{isRefreshing ? "Refreshing..." : "Refresh insights"}
						</Button>
					</CardContent>
				</Card>

				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="inline-flex items-center gap-2 font-display text-xl font-semibold text-foreground">
							<Shield aria-hidden className="size-5 text-primary" />
							Offer document
						</CardTitle>
						<CardDescription>
							Single-file upload. New upload replaces existing document.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						{detail.offerDocument ? (
							<div className="rounded-xl bg-surface-container-low p-3">
								<p className="font-medium text-foreground">
									{detail.offerDocument.filename}
								</p>
								<p>
									Uploaded {formatDate(detail.offerDocument.uploadedAt)}
									{detail.offerDocument.fileSize
										? ` • ${formatFileSize(detail.offerDocument.fileSize)}`
										: ""}
								</p>
							</div>
						) : (
							<p>No Offer document uploaded yet.</p>
						)}
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={isUploading}
								onClick={onUploadClick}
							>
								<FileUp data-icon="inline-start" aria-hidden />
								{isUploading
									? "Uploading..."
									: detail.offerDocument
										? "Replace document"
										: "Upload document"}
							</Button>
							{detail.offerDocument ? (
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={onDownload}
								>
									Download
								</Button>
							) : null}
						</div>
						{uploadError ? (
							<p className="text-sm text-destructive">{uploadError}</p>
						) : null}
					</CardContent>
				</Card>

				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader>
						<CardTitle className="font-display text-xl font-semibold text-foreground">
							Follow-up actions
						</CardTitle>
						<CardDescription>
							Current state:{" "}
							{detail.followUpState
								? OFFER_FOLLOW_UP_LABELS[detail.followUpState]
								: "Pending"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{nextTransitions.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								This Offer is in a terminal follow-up state.
							</p>
						) : (
							<div className="flex flex-wrap gap-2">
								{nextTransitions.map((nextState) => (
									<Button
										key={nextState}
										size="sm"
										variant="outline"
										onClick={() => onTransition(nextState)}
										disabled={isTransitioning}
									>
										Move to {OFFER_FOLLOW_UP_LABELS[nextState]}
									</Button>
								))}
							</div>
						)}
						{transitionError ? (
							<p className="text-sm text-destructive">{transitionError}</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
