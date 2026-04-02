"use client";

import { AlertTriangle, Building2, ChevronDown, Filter, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { organizationsAPI } from "@/lib/api/organizations";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import { cn } from "@/lib/utils";
import { OrgSelectorContent } from "../org-context/org-selector-content";
import { OrgAvatar } from "./org-avatar";

interface OrgSwitcherProps {
	onCreateNew?: () => void;
}

type LoadState = "loading" | "loaded" | "retrying" | "error";

const SWITCHER_WIDTH_CLASS = "w-[240px]";
const WARNING_WIDTH_CLASS = "w-[280px]";
const POPOVER_WIDTH_CLASS = "w-[300px]";
const ORG_ID_PREFIX_LENGTH = 8;
const CONTEXT_BADGE_MAX_WIDTH_CLASS = "max-w-[180px]";

function formatOrgId(orgId: string): string {
	if (orgId.length <= ORG_ID_PREFIX_LENGTH) {
		return orgId;
	}
	return `${orgId.slice(0, ORG_ID_PREFIX_LENGTH)}…`;
}

export function OrgSwitcher({ onCreateNew }: OrgSwitcherProps) {
	const [open, setOpen] = useState(false);
	const [loadState, setLoadState] = useState<LoadState>("loading");
	const {
		organizations,
		loadOrganizations,
		selectedOrgId,
		selectOrganization,
		clearSelection,
		upsertOrganization,
	} = useOrganizationStore();

	const selectedOrg = organizations.find((org) => org.id === selectedOrgId);
	const hasContext = Boolean(selectedOrgId);
	const hasUnresolvedContext =
		hasContext &&
		!selectedOrg &&
		loadState !== "loading" &&
		loadState !== "retrying";
	const contextBadgeLabel = selectedOrg
		? `Context active: ${selectedOrg.name}`
		: "Context active";

	const fetchOrganizations = useCallback(async () => {
		setLoadState("loading");
		await loadOrganizations();

		// Read selectedOrgId from store state to avoid circular dependency
		const { organizations: orgs, selectedOrgId: storedOrgId } =
			useOrganizationStore.getState();
		const foundOrg = orgs.find((org) => org.id === storedOrgId);

		if (storedOrgId && !foundOrg) {
			setLoadState("retrying");
			try {
				const org = await organizationsAPI.get(storedOrgId);
				upsertOrganization(org);
				setLoadState("loaded");
			} catch {
				setLoadState("error");
			}
		} else {
			setLoadState("loaded");
		}
	}, [loadOrganizations, upsertOrganization]);

	useEffect(() => {
		fetchOrganizations();
	}, [fetchOrganizations]);

	const handleSelect = (orgId: string | null) => {
		if (orgId) {
			selectOrganization(orgId);
		} else {
			clearSelection();
		}
		setOpen(false);
	};

	if (loadState === "loading" || loadState === "retrying") {
		return (
			<div
				role="status"
				aria-live="polite"
				aria-busy="true"
				className="flex items-center gap-2"
			>
				<Skeleton className={`h-10 ${SWITCHER_WIDTH_CLASS} rounded-lg`} />
				<span className="text-xs text-muted-foreground animate-pulse">
					{loadState === "retrying" ? "Verifying context…" : "Loading…"}
				</span>
			</div>
		);
	}

	if (hasUnresolvedContext) {
		const shortOrgId = selectedOrgId ? formatOrgId(selectedOrgId) : "unknown";
		return (
			<TooltipProvider>
				<div className="flex items-center gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								className={`${WARNING_WIDTH_CLASS} justify-start gap-2 border-warning/50 bg-warning/10 hover:bg-warning/20 text-warning`}
							>
								<AlertTriangle className="h-4 w-4 shrink-0" />
								<span className="text-sm">
									Context active (org unavailable)
								</span>
								<code className="ml-auto text-xs font-mono opacity-70">
									{shortOrgId}
								</code>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="max-w-[320px]">
							<p className="text-xs">
								An organization context is active but the organization could not
								be loaded. Clear the context to view all organizations safely.
							</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={clearSelection}
								className="h-8 w-8 text-warning hover:text-warning/80 hover:bg-warning/20"
								aria-label="Clear organization context"
							>
								<X className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p className="text-xs">Clear organization context</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>
		);
	}

	return (
		<TooltipProvider>
			<div className="flex items-center gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={open}
									className={cn(
										`${SWITCHER_WIDTH_CLASS} justify-between transition-[box-shadow,border-color,background-color] duration-200`,
										"backdrop-blur-sm",
										open && "shadow-md ring-1 ring-primary/20",
										hasContext
											? "border-[var(--context-scoped-border)] bg-[var(--context-scoped-bg)] hover:bg-[var(--context-scoped-bg)]/80"
											: "border-dashed border-[var(--context-global-border)] bg-[var(--context-global-bg)] hover:bg-muted/50",
									)}
								>
									{selectedOrg ? (
										<div className="flex items-center gap-2.5 truncate">
											<Filter className="h-3.5 w-3.5 text-[var(--context-scoped-text)] shrink-0" />
											<span className="text-xs text-[var(--context-scoped-text)] shrink-0">
												Context:
											</span>
											<OrgAvatar
												name={selectedOrg.name}
												slug={selectedOrg.slug}
												size="sm"
											/>
											<span className="truncate font-medium text-foreground">
												{selectedOrg.name}
											</span>
										</div>
									) : (
										<div className="flex items-center gap-2.5">
											<Building2 className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">
												All organizations
											</span>
										</div>
									)}
									<ChevronDown
										className={cn(
											"ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
											open && "rotate-180",
										)}
									/>
								</Button>
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="max-w-[280px]">
							<p className="text-xs">
								{hasContext
									? "All API requests are scoped to this organization"
									: "Showing data from all organizations"}
							</p>
						</TooltipContent>
					</Tooltip>
					<PopoverContent className={`${POPOVER_WIDTH_CLASS} p-0`} align="end">
						<OrgSelectorContent
							organizations={organizations}
							selectedOrgId={selectedOrgId}
							onSelect={handleSelect}
							showAllOrgsOption
							{...(onCreateNew && {
								onCreateNew: () => {
									setOpen(false);
									onCreateNew();
								},
							})}
						/>
					</PopoverContent>
				</Popover>

				{/* Persistent scoped badge - always visible when org is selected */}
				{hasContext && selectedOrg && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setOpen(true)}
								className="h-auto px-0 hover:bg-transparent"
								aria-label="Open organization context switcher"
							>
								<Badge
									variant="outline"
									className="border-[var(--context-scoped-border)] bg-[var(--context-scoped-bg)] text-[var(--context-scoped-text)] gap-1.5 px-2 py-1"
								>
									<span className="h-1.5 w-1.5 rounded-full bg-[var(--context-scoped-text)] animate-pulse" />
									<span
										className={cn("truncate", CONTEXT_BADGE_MAX_WIDTH_CLASS)}
									>
										{contextBadgeLabel}
									</span>
								</Badge>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p className="text-xs">
								All API requests are scoped to this organization.
							</p>
						</TooltipContent>
					</Tooltip>
				)}

				{/* Clear button - only show when org is selected */}
				{hasContext && selectedOrg && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={clearSelection}
								className="h-8 w-8 text-muted-foreground hover:text-foreground"
								aria-label="Clear organization context"
							>
								<X className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p className="text-xs">Clear organization context</p>
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	);
}
