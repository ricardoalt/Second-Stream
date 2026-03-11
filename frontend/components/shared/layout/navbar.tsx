"use client";

import {
	Building2,
	FolderOpen,
	Home,
	LogOut,
	Menu,
	Plus,
	Recycle,
	Search,
	Settings,
	Shield,
	User,
	Users,
	Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PremiumProjectWizard = dynamic(
	() =>
		import(
			"@/components/features/dashboard/components/premium-project-wizard"
		).then((mod) => mod.PremiumProjectWizard),
	{ ssr: false, loading: () => null },
);

import { FeedbackButton } from "@/components/features/feedback/feedback-button";
import {
	OrgContextBadge,
	OrgSelectionModal,
} from "@/components/features/org-context";
import { DSRLogo } from "@/components/shared/branding/dsr-logo";
import { ThemeToggle } from "@/components/shared/common/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/contexts";
import { routes } from "@/lib/routes";
import { useOrganizationStore } from "@/lib/stores/organization-store";
import {
	useEnsureProjectsLoaded,
	useProjectLoading,
	useProjects,
} from "@/lib/stores/project-store";
import { useProposalGenerationStore } from "@/lib/stores/proposal-generation-store";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./notification-dropdown";
import { ProposalProgressBadge } from "./proposal-progress-badge";

// Wrapper component to conditionally load projects without violating hooks rule
function EnsureProjectsLoaded(): null {
	useEnsureProjectsLoaded();
	return null;
}

// Navigation config - inline (DRY: only used here, no duplication)
const PRIMARY_NAV_LINKS = [
	{
		name: "Dashboard",
		href: "/dashboard",
		icon: Home,
		description: "View waste streams",
	},
	{
		name: "Companies",
		href: "/companies",
		icon: Building2,
		description: "Manage companies",
	},
];

type QuickAction = {
	name: string;
	description?: string;
	icon: typeof Home;
	href?: string;
	onSelect?: () => void;
};

export function NavBar() {
	const [searchOpen, setSearchOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const pathname = usePathname();
	const router = useRouter();
	const projects = useProjects();
	const loadingProjects = useProjectLoading();
	const { user, logout, isSuperAdmin, isOrgAdmin } = useAuth();
	const {
		currentOrganization,
		selectedOrgId,
		loadCurrentOrganization,
		loadOrganizations,
	} = useOrganizationStore();
	const [mounted, setMounted] = useState(false);
	const quickActions: QuickAction[] = [
		{
			name: "New Waste Stream",
			icon: Zap,
			description: "Start new waste stream",
			onSelect: () => setCreateModalOpen(true),
		},
		{
			name: "Search Waste Streams",
			icon: FolderOpen,
			description: "Find waste streams",
			href: routes.dashboard,
		},
		{
			name: "Settings",
			icon: Settings,
			description: "Configure app",
			href: "/settings",
		},
	];

	useEffect(() => {
		setMounted(true);
	}, []);

	const authedUser = mounted ? user : null;
	const handleQuickAction = (action: QuickAction) => {
		setSearchOpen(false);
		if (action.onSelect) {
			action.onSelect();
			return;
		}
		if (action.href) {
			router.push(action.href);
		}
	};

	useEffect(() => {
		if (!authedUser) return;
		if (authedUser.isSuperuser) {
			loadOrganizations();
			if (selectedOrgId) {
				loadCurrentOrganization();
			}
			return;
		}
		loadCurrentOrganization();
	}, [authedUser, loadCurrentOrganization, loadOrganizations, selectedOrgId]);

	// Proposal generation progress
	const { isGenerating, progress, currentStep, estimatedTime } =
		useProposalGenerationStore();

	// Get user initials for avatar
	const getUserInitials = () => {
		if (!authedUser) return "?";
		const first = authedUser.firstName?.[0] ?? "";
		const last = authedUser.lastName?.[0] ?? "";
		return (first + last).toUpperCase() || "?";
	};

	// Get full name for display
	const getFullName = () => {
		if (!authedUser) return "";
		return `${authedUser.firstName} ${authedUser.lastName}`.trim();
	};

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setSearchOpen((open) => !open);
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// Only auto-load projects when we have org context (or not a super admin)
	const shouldAutoLoadProjects =
		Boolean(authedUser) && (!isSuperAdmin || Boolean(selectedOrgId));

	return (
		<>
			{shouldAutoLoadProjects && <EnsureProjectsLoaded />}
			<nav className="glass-nav sticky top-0 z-50 w-full">
				<div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between gap-6 px-4 md:px-6">
					<div className="flex items-center gap-4 md:gap-6">
						<Link href="/dashboard" className="flex items-center -ml-2">
							<DSRLogo width={85} height={42} showText={false} />
						</Link>

						<div className="hidden items-center gap-2 rounded-full border border-border/40 bg-card/60 px-2 py-1 backdrop-blur-xl shadow-md md:flex">
							{PRIMARY_NAV_LINKS.map((link) => {
								const Icon = link.icon;
								const isActive = pathname?.startsWith(link.href);
								return (
									<Link
										key={link.name}
										href={link.href}
										suppressHydrationWarning
										className={cn(
											"inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:bg-primary/15 hover:text-primary",
											isActive && "aqua-floating-chip",
										)}
									>
										<Icon className="h-4 w-4" />
										<span>{link.name}</span>
									</Link>
								);
							})}
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Proposal generation progress badge */}
						<ProposalProgressBadge
							progress={progress}
							isVisible={isGenerating}
							currentStep={currentStep}
							estimatedTime={estimatedTime}
						/>

						{/* Organization context badge for super admins */}
						{authedUser && isSuperAdmin && (
							<div className="hidden items-center gap-2 md:flex">
								<OrgContextBadge />
							</div>
						)}

						{/* Organization name for regular users */}
						{authedUser && !isSuperAdmin && currentOrganization && (
							<div className="hidden items-center gap-2 md:flex">
								<span className="rounded-full border border-border/40 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
									{currentOrganization.name}
								</span>
							</div>
						)}

						<Button
							variant="ghost"
							size="sm"
							className="hidden h-9 rounded-full bg-card/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground lg:inline-flex"
							onClick={() => setSearchOpen(true)}
						>
							<Search className="mr-2 h-4 w-4" />
							Search
							<span className="ml-2 hidden rounded-full bg-card/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground lg:block">
								⌘K
							</span>
						</Button>

						<ThemeToggle />
						<NotificationDropdown />
						{authedUser &&
							(isSuperAdmin ? (
								<Button
									variant="ghost"
									size="sm"
									className="h-9 rounded-full border border-border/40 bg-card/60 text-foreground transition-colors duration-300 hover:bg-card/80"
									asChild
								>
									<Link href="/admin/feedback">Feedback</Link>
								</Button>
							) : (
								<FeedbackButton />
							))}
						<Button
							variant="ghost"
							size="icon"
							className="inline-flex h-9 w-9 rounded-full border border-border/40 bg-card/60 text-foreground transition-colors duration-300 hover:bg-card/80 md:hidden"
							onClick={() => setSearchOpen(true)}
						>
							<Search className="h-4 w-4" />
							<span className="sr-only">Open search</span>
						</Button>

						<button
							className={cn(
								buttonVariants({ size: "sm" }),
								"hidden rounded-full px-4 lg:inline-flex bg-gradient-to-r from-primary/85 via-primary to-primary text-primary-foreground shadow-water hover:shadow-water-lg transition-shadow duration-300",
							)}
							onClick={() => setCreateModalOpen(true)}
							type="button"
						>
							<Plus className="mr-2 h-4 w-4" />
							Discovery Wizard
						</button>

						{authedUser && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										aria-label="Open user menu"
										className={cn(
											buttonVariants({ variant: "ghost", size: "icon" }),
											"relative h-9 w-9 rounded-full p-0 bg-card/50 text-foreground transition-colors duration-300 hover:bg-card/70",
										)}
									>
										<Avatar className="h-9 w-9 border border-border/40 bg-card/60 backdrop-blur">
											<AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
												{getUserInitials()}
											</AvatarFallback>
										</Avatar>
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-56" align="end" forceMount>
									<DropdownMenuLabel className="font-normal">
										<div className="flex flex-col space-y-1">
											<p className="text-sm font-medium leading-none">
												{getFullName()}
											</p>
											<p className="text-xs leading-none text-muted-foreground">
												{authedUser.email}
											</p>
											{authedUser.companyName && (
												<p className="text-xs leading-none text-muted-foreground">
													{authedUser.companyName}
												</p>
											)}
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<Link href="/profile">
											<User className="mr-2 h-4 w-4" />
											<span>Profile</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link href="/settings">
											<Settings className="mr-2 h-4 w-4" />
											<span>Settings</span>
										</Link>
									</DropdownMenuItem>
									{isOrgAdmin && !isSuperAdmin && (
										<DropdownMenuItem asChild>
											<Link href="/settings/team">
												<Users className="mr-2 h-4 w-4" />
												<span>Team</span>
											</Link>
										</DropdownMenuItem>
									)}
									{isSuperAdmin && (
										<DropdownMenuItem asChild>
											<Link href="/admin">
												<Shield className="mr-2 h-4 w-4" />
												<span>Admin Console</span>
											</Link>
										</DropdownMenuItem>
									)}
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={logout}
										className="text-destructive focus:text-destructive"
									>
										<LogOut className="mr-2 h-4 w-4" />
										<span>Sign Out</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}

						<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
							<SheetTrigger asChild>
								<button
									type="button"
									aria-label="Open menu"
									className={cn(
										buttonVariants({ variant: "ghost", size: "icon" }),
										"ml-1 px-0 text-base bg-card/60 text-foreground transition-colors duration-300 hover:bg-card/80 focus:bg-card/70 md:hidden",
									)}
								>
									<Menu className="h-6 w-6" />
									<span className="sr-only">Open menu</span>
								</button>
							</SheetTrigger>
							<SheetContent side="left" className="glass-card pr-0">
								<SheetHeader>
									<SheetTitle className="flex items-center">
										<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground shadow-md">
											<Recycle className="h-4 w-4" />
										</div>
										<span className="ml-2 text-lg font-bold">DSR Inc.</span>
									</SheetTitle>
									<SheetDescription>Waste Resource Management</SheetDescription>
								</SheetHeader>
								<div className="my-6 flex flex-col space-y-4 pl-1">
									{PRIMARY_NAV_LINKS.map((link) => {
										const Icon = link.icon;
										const isActive = pathname?.startsWith(link.href);
										return (
											<Link
												key={link.name}
												href={link.href}
												className={cn(
													"flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-card/70 hover:text-foreground",
													isActive && "aqua-floating-chip",
												)}
												onClick={() => setMobileMenuOpen(false)}
											>
												<Icon className="h-4 w-4" />
												<span>{link.name}</span>
											</Link>
										);
									})}
								</div>
								<div className="border-t border-border/40 bg-card/50 p-4 backdrop-blur">
									<Button
										className="w-full rounded-full bg-gradient-to-r from-primary/85 via-primary to-primary text-primary-foreground shadow-water hover:shadow-water-lg"
										onClick={() => {
											setCreateModalOpen(true);
											setMobileMenuOpen(false);
										}}
									>
										<Plus className="mr-2 h-4 w-4" /> New Waste Stream
									</Button>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</nav>

			{/* Command Dialog for Search */}
			<CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
				<CommandInput placeholder="Search waste streams, companies, locations..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>

					<CommandGroup heading="Quick Actions">
						{quickActions.map((action) => {
							const Icon = action.icon;
							return (
								<CommandItem
									key={action.name}
									value={action.name}
									onSelect={() => handleQuickAction(action)}
								>
									<Icon className="mr-2 h-4 w-4" />
									<div className="flex flex-col">
										<span className="text-sm font-medium">{action.name}</span>
										{action.description && (
											<span className="text-xs text-muted-foreground">
												{action.description}
											</span>
										)}
									</div>
								</CommandItem>
							);
						})}
					</CommandGroup>

					<CommandGroup heading="Recent Waste Streams">
						{loadingProjects ? (
							<div className="space-y-2 p-2">
								{Array.from({ length: 3 }).map((_, index) => {
									const key = `loading-${index}`;
									return (
										<div key={key} className="flex items-center gap-3">
											<Skeleton className="h-8 w-8 rounded-full" />
											<div className="flex-1 space-y-1">
												<Skeleton className="h-3 w-32" />
												<Skeleton className="h-3 w-24" />
											</div>
										</div>
									);
								})}
							</div>
						) : projects.length === 0 ? (
							<CommandItem disabled>
								<span className="text-sm text-muted-foreground">
									No recent projects.
								</span>
							</CommandItem>
						) : (
							projects.slice(0, 6).map((project) => (
								<CommandItem
									key={project.id}
									value={project.name}
									onSelect={() => {
										setSearchOpen(false);
										router.push(routes.project.detail(project.id));
									}}
								>
									<FolderOpen className="mr-2 h-4 w-4" />
									<div className="flex flex-col">
										<span className="text-sm font-medium">{project.name}</span>
										<span className="text-xs text-muted-foreground">
											{project.client}
										</span>
									</div>
									{project.status && (
										<Badge
											variant="outline"
											className="ml-auto text-[11px] capitalize"
										>
											{project.status}
										</Badge>
									)}
								</CommandItem>
							))
						)}
					</CommandGroup>

					<CommandGroup heading="Areas">
						{PRIMARY_NAV_LINKS.map((link) => {
							const Icon = link.icon;
							return (
								<CommandItem
									key={link.name}
									value={link.name}
									onSelect={() => {
										setSearchOpen(false);
										router.push(link.href);
									}}
								>
									<Icon className="mr-2 h-4 w-4" />
									<div className="flex flex-col">
										<span>{link.name}</span>
										{link.description && (
											<span className="text-xs text-muted-foreground">
												{link.description}
											</span>
										)}
									</div>
								</CommandItem>
							);
						})}
					</CommandGroup>
				</CommandList>
			</CommandDialog>

			{/* Premium Project Wizard */}
			<PremiumProjectWizard
				open={createModalOpen}
				onOpenChange={setCreateModalOpen}
				onProjectCreated={() => {
					// Project creation handled by wizard
				}}
			/>

			{/* Organization Selection Modal for super admins */}
			{isSuperAdmin && <OrgSelectionModal />}
		</>
	);
}
