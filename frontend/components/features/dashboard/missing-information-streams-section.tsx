import { ChevronDown, AlertTriangle } from "lucide-react";
import { useState } from "react";
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	Skeleton,
} from "@/components/ui";
import type { MissingInformationStream } from "./field-agent-dashboard.types";
import { MissingInformationStreamRow } from "./missing-information-stream-row";

const MISSING_INFO_SKELETON_KEYS = [
	"missing-info-skeleton-a",
	"missing-info-skeleton-b",
	"missing-info-skeleton-c",
] as const;

const INITIAL_VISIBLE_STREAMS = 3;

export function MissingInformationStreamsSection({
	streams,
	loading = false,
	error,
}: {
	streams: MissingInformationStream[];
	loading?: boolean;
	error?: string | null;
}) {
	const [expanded, setExpanded] = useState<Record<string, boolean>>({
		[streams[0]?.id ?? ""]: true,
	});
	const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_STREAMS);

	const visibleStreams = streams.slice(0, visibleCount);
	const remaining = Math.max(0, streams.length - visibleCount);

	return (
		<section className="space-y-4">
			<Card className="border-border/40 bg-surface-container-low shadow-sm rounded-[2rem] pt-6 pb-8 px-6">
				<div className="flex items-center justify-between mb-8 px-2 flex-wrap gap-4">
					<div className="flex items-center gap-4">
						<div className="flex items-center justify-center">
							<AlertTriangle className="size-6 text-foreground" />
						</div>
						<h2 className="text-2xl font-semibold tracking-tight text-foreground">
							Missing Information Streams <span className="text-muted-foreground text-xl font-normal ml-1">({streams.length})</span>
						</h2>
					</div>
					
					{streams.length > 0 ? (
						<div className="flex items-center gap-8">
							<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								PENDING STREAMS
							</div>
						</div>
					) : null}
				</div>

				<CardContent className="p-0">
					{error ? (
						<Alert variant="warning" className="mb-4 border-border/40 bg-surface-container-low">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}

					{loading
						? MISSING_INFO_SKELETON_KEYS.map((key) => (
								<Skeleton key={key} className="h-20 w-full mb-2 rounded-[1.25rem]" />
							))
						: null}

					{!loading && streams.length === 0 ? (
						<p className="rounded-[1.25rem] border border-border/40 bg-surface-container-lowest p-8 text-center text-sm text-muted-foreground">
							No streams currently require missing information follow-up.
						</p>
					) : null}

					<div className="space-y-3">
						{!loading
							? visibleStreams.map((stream) => (
									<MissingInformationStreamRow
										key={stream.id}
										stream={stream}
										expanded={Boolean(expanded[stream.id])}
										onToggle={() =>
											setExpanded((current) => ({
												...current,
												[stream.id]: !current[stream.id],
											}))
										}
									/>
								))
							: null}
					</div>

					{!loading && remaining > 0 ? (
						<div className="mt-6 flex justify-center">
							<Button
								type="button"
								variant="default"
								className="rounded-xl px-6 py-6 font-semibold"
								onClick={() =>
									setVisibleCount((current) => current + INITIAL_VISIBLE_STREAMS)
								}
							>
								LOAD {Math.min(INITIAL_VISIBLE_STREAMS, remaining)} MORE STREAMS
							</Button>
						</div>
					) : null}
				</CardContent>
			</Card>
		</section>
	);
}
