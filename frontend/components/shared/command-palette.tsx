"use client";

import {
	Building2,
	FileText,
	FolderKanban,
	Home,
	Moon,
	Plus,
	Search,
	Settings,
	Sun,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import {
	useCommandPalette,
	useRecentProjects,
} from "@/lib/hooks/use-command-palette";
import { routes } from "@/lib/routes";
import { useProjects } from "@/lib/stores/project-store";

export function CommandPalette() {
	const router = useRouter();
	const { open, setOpen, closePalette } = useCommandPalette();
	const { recentProjects, addRecentProject } = useRecentProjects();
	const { setTheme, theme } = useTheme();
	const projects = useProjects();
	const [search, setSearch] = useState("");

	// Filter projects based on search
	const filteredProjects = useMemo(() => {
		if (!search.trim()) return [];
		const query = search.toLowerCase();
		return projects
			.filter(
				(p) =>
					p.name.toLowerCase().includes(query) ||
					p.client.toLowerCase().includes(query),
			)
			.slice(0, 5);
	}, [projects, search]);

	const runCommand = useCallback(
		(command: () => void) => {
			closePalette();
			command();
		},
		[closePalette],
	);

	const navigateToProject = useCallback(
		(project: { id: string; name: string }) => {
			addRecentProject(project);
			runCommand(() => router.push(routes.streams.detail(project.id)));
		},
		[addRecentProject, runCommand, router],
	);

	const toggleTheme = useCallback(() => {
		setTheme(theme === "dark" ? "light" : "dark");
	}, [setTheme, theme]);

	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<CommandInput
				placeholder="Type a command or search..."
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>

				{/* Search Results */}
				{filteredProjects.length > 0 && (
					<CommandGroup heading="Projects">
						{filteredProjects.map((project) => (
							<CommandItem
								key={project.id}
								value={`project-${project.id}`}
								onSelect={() => navigateToProject(project)}
							>
								<FileText className="mr-2 h-4 w-4" />
								<span>{project.name}</span>
								<span className="ml-2 text-xs text-muted-foreground">
									{project.client}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{/* Recent Projects */}
				{!search && recentProjects.length > 0 && (
					<CommandGroup heading="Recent Projects">
						{recentProjects.map((project) => (
							<CommandItem
								key={project.id}
								value={`recent-${project.id}`}
								onSelect={() => navigateToProject(project)}
							>
								<FolderKanban className="mr-2 h-4 w-4" />
								<span>{project.name}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				<CommandSeparator />

				{/* Navigation */}
				<CommandGroup heading="Navigation">
					<CommandItem
						value="dashboard"
						onSelect={() => runCommand(() => router.push(routes.dashboard))}
					>
						<Home className="mr-2 h-4 w-4" />
						<span>Go to Dashboard</span>
						<CommandShortcut>G D</CommandShortcut>
					</CommandItem>
					<CommandItem
						value="companies"
						onSelect={() => runCommand(() => router.push("/companies"))}
					>
						<Building2 className="mr-2 h-4 w-4" />
						<span>Go to Companies</span>
						<CommandShortcut>G C</CommandShortcut>
					</CommandItem>
					<CommandItem
						value="settings"
						onSelect={() => runCommand(() => router.push("/settings"))}
					>
						<Settings className="mr-2 h-4 w-4" />
						<span>Go to Settings</span>
						<CommandShortcut>G S</CommandShortcut>
					</CommandItem>
					<CommandItem
						value="profile"
						onSelect={() => runCommand(() => router.push("/profile"))}
					>
						<User className="mr-2 h-4 w-4" />
						<span>Go to Profile</span>
						<CommandShortcut>G P</CommandShortcut>
					</CommandItem>
				</CommandGroup>

				<CommandSeparator />

				{/* Actions */}
				<CommandGroup heading="Actions">
					<CommandItem
						value="new-assessment"
						onSelect={() => {
							closePalette();
							// Dispatch custom event to open wizard
							window.dispatchEvent(new CustomEvent("open-project-wizard"));
						}}
					>
						<Plus className="mr-2 h-4 w-4" />
						<span>New Waste Stream</span>
						<CommandShortcut>N</CommandShortcut>
					</CommandItem>
					<CommandItem
						value="search"
						onSelect={() => {
							closePalette();
							// Focus dashboard search
							const searchInput = document.querySelector(
								'input[placeholder*="Search"]',
							) as HTMLInputElement;
							searchInput?.focus();
						}}
					>
						<Search className="mr-2 h-4 w-4" />
						<span>Search Waste Streams</span>
						<CommandShortcut>/</CommandShortcut>
					</CommandItem>
				</CommandGroup>

				<CommandSeparator />

				{/* Theme */}
				<CommandGroup heading="Theme">
					<CommandItem
						value="toggle-theme"
						onSelect={() => runCommand(toggleTheme)}
					>
						{theme === "dark" ? (
							<Sun className="mr-2 h-4 w-4" />
						) : (
							<Moon className="mr-2 h-4 w-4" />
						)}
						<span>Toggle Theme</span>
						<CommandShortcut>T</CommandShortcut>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
