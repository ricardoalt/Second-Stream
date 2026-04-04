import {
	Calendar,
	CheckCircle2,
	ChevronDown,
	FileSignature,
	Inbox,
	Mail,
	Send,
	XCircle,
} from "lucide-react";
import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	Skeleton,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type {
	OfferFollowUpState,
	OfferStageFeaturedItem,
} from "./field-agent-dashboard.types";

const PRE_OFFER_SKELETON_KEYS = [
	"pre-offer-skeleton-a",
	"pre-offer-skeleton-b",
	"pre-offer-skeleton-c",
] as const;

const CLOSING_SKELETON_KEYS = [
	"closing-skeleton-a",
	"closing-skeleton-b",
] as const;

const PRE_OFFER_GROUPS: Array<{
	label: string;
	states: OfferFollowUpState[];
	tone: "info" | "warning" | "success" | "error";
	featuredState?: OfferFollowUpState;
	icon?: React.ReactNode;
}> = [
	{
		label: "Not Sent",
		states: ["uploaded", "waiting_to_send"],
		tone: "warning",
		icon: <Inbox className="size-5 text-warning-foreground" />,
	},
	{
		label: "Sent",
		states: ["waiting_response"],
		tone: "success",
		featuredState: "waiting_response",
		icon: <Send className="size-5 text-primary" />,
	},
];

const CLOSING_GROUPS: Array<{
	label: string;
	states: OfferFollowUpState[];
	tone: "success" | "error" | "warning" | "info";
	featuredState?: OfferFollowUpState;
	icon?: React.ReactNode;
}> = [
	{
		label: "In Negotiation",
		states: ["under_negotiation"],
		tone: "error",
		icon: <FileSignature className="size-5 text-destructive" />,
	},
	{
		label: "Accepted",
		states: ["accepted"],
		tone: "success",
		featuredState: "accepted",
		icon: <CheckCircle2 className="size-5 text-primary" />,
	},
	{
		label: "Rejected",
		states: ["declined", "rejected"],
		tone: "info",
		icon: <XCircle className="size-5 text-muted-foreground" />,
	},
];

function countForStates(
	counts: Record<OfferFollowUpState, number>,
	states: OfferFollowUpState[],
) {
	return states.reduce((sum, state) => sum + (counts[state] ?? 0), 0);
}

export function FieldAgentOfferPipelineSection({
	counts,
	featuredItems,
	loading = false,
	error,
}: {
	counts: Record<OfferFollowUpState, number>;
	featuredItems?: Partial<Record<OfferFollowUpState, OfferStageFeaturedItem[]>>;
	loading?: boolean;
	error?: string | null;
}) {
	return (
		<section className="space-y-3">
			{error ? (
				<Alert
					variant="warning"
					className="border-border/40 bg-surface-container-low"
				>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<div className="grid gap-6 xl:grid-cols-2 items-start">
				<div className="space-y-4">
					<div className="flex items-center gap-3 mb-6">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="text-primary"
							aria-label="Pre-Offer Pipeline"
						>
							<title>Pre-Offer Pipeline</title>
							<path
								d="M10 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V15M10 3V7C10 8.10457 10.8954 9 12 9H16M10 3L16 9M16 9V11M21 9H19C17.8954 9 17 9.89543 17 11V15C17 16.1046 17.8954 17 19 17H21V9Z"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<h3 className="text-xl font-semibold text-foreground">
							Pre-Offer Pipeline
						</h3>
					</div>

					<div className="space-y-4">
						{loading
							? PRE_OFFER_SKELETON_KEYS.map((key) => (
									<Skeleton
										key={key}
										className="h-[100px] w-full rounded-3xl"
									/>
								))
							: PRE_OFFER_GROUPS.map((group) => (
									<Card
										key={group.label}
										className={cn(
											"border-border/40 shadow-sm rounded-3xl overflow-hidden",
											group.tone === "warning"
												? "bg-warning/5"
												: "bg-primary/5",
										)}
									>
										<CardContent className="p-6">
											<div className="flex justify-between items-center w-full">
												<div className="flex items-center gap-4">
													<div
														className={cn(
															"size-10 rounded-full flex items-center justify-center shrink-0 bg-card shadow-sm",
														)}
													>
														{group.icon}
													</div>
													<div>
														<p className="text-base font-medium text-foreground">
															{group.label}
														</p>
													</div>
												</div>
												<div className="flex items-center gap-4">
													<div className="text-right">
														<p className="text-2xl font-bold text-foreground">
															{countForStates(counts, group.states)}
														</p>
													</div>
													<ChevronDown className="size-4 text-muted-foreground" />
												</div>
											</div>

											{/* Feature items inline for the Sent group */}
											{group.label === "Sent" &&
												group.featuredState &&
												featuredItems?.[group.featuredState] && (
													<div className="mt-6 space-y-2">
														{featuredItems[group.featuredState]?.map((item) => (
															<div
																key={item.id}
																className="flex items-center justify-between bg-surface-container-lowest rounded-[1rem] p-4 shadow-sm border border-border/20"
															>
																<div className="flex items-center gap-3">
																	<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
																		{group.icon}
																	</div>
																	<div>
																		<p className="text-sm font-medium text-foreground">
																			{item.primaryText}
																		</p>
																	</div>
																</div>
																<div className="flex items-center gap-4">
																	<div className="text-right">
																		<p className="text-xs text-muted-foreground mt-0.5">
																			{item.secondaryText}
																		</p>
																	</div>
																	<Button
																		size="icon"
																		variant="ghost"
																		className="size-8 rounded-lg bg-surface-container-low hover:bg-surface-container"
																	>
																		<Mail className="size-4 text-foreground" />
																	</Button>
																</div>
															</div>
														))}
													</div>
												)}
										</CardContent>
									</Card>
								))}
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center gap-3 mb-6">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="text-primary"
							aria-label="Closing &amp; Results"
						>
							<title>Closing &amp; Results</title>
							<path
								d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M8 12L11 15L16 9"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<h3 className="text-xl font-semibold text-foreground">
							Closing &amp; Results
						</h3>
					</div>

					<div className="space-y-4">
						{loading
							? CLOSING_SKELETON_KEYS.map((key) => (
									<Skeleton
										key={key}
										className="h-[100px] w-full rounded-3xl"
									/>
								))
							: CLOSING_GROUPS.map((group) => (
									<Card
										key={group.label}
										className={cn(
											"border-border/40 shadow-sm rounded-3xl overflow-hidden",
											group.tone === "error"
												? "bg-destructive/5"
												: group.tone === "success"
													? "bg-primary/5"
													: "bg-surface-container-low/50",
										)}
									>
										<CardContent className="p-6">
											<div className="flex justify-between items-center w-full">
												<div className="flex items-center gap-4">
													<div
														className={cn(
															"size-10 rounded-full flex items-center justify-center shrink-0 bg-card shadow-sm",
														)}
													>
														{group.icon}
													</div>
													<div>
														<p className="text-base font-medium text-foreground">
															{group.label}
														</p>
													</div>
												</div>
												<div className="flex items-center gap-4">
													<div className="text-right">
														<p className="text-2xl font-bold text-foreground">
															{countForStates(counts, group.states)}
														</p>
													</div>
													<ChevronDown className="size-4 text-muted-foreground" />
												</div>
											</div>

											{/* Feature items inline for the Accepted group */}
											{group.label === "Accepted" &&
												group.featuredState &&
												featuredItems?.[group.featuredState] && (
													<div className="mt-6 space-y-2">
														{featuredItems[group.featuredState]?.map((item) => (
															<div
																key={item.id}
																className="flex items-center justify-between bg-surface-container-lowest rounded-[1rem] p-4 shadow-sm border border-border/20"
															>
																<div className="flex items-center gap-3">
																	<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
																		{group.icon}
																	</div>
																	<div>
																		<p className="text-sm font-medium text-foreground">
																			{item.primaryText}
																		</p>
																	</div>
																</div>
																<div className="flex items-center gap-4">
																	<div className="text-right">
																		<p className="text-xs text-muted-foreground mt-0.5">
																			{item.secondaryText}
																		</p>
																	</div>
																	<Button
																		size="icon"
																		variant="ghost"
																		className="size-8 rounded-lg bg-surface-container-low hover:bg-surface-container"
																	>
																		<Calendar className="size-4 text-foreground" />
																	</Button>
																</div>
															</div>
														))}
													</div>
												)}
										</CardContent>
									</Card>
								))}
					</div>
				</div>
			</div>
		</section>
	);
}
